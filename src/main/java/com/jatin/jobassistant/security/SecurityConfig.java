package com.jatin.jobassistant.security;

import java.nio.charset.StandardCharsets;

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
			// No cookies or sessions are used (the token travels in a header), so CSRF protection is not needed
			.csrf(csrf -> csrf.disable())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(requests -> requests
				.requestMatchers("/api/health", "/api/auth/**").permitAll()
				// Lets Spring show its own error page (e.g. 404 for an unknown URL) after the real request was checked
				.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
				.anyRequest().authenticated())
			// Reads "Authorization: Bearer <token>", checks signature and expiry, and rejects bad tokens
			.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()).authenticationEntryPoint(unauthorized))
			.exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized))
			.build();
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
					: "Please log in and send your token in the Authorization header: Bearer <token>";
			HttpStatus status = HttpStatus.UNAUTHORIZED;
			response.setStatus(status.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			jsonMapper.writeValue(response.getOutputStream(),
					new ErrorResponse(status.value(), status.getReasonPhrase(), message));
		};
	}

}
