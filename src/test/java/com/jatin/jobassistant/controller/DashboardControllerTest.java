package com.jatin.jobassistant.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
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

import com.jatin.jobassistant.dto.DashboardResponse;
import com.jatin.jobassistant.dto.DashboardResponse.ActionType;
import com.jatin.jobassistant.dto.DashboardResponse.DayCount;
import com.jatin.jobassistant.dto.DashboardResponse.NextAction;
import com.jatin.jobassistant.dto.DashboardResponse.WeekSummary;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.security.JwtService;
import com.jatin.jobassistant.security.SecurityConfig;
import com.jatin.jobassistant.service.DashboardService;

@WebMvcTest(DashboardController.class)
@Import({ SecurityConfig.class, JwtService.class })
@TestPropertySource(properties = { "jwt.secret=test-secret-that-is-at-least-32-characters-long", "jwt.expiration=1h" })
class DashboardControllerTest {

	private static final Long USER_ID = 1L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtService jwtService;

	@MockitoBean
	private DashboardService dashboardService;

	private String token() {
		return "Bearer " + jwtService.generateToken(USER_ID, "user@example.com");
	}

	private DashboardResponse sample() {
		Map<ApplicationStatus, Long> byStatus = new EnumMap<>(ApplicationStatus.class);
		for (ApplicationStatus status : ApplicationStatus.values()) {
			byStatus.put(status, 0L);
		}
		byStatus.put(ApplicationStatus.APPLIED, 2L);
		return new DashboardResponse("Jatin", 2, byStatus, 2, 1, 50.0, 1, 82.0,
				List.of(new DayCount(LocalDate.parse("2026-10-03"), 2)),
				List.of(new WeekSummary(LocalDate.parse("2026-09-28"), 2, 2, 1, 82.0)),
				List.of(new NextAction(ActionType.FOLLOW_UP, 5L, "Acme", "Java Developer",
						Instant.parse("2026-09-20T09:00:00Z"), 13)));
	}

	@Test
	void returnsTheDashboardOfTheLoggedInUser() throws Exception {
		when(dashboardService.getDashboard(eq(USER_ID), any())).thenReturn(sample());

		mockMvc.perform(get("/api/dashboard").header("Authorization", token()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Jatin"))
			.andExpect(jsonPath("$.totalApplications").value(2))
			.andExpect(jsonPath("$.applicationsByStatus.APPLIED").value(2))
			.andExpect(jsonPath("$.interviewRate").value(50.0))
			.andExpect(jsonPath("$.averageScore").value(82.0))
			.andExpect(jsonPath("$.days[0].date").value("2026-10-03"))
			.andExpect(jsonPath("$.days[0].applications").value(2))
			.andExpect(jsonPath("$.weeks[0].weekStart").value("2026-09-28"))
			.andExpect(jsonPath("$.weeks[0].interviews").value(1))
			.andExpect(jsonPath("$.nextActions[0].type").value("FOLLOW_UP"))
			.andExpect(jsonPath("$.nextActions[0].applicationId").value(5))
			.andExpect(jsonPath("$.nextActions[0].days").value(13));
	}

	@Test
	void passesTheUsersTimeZoneOn() throws Exception {
		when(dashboardService.getDashboard(eq(USER_ID), any())).thenReturn(sample());

		mockMvc.perform(get("/api/dashboard").param("zone", "Europe/Berlin").header("Authorization", token()))
			.andExpect(status().isOk());

		verify(dashboardService).getDashboard(USER_ID, ZoneId.of("Europe/Berlin"));
	}

	@Test
	void anUnknownTimeZoneFallsBackToUtcInsteadOfFailing() throws Exception {
		when(dashboardService.getDashboard(eq(USER_ID), any())).thenReturn(sample());

		mockMvc.perform(get("/api/dashboard").param("zone", "Mars/Olympus").header("Authorization", token()))
			.andExpect(status().isOk());

		verify(dashboardService).getDashboard(USER_ID, ZoneOffset.UTC);
	}

	@Test
	void needsALogin() throws Exception {
		mockMvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
	}

}
