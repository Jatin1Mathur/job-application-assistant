package com.jatin.jobassistant.controller;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jatin.jobassistant.dto.DashboardResponse;
import com.jatin.jobassistant.security.CurrentUser;
import com.jatin.jobassistant.service.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

	private final DashboardService dashboardService;

	// Counts, interview rate, average score, applications per day for the last 12 weeks, and what to do next.
	// zone is the user's time zone (e.g. Europe/Berlin), so "today" is the user's day. Unknown or missing: UTC.
	@GetMapping
	public DashboardResponse getDashboard(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) String zone) {
		return dashboardService.getDashboard(CurrentUser.id(jwt), parse(zone));
	}

	static ZoneId parse(String zone) {
		if (zone == null || zone.isBlank()) {
			return ZoneOffset.UTC;
		}
		try {
			return ZoneId.of(zone.strip());
		}
		catch (DateTimeException ex) {
			return ZoneOffset.UTC;
		}
	}

}
