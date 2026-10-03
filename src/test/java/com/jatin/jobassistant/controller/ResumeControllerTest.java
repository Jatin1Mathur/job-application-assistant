package com.jatin.jobassistant.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jatin.jobassistant.dto.ResumeUploadResponse;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.ResumeNotFoundException;
import com.jatin.jobassistant.service.ResumeService;

@WebMvcTest(ResumeController.class)
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class ResumeControllerTest {

	private static final Long USER_ID = 1L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtService jwtService;

	@MockitoBean
	private ResumeService resumeService;

	private String token() {
		return "Bearer " + jwtService.generateToken(USER_ID, "user@example.com");
	}

	@Test
	void listShowsDetectedSkillsAndWhetherThePdfIsStored() throws Exception {
		when(resumeService.list(USER_ID)).thenReturn(List.of(new ResumeUploadResponse(3L, "resume.pdf",
				Instant.parse("2026-10-03T10:00:00Z"), "Java developer", List.of("Java", "Docker"), true)));

		mockMvc.perform(get("/api/resumes").header("Authorization", token()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].detectedSkills[0]").value("Java"))
			.andExpect(jsonPath("$[0].detectedSkills[1]").value("Docker"))
			.andExpect(jsonPath("$[0].hasFile").value(true));
	}

	@Test
	void fileReturnsThePdfOfTheLoggedInUser() throws Exception {
		byte[] pdf = "%PDF-1.6 resume".getBytes();
		when(resumeService.getFile(USER_ID, 3L)).thenReturn(new ResumeService.ResumeFileContent("resume.pdf", pdf));

		mockMvc.perform(get("/api/resumes/3/file").header("Authorization", token()))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "application/pdf"))
			.andExpect(content().bytes(pdf));
	}

	@Test
	void fileOfAnotherUserOrWithoutStoredPdfIsNotFound() throws Exception {
		when(resumeService.getFile(USER_ID, 3L)).thenThrow(new ResumeNotFoundException(3L));

		mockMvc.perform(get("/api/resumes/3/file").header("Authorization", token())).andExpect(status().isNotFound());
	}

	@Test
	void fileNeedsALogin() throws Exception {
		mockMvc.perform(get("/api/resumes/3/file")).andExpect(status().isUnauthorized());
	}

}
