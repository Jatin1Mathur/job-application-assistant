package com.jatin.jobassistant.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jatin.jobassistant.dto.ApplicationResponse;
import com.jatin.jobassistant.dto.CoverLetterResponse;
import com.jatin.jobassistant.dto.MatchAnalysisResponse;
import com.jatin.jobassistant.dto.MatchAnalysisResult;
import com.jatin.jobassistant.dto.PageResponse;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.AiTimeoutException;
import com.jatin.jobassistant.service.AiUnavailableException;
import com.jatin.jobassistant.service.ApplicationNotFoundException;
import com.jatin.jobassistant.service.InvalidAiResponseException;
import com.jatin.jobassistant.service.JobApplicationService;

// Starts only the web layer (controller + GlobalExceptionHandler); the service is a mock, so no database is needed
@WebMvcTest(JobApplicationController.class)
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class JobApplicationControllerTest {

	private static final Long USER_ID = 1L;

	private static final Long OTHER_USER_ID = 2L;

	private static final String JOB_DESCRIPTION = "We need a Java Backend Developer with Spring Boot, REST APIs, PostgreSQL, Docker and unit testing experience.";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JobApplicationService jobApplicationService;

	@Autowired
	private JwtService jwtService;

	// A real token for USER_ID, sent as the Authorization header on every request
	private String token;

	@BeforeEach
	void logIn() {
		token = "Bearer " + jwtService.generateToken(USER_ID, "user@example.com");
	}

	@Test
	void requestWithoutATokenReturns401() throws Exception {
		mockMvc.perform(get("/api/applications"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.status").value(401))
			.andExpect(jsonPath("$.message")
				.value("Please log in and send your token in the Authorization header: Bearer <token>"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void requestWithAnInvalidTokenReturns401() throws Exception {
		mockMvc
			.perform(get("/api/applications")
				.header("Authorization", token + "tampered"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.message").value("Your token is invalid or has expired. Please log in again"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void userGets404ForAnApplicationOfAnotherUser() throws Exception {
		// Application 1 belongs to USER_ID. For the other user the service does not find it
		when(jobApplicationService.getById(OTHER_USER_ID, 1L)).thenThrow(new ApplicationNotFoundException(1L));
		String otherUsersToken = "Bearer " + jwtService.generateToken(OTHER_USER_ID, "other@example.com");

		mockMvc
			.perform(get("/api/applications/1")
				.header("Authorization", otherUsersToken))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("Application with id 1 was not found"));

		verify(jobApplicationService).getById(OTHER_USER_ID, 1L);
	}

	@Test
	void createReturns201WithTheNewApplication() throws Exception {
		when(jobApplicationService.create(eq(USER_ID), any())).thenReturn(response(1L, ApplicationStatus.SAVED));

		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer", "jobDescription": "%s"}
						""".formatted(JOB_DESCRIPTION)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").value(1))
			.andExpect(jsonPath("$.companyName").value("Acme"))
			.andExpect(jsonPath("$.status").value("SAVED"));
	}

	@Test
	void createReturns400WhenRequiredFieldsAreMissing() throws Exception {
		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": " "}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.status").value(400))
			.andExpect(jsonPath("$.message").value("companyName is required; jobDescription is required; jobTitle is required"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void createReturns400WhenBodyIsNotValidJson() throws Exception {
		mockMvc.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content("{not json"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("Request body is missing or is not valid JSON"));
	}

	@Test
	void listUsesDefaultPageAndSize() throws Exception {
		when(jobApplicationService.list(USER_ID, null, 0, 20))
			.thenReturn(new PageResponse<>(List.of(response(2L, ApplicationStatus.APPLIED)), 0, 20, 1, 1));

		mockMvc.perform(get("/api/applications").header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[0].id").value(2))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void listPassesStatusPageAndSizeToTheService() throws Exception {
		when(jobApplicationService.list(USER_ID, ApplicationStatus.APPLIED, 2, 5))
			.thenReturn(new PageResponse<>(List.of(), 2, 5, 0, 0));

		mockMvc.perform(get("/api/applications").header("Authorization", token).param("status", "APPLIED").param("page", "2").param("size", "5"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.page").value(2));

		verify(jobApplicationService).list(USER_ID, ApplicationStatus.APPLIED, 2, 5);
	}

	@Test
	void listReturns400ForUnknownStatus() throws Exception {
		mockMvc.perform(get("/api/applications").header("Authorization", token).param("status", "HIRED"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value(
					"Invalid value 'HIRED' for status. Allowed values: SAVED, APPLIED, INTERVIEW, OFFER, REJECTED"));
	}

	@Test
	void listReturns400ForInvalidPageOrSize() throws Exception {
		mockMvc.perform(get("/api/applications").header("Authorization", token).param("page", "-1"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("page must be 0 or greater"));

		mockMvc.perform(get("/api/applications").header("Authorization", token).param("size", "500"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("size must be between 1 and 100"));
	}

	@Test
	void getByIdReturnsTheApplication() throws Exception {
		when(jobApplicationService.getById(USER_ID, 1L)).thenReturn(response(1L, ApplicationStatus.SAVED));

		mockMvc.perform(get("/api/applications/1").header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.jobTitle").value("Java Developer"));
	}

	@Test
	void getByIdReturns404WhenNotFound() throws Exception {
		when(jobApplicationService.getById(USER_ID, 99L)).thenThrow(new ApplicationNotFoundException(99L));

		mockMvc.perform(get("/api/applications/99").header("Authorization", token))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("Application with id 99 was not found"));
	}

	@Test
	void getByIdReturns400WhenIdIsNotANumber() throws Exception {
		mockMvc.perform(get("/api/applications/abc").header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("id must be a number"));
	}

	@Test
	void updateStatusReturnsTheUpdatedApplication() throws Exception {
		when(jobApplicationService.updateStatus(USER_ID, 1L, ApplicationStatus.INTERVIEW))
			.thenReturn(response(1L, ApplicationStatus.INTERVIEW));

		mockMvc
			.perform(patch("/api/applications/1/status").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"status": "INTERVIEW"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("INTERVIEW"));
	}

	@Test
	void updateStatusReturns400WhenStatusIsMissing() throws Exception {
		mockMvc.perform(patch("/api/applications/1/status").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("status is required"));
	}

	@Test
	void updateStatusReturns400ForUnknownStatus() throws Exception {
		mockMvc
			.perform(patch("/api/applications/1/status").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"status": "HIRED"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message")
				.value("Invalid value 'HIRED'. Allowed values: SAVED, APPLIED, INTERVIEW, OFFER, REJECTED"));
	}

	@Test
	void deleteReturns204() throws Exception {
		mockMvc.perform(delete("/api/applications/1").header("Authorization", token)).andExpect(status().isNoContent());

		verify(jobApplicationService).delete(USER_ID, 1L);
	}

	@Test
	void deleteReturns404WhenNotFound() throws Exception {
		doThrow(new ApplicationNotFoundException(99L)).when(jobApplicationService).delete(USER_ID, 99L);

		mockMvc.perform(delete("/api/applications/99").header("Authorization", token)).andExpect(status().isNotFound());
	}

	@Test
	void analyzeReturnsTheAnalysis() throws Exception {
		when(jobApplicationService.analyze(USER_ID, 1L, 2L)).thenReturn(new MatchAnalysisResult(ANALYSIS, false));

		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isOk())
			.andExpect(header().string("X-Cache", "MISS"))
			.andExpect(jsonPath("$.matchScore").value(80))
			.andExpect(jsonPath("$.matchingSkills[0]").value("Java"))
			.andExpect(jsonPath("$.missingSkills[0]").value("Kubernetes"))
			.andExpect(jsonPath("$.resumeTips.length()").value(3));
	}

	@Test
	void analyzeSetsCacheHitHeaderWhenTheResultCameFromTheCache() throws Exception {
		when(jobApplicationService.analyze(USER_ID, 1L, 2L)).thenReturn(new MatchAnalysisResult(ANALYSIS, true));

		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isOk())
			.andExpect(header().string("X-Cache", "HIT"))
			.andExpect(jsonPath("$.matchScore").value(80));
	}

	@Test
	void createReturns400WhenJobDescriptionIsShorterThan100Characters() throws Exception {
		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer", "jobDescription": "Build APIs"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("jobDescription must be at least 100 characters"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void createReturns400WhenJobDescriptionIsOnlySpaces() throws Exception {
		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer", "jobDescription": "%s"}
						""".formatted(" ".repeat(150))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("jobDescription must be at least 100 characters"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void createDoesNotCountSpacesAroundTheJobDescription() throws Exception {
		String padded = " ".repeat(50) + "x".repeat(99) + " ".repeat(50);

		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer", "jobDescription": "%s"}
						""".formatted(padded)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("jobDescription must be at least 100 characters"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void createAcceptsJobDescriptionOfExactly100Characters() throws Exception {
		when(jobApplicationService.create(eq(USER_ID), any())).thenReturn(response(1L, ApplicationStatus.SAVED));

		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer", "jobDescription": "%s"}
						""".formatted("x".repeat(100))))
			.andExpect(status().isCreated());
	}

	@Test
	void createReturns400WhenJobDescriptionIsMissing() throws Exception {
		mockMvc
			.perform(post("/api/applications").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"companyName": "Acme", "jobTitle": "Java Developer"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("jobDescription is required"));

		verifyNoInteractions(jobApplicationService);
	}

	@Test
	void analyzeReturns400WhenResumeIdIsMissing() throws Exception {
		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("resumeId is required"));
	}

	@Test
	void analyzeReturns503WhenTheAiIsNotRunning() throws Exception {
		when(jobApplicationService.analyze(USER_ID, 1L, 2L)).thenThrow(new AiUnavailableException("AI is not running", null));

		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.message").value("AI is not running"));
	}

	@Test
	void analyzeReturns504WhenTheAiTimesOut() throws Exception {
		when(jobApplicationService.analyze(USER_ID, 1L, 2L)).thenThrow(new AiTimeoutException("AI took too long", null));

		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isGatewayTimeout());
	}

	@Test
	void analyzeReturns502WhenTheAiAnswerIsNotValid() throws Exception {
		when(jobApplicationService.analyze(USER_ID, 1L, 2L)).thenThrow(new InvalidAiResponseException("bad answer", null));

		mockMvc.perform(post("/api/applications/1/analyze").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isBadGateway());
	}

	@Test
	void coverLetterReturnsTheLetter() throws Exception {
		when(jobApplicationService.generateCoverLetter(USER_ID, 1L, 2L))
			.thenReturn(new CoverLetterResponse(1L, "Dear Hiring Manager, ..."));

		mockMvc.perform(post("/api/applications/1/cover-letter").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.applicationId").value(1))
			.andExpect(jsonPath("$.coverLetter").value("Dear Hiring Manager, ..."));
	}

	@Test
	void coverLetterReturns400WhenResumeIdIsMissing() throws Exception {
		mockMvc.perform(post("/api/applications/1/cover-letter").header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.message").value("resumeId is required"));
	}

	@Test
	void coverLetterReturns503WhenTheAiIsNotRunning() throws Exception {
		when(jobApplicationService.generateCoverLetter(USER_ID, 1L, 2L))
			.thenThrow(new AiUnavailableException("AI is not running", null));

		mockMvc.perform(post("/api/applications/1/cover-letter").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.message").value("AI is not running"));
	}

	@Test
	void coverLetterReturns502WhenTheAiAnswerIsNotValid() throws Exception {
		when(jobApplicationService.generateCoverLetter(USER_ID, 1L, 2L))
			.thenThrow(new InvalidAiResponseException("too long", null));

		mockMvc.perform(post("/api/applications/1/cover-letter").header("Authorization", token).param("resumeId", "2"))
			.andExpect(status().isBadGateway());
	}

	private static final MatchAnalysisResponse ANALYSIS = new MatchAnalysisResponse(80, List.of("Java"),
			List.of("Kubernetes"), List.of("tip 1", "tip 2", "tip 3"));

	private ApplicationResponse response(Long id, ApplicationStatus status) {
		return new ApplicationResponse(id, "Acme", "Java Developer", "Build APIs", status, null, null, Instant.now(),
				Instant.now());
	}

}
