package com.jatin.jobassistant.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.jatin.jobassistant.dto.InsightsResponse;
import com.jatin.jobassistant.dto.InsightsResponse.SkillCount;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.InsightsService;

@WebMvcTest(InsightsController.class)
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class InsightsControllerTest {

	private static final Long USER_ID = 1L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtService jwtService;

	@MockitoBean
	private InsightsService insightsService;

	@Test
	void returnsTheInsightsOfTheLoggedInUser() throws Exception {
		Map<ApplicationStatus, Long> byStatus = new EnumMap<>(ApplicationStatus.class);
		byStatus.put(ApplicationStatus.SAVED, 2L);
		byStatus.put(ApplicationStatus.APPLIED, 1L);
		byStatus.put(ApplicationStatus.INTERVIEW, 0L);
		byStatus.put(ApplicationStatus.OFFER, 0L);
		byStatus.put(ApplicationStatus.REJECTED, 0L);
		when(insightsService.getInsights(eq(USER_ID), any())).thenReturn(new InsightsResponse(3, byStatus, 2, 72.5,
				List.of(new SkillCount("Docker", 2), new SkillCount("Kubernetes", 1)), List.of(), List.of(), List.of(),
				List.of()));

		mockMvc
			.perform(get("/api/insights").header("Authorization",
					"Bearer " + jwtService.generateToken(USER_ID, "user@example.com")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalApplications").value(3))
			.andExpect(jsonPath("$.applicationsByStatus.SAVED").value(2))
			.andExpect(jsonPath("$.applicationsByStatus.REJECTED").value(0))
			.andExpect(jsonPath("$.analyzedApplications").value(2))
			.andExpect(jsonPath("$.averageMatchScore").value(72.5))
			.andExpect(jsonPath("$.topMissingSkills[0].skill").value("Docker"))
			.andExpect(jsonPath("$.topMissingSkills[0].applications").value(2))
			.andExpect(jsonPath("$.topMissingSkills.length()").value(2));
	}

	@Test
	void requestWithoutATokenReturns401() throws Exception {
		mockMvc.perform(get("/api/insights")).andExpect(status().isUnauthorized());

		verifyNoInteractions(insightsService);
	}

}
