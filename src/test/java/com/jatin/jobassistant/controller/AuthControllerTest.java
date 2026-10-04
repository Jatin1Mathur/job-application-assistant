package com.jatin.jobassistant.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import com.jatin.jobassistant.service.AuthService.Session;
import com.jatin.jobassistant.security.RateLimitExceededException;
import com.jatin.jobassistant.security.RateLimits;
import com.jatin.jobassistant.security.AuthCookies;
import com.jatin.jobassistant.dto.SessionResponse;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jatin.jobassistant.dto.LoginResponse;
import com.jatin.jobassistant.dto.UserResponse;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.AuthService;
import com.jatin.jobassistant.service.DemoUnavailableException;
import com.jatin.jobassistant.service.EmailAlreadyUsedException;
import com.jatin.jobassistant.service.InvalidCredentialsException;

// Web layer with the real security rules; AuthService is a mock
@WebMvcTest({ AuthController.class, HealthController.class })
@Import({ SecurityConfig.class, JwtService.class, AuthCookies.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AuthService authService;

	@MockitoBean
	private RateLimits rateLimits;

	@Test
	void registerIsPublicAndReturns201WithoutThePassword() throws Exception {
		when(authService.register(any())).thenReturn(new UserResponse(1L, "jatin@example.com", Instant.now()));

		mockMvc
			.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").value(1))
			.andExpect(jsonPath("$.email").value("jatin@example.com"))
			.andExpect(content().string(not(containsString("password"))))
			.andExpect(content().string(not(containsString("secret-password"))));
	}

	@Test
	void registerReturns400ForInvalidEmailAndShortPassword() throws Exception {
		mockMvc
			.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "not-an-email", "password": "short"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message")
				.value("email must be a valid email address; password must be between 8 and 72 characters"));

		verifyNoInteractions(authService);
	}

	@Test
	void registerReturns400WhenFieldsAreMissing() throws Exception {
		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("email is required; password is required"));
	}

	@Test
	void registerReturns409WhenEmailIsAlreadyUsed() throws Exception {
		when(authService.register(any())).thenThrow(new EmailAlreadyUsedException());

		mockMvc
			.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.message").value("An account with this email already exists"));
	}

	private static final Session SESSION = new Session("the.jwt.token", Duration.ofHours(1),
			new SessionResponse("jatin@example.com", "Jatin", false, 3600));

	@Test
	void loginPutsTheTokenIntoAnHttpOnlyCookieAndNotIntoTheBody() throws Exception {
		when(authService.loginSession(any())).thenReturn(SESSION);

		mockMvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isOk())
			.andExpect(cookie().value(AuthCookies.NAME, "the.jwt.token"))
			.andExpect(cookie().httpOnly(AuthCookies.NAME, true))
			.andExpect(cookie().sameSite(AuthCookies.NAME, "Strict"))
			.andExpect(cookie().path(AuthCookies.NAME, "/api"))
			.andExpect(cookie().maxAge(AuthCookies.NAME, 3600))
			.andExpect(jsonPath("$.email").value("jatin@example.com"))
			.andExpect(jsonPath("$.name").value("Jatin"))
			.andExpect(jsonPath("$.demo").value(false))
			.andExpect(jsonPath("$.expiresInSeconds").value(3600))
			// The page must never see the token
			.andExpect(jsonPath("$.token").doesNotExist())
			.andExpect(content().string(not(containsString("the.jwt.token"))));
	}

	@Test
	void loginReturns401ForWrongEmailOrPasswordAndSetsNoCookie() throws Exception {
		when(authService.loginSession(any())).thenThrow(new InvalidCredentialsException());

		mockMvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "wrong-password"}
						"""))
			.andExpect(status().isUnauthorized())
			.andExpect(cookie().doesNotExist(AuthCookies.NAME))
			.andExpect(jsonPath("$.message").value("Email or password is incorrect"));
	}

	@Test
	void loginWorksEvenWhenAnOldBrokenCookieIsStillInTheBrowser() throws Exception {
		when(authService.loginSession(any())).thenReturn(SESSION);

		mockMvc
			.perform(post("/api/auth/login").cookie(new Cookie(AuthCookies.NAME, "expired-or-broken")).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isOk());
	}

	@Test
	void tokenEndpointReturnsTheTokenInTheBodyForApiClientsAndSetsNoCookie() throws Exception {
		when(authService.login(any())).thenReturn(new LoginResponse("the.jwt.token", "Bearer", 3600));

		mockMvc
			.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").value("the.jwt.token"))
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.expiresInSeconds").value(3600))
			.andExpect(cookie().doesNotExist(AuthCookies.NAME));
	}

	@Test
	void logoutDeletesTheCookie() throws Exception {
		mockMvc.perform(post("/api/auth/logout"))
			.andExpect(status().isNoContent())
			.andExpect(cookie().value(AuthCookies.NAME, ""))
			.andExpect(cookie().maxAge(AuthCookies.NAME, 0))
			.andExpect(cookie().httpOnly(AuthCookies.NAME, true));
	}

	@Test
	void loginAnswers429WithRetryAfterWhenThereWereTooManyAttempts() throws Exception {
		doThrow(new RateLimitExceededException("login attempts", 45)).when(rateLimits).loginAttempt(any(), any());

		mockMvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isTooManyRequests())
			.andExpect(header().string("Retry-After", "45"))
			.andExpect(jsonPath("$.status").value(429))
			.andExpect(jsonPath("$.error").value("Too Many Requests"))
			.andExpect(jsonPath("$.message").value("Too many login attempts. Please wait 45 seconds and try again"));

		// The password is not even checked
		verifyNoInteractions(authService);
	}

	@Test
	void everyLoginAttemptIsCountedForItsAddressAndItsEmail() throws Exception {
		when(authService.loginSession(any())).thenReturn(SESSION);

		mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "jatin@example.com", "password": "secret-password"}
				""").with(request -> {
			request.setRemoteAddr("203.0.113.7");
			return request;
		})).andExpect(status().isOk());

		verify(rateLimits).loginAttempt("203.0.113.7", "jatin@example.com");
	}

	@Test
	void theTokenEndpointIsRateLimitedTheSameWay() throws Exception {
		doThrow(new RateLimitExceededException("login attempts", 45)).when(rateLimits).loginAttempt(any(), any());

		mockMvc
			.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isTooManyRequests());
	}

	@Test
	void healthIsPublic() throws Exception {
		mockMvc.perform(get("/api/health")).andExpect(status().isOk());
	}

	@Test
	void anyOtherUrlNeedsAToken() throws Exception {
		mockMvc.perform(get("/api/resumes/1")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/actuator/health")).andExpect(status().isUnauthorized());
	}

	@Test
	void demoLoginIsPublicAndNeedsNoBody() throws Exception {
		when(authService.demoSession()).thenReturn(new Session("demo-token", Duration.ofHours(1),
				new SessionResponse("demo@jobassistant.example", "Alex", true, 3600)));

		mockMvc.perform(post("/api/auth/demo"))
			.andExpect(status().isOk())
			.andExpect(cookie().value(AuthCookies.NAME, "demo-token"))
			.andExpect(cookie().httpOnly(AuthCookies.NAME, true))
			.andExpect(jsonPath("$.demo").value(true))
			.andExpect(jsonPath("$.token").doesNotExist());
	}

	@Test
	void demoLoginAnswers503WhenTheDemoAccountIsSwitchedOff() throws Exception {
		when(authService.demoSession()).thenThrow(new DemoUnavailableException());

		mockMvc.perform(post("/api/auth/demo"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.message").value(containsString("demo account is not available")));
	}

}
