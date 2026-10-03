package com.jatin.jobassistant.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jatin.jobassistant.dto.InsightsResponse;
import com.jatin.jobassistant.security.CurrentUser;
import com.jatin.jobassistant.service.InsightsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/insights")
@RequiredArgsConstructor
public class InsightsController {

	private final InsightsService insightsService;

	// Numbers about the logged-in user's applications: per status, average score, most often missing skills
	@GetMapping
	public InsightsResponse getInsights(@AuthenticationPrincipal Jwt jwt) {
		return insightsService.getInsights(CurrentUser.id(jwt));
	}

}
