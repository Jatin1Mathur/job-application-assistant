package com.jatin.jobassistant.controller;

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
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AuthService authService;

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

	@Test
	void loginIsPublicAndReturnsAToken() throws Exception {
		when(authService.login(any())).thenReturn(new LoginResponse("the.jwt.token", "Bearer", 3600));

		mockMvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "secret-password"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").value("the.jwt.token"))
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.expiresInSeconds").value(3600));
	}

	@Test
	void loginReturns401ForWrongEmailOrPassword() throws Exception {
		when(authService.login(any())).thenThrow(new InvalidCredentialsException());

		mockMvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jatin@example.com", "password": "wrong-password"}
						"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("Email or password is incorrect"));
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
		when(authService.demoLogin()).thenReturn(new LoginResponse("demo-token", "Bearer", 3600));

		mockMvc.perform(post("/api/auth/demo"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").value("demo-token"));
	}

	@Test
	void demoLoginAnswers503WhenTheDemoAccountIsSwitchedOff() throws Exception {
		when(authService.demoLogin()).thenThrow(new DemoUnavailableException());

		mockMvc.perform(post("/api/auth/demo"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.message").value(containsString("demo account is not available")));
	}

}
