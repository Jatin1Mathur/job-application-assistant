package com.jatin.jobassistant.dto;

import java.util.List;
import java.util.Map;

import com.jatin.jobassistant.entity.ApplicationStatus;

// averageMatchScore is null when nothing has been analyzed yet
public record InsightsResponse(long totalApplications, Map<ApplicationStatus, Long> applicationsByStatus,
		long analyzedApplications, Double averageMatchScore, List<SkillCount> topMissingSkills) {

	// A skill and the number of analyzed applications in which it was missing
	public record SkillCount(String skill, long applications) {

	}

}
