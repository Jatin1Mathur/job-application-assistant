package com.jatin.jobassistant.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jatin.jobassistant.dto.AccountResponse;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.AuthService;
import com.jatin.jobassistant.service.DemoAccountLockedException;

@WebMvcTest(AccountController.class)
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class AccountControllerTest {

	private static final Long USER_ID = 1L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtService jwtService;

	@MockitoBean
	private AuthService authService;

	private String token() {
		return "Bearer " + jwtService.generateToken(USER_ID, "user@example.com");
	}

	@Test
	void returnsTheAccountOfTheLoggedInUser() throws Exception {
		when(authService.account(USER_ID)).thenReturn(new AccountResponse("user@example.com", "Jatin", false));

		mockMvc.perform(get("/api/account").header("Authorization", token()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("user@example.com"))
			.andExpect(jsonPath("$.name").value("Jatin"))
			.andExpect(jsonPath("$.demo").value(false));
	}

	@Test
	void changesTheName() throws Exception {
		when(authService.updateName(USER_ID, "Jatin")).thenReturn(new AccountResponse("user@example.com", "Jatin", false));

		mockMvc
			.perform(patch("/api/account").header("Authorization", token())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Jatin"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Jatin"));
	}

	@Test
	void rejectsANameThatIsTooLong() throws Exception {
		mockMvc
			.perform(patch("/api/account").header("Authorization", token())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\": \"" + "x".repeat(101) + "\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value(containsString("name must be at most 100 characters")));
	}

	@Test
	void theDemoAccountCannotChangeItsName() throws Exception {
		when(authService.updateName(USER_ID, "Someone")).thenThrow(new DemoAccountLockedException());

		mockMvc
			.perform(patch("/api/account").header("Authorization", token())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Someone"}
						"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.message").value(containsString("demo account is shared")));
	}

	@Test
	void needsALogin() throws Exception {
		mockMvc.perform(get("/api/account")).andExpect(status().isUnauthorized());
	}

}
