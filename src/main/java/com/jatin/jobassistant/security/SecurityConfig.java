package com.jatin.jobassistant.security;

import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpHeaders;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;


import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

import com.jatin.jobassistant.dto.ErrorResponse;

import jakarta.servlet.DispatcherType;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SecurityConfig {

	private static final int MIN_SECRET_LENGTH = 32;

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, JsonMapper jsonMapper) throws Exception {
		AuthenticationEntryPoint unauthorized = unauthorizedEntryPoint(jsonMapper);
		return http
			// CSRF protection for requests that are authenticated by the login cookie (see needsCsrfCheck).
			// spa(): the CSRF token is put into a cookie the page can read (XSRF-TOKEN), and the page sends it back
			// in the header X-XSRF-TOKEN. Another website cannot read that cookie, so it cannot send the header.
			.csrf(csrf -> csrf.spa().requireCsrfProtectionMatcher(SecurityConfig::needsCsrfCheck))
			.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
			.addFilterAfter(new CookieToBearerFilter(), CsrfCookieFilter.class)
			// No server-side session: the token (in the cookie or in the header) is the only proof of login
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(requests -> requests
				.requestMatchers("/api/health", "/api/auth/**").permitAll()
				// Lets Spring show its own error page (e.g. 404 for an unknown URL) after the real request was checked
				.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
				.anyRequest().authenticated())
			// Reads the token from the Authorization header (see CookieToBearerFilter for the cookie), checks
			// signature and expiry, and rejects bad tokens
			.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()).authenticationEntryPoint(unauthorized))
			.exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized)
				.accessDeniedHandler(forbiddenHandler(jsonMapper)))
			.build();
	}

	// Where the login token is looked for:
	// 1. the header "Authorization: Bearer <token>" (API clients such as Postman)
	// 2. the httpOnly login cookie (the browser)
	//
	// Spring Security reads the header. For the browser, this filter copies the token from the cookie into that
	// header. It runs AFTER the CSRF check on purpose: Spring skips the CSRF check for requests that carry a bearer
	// token, which is right for API clients but would be wrong for the cookie. At the time of the CSRF check a
	// cookie request has no header yet, so it is checked.
	// The public endpoints never get a token, so an old cookie cannot get in the way of a new login.
	static final class CookieToBearerFilter extends OncePerRequestFilter {

		@Override
		protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
				throws ServletException, IOException {
			String path = request.getRequestURI();
			String token = cookieValue(request, AuthCookies.NAME);
			boolean publicPath = path.startsWith("/api/auth/") || path.equals("/api/health");
			if (publicPath || token == null || request.getHeader(HttpHeaders.AUTHORIZATION) != null) {
				chain.doFilter(request, response);
				return;
			}
			chain.doFilter(new HttpServletRequestWrapper(request) {
				@Override
				public String getHeader(String name) {
					return HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name) ? "Bearer " + token : super.getHeader(name);
				}

				@Override
				public Enumeration<String> getHeaders(String name) {
					return HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)
							? Collections.enumeration(List.of("Bearer " + token)) : super.getHeaders(name);
				}
			}, response);
		}

	}

	// A CSRF attack makes the browser of a logged-in user send a request the user did not intend. That only works
	// when the browser attaches the login by itself, which is the cookie. So the check is needed for a request that
	// changes something AND carries the login cookie AND has no Authorization header. A request with the header
	// was built on purpose by a program, and a request without any login is refused anyway.
	static boolean needsCsrfCheck(HttpServletRequest request) {
		boolean changesSomething = !SAFE_METHODS.contains(request.getMethod());
		return changesSomething && request.getHeader(HttpHeaders.AUTHORIZATION) == null
				&& cookieValue(request, AuthCookies.NAME) != null;
	}

	private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

	private static String cookieValue(HttpServletRequest request, String name) {
		if (request.getCookies() == null) {
			return null;
		}
		for (Cookie cookie : request.getCookies()) {
			if (cookie.getName().equals(name) && !cookie.getValue().isEmpty()) {
				return cookie.getValue();
			}
		}
		return null;
	}

	// Spring creates the CSRF token only when something asks for it. This filter asks on every request, so the
	// XSRF-TOKEN cookie is there before the page sends its first changing request.
	static final class CsrfCookieFilter extends OncePerRequestFilter {

		@Override
		protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
				throws ServletException, IOException {
			CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
			if (token != null) {
				token.getToken();
			}
			chain.doFilter(request, response);
		}

	}

	// Writes the 403 answer (a missing or wrong CSRF token) in the same JSON shape as GlobalExceptionHandler
	private AccessDeniedHandler forbiddenHandler(JsonMapper jsonMapper) {
		return (request, response, ex) -> {
			HttpStatus status = HttpStatus.FORBIDDEN;
			String message = ex instanceof CsrfException
					? "This request was refused because its CSRF token is missing or wrong. Reload the page and try again"
					: "You are not allowed to do this";
			response.setStatus(status.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			jsonMapper.writeValue(response.getOutputStream(),
					new ErrorResponse(status.value(), status.getReasonPhrase(), message));
		};
	}

	// BCrypt is slow on purpose and adds a random salt to every password
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	// The secret comes from .env (JWT_SECRET); it is never written in the code
	@Bean
	public SecretKey jwtSecretKey(@Value("${jwt.secret}") String secret) {
		if (secret.length() < MIN_SECRET_LENGTH) {
			throw new IllegalStateException(
					"JWT_SECRET must be at least " + MIN_SECRET_LENGTH + " characters long. Set it in the .env file");
		}
		return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}

	@Bean
	public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
		return NimbusJwtEncoder.withSecretKey(jwtSecretKey).build();
	}

	@Bean
	public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
		return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
	}

	// Writes the 401 answer in the same JSON shape as GlobalExceptionHandler
	private AuthenticationEntryPoint unauthorizedEntryPoint(JsonMapper jsonMapper) {
		return (request, response, ex) -> {
			String message = ex instanceof InvalidBearerTokenException
					? "Your token is invalid or has expired. Please log in again"
					: "Please log in first. API clients send their token in the Authorization header: Bearer <token>";
			HttpStatus status = HttpStatus.UNAUTHORIZED;
			response.setStatus(status.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			jsonMapper.writeValue(response.getOutputStream(),
					new ErrorResponse(status.value(), status.getReasonPhrase(), message));
		};
	}

}
