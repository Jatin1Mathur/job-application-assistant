package com.jatin.jobassistant.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.jatin.jobassistant.entity.ApplicationStatus;

// averageMatchScore is null when nothing has been analyzed yet
public record InsightsResponse(long totalApplications, Map<ApplicationStatus, Long> applicationsByStatus,
		long analyzedApplications, Double averageMatchScore, List<SkillCount> topMissingSkills,
		List<FunnelStage> funnel, List<WeekScore> scoreByWeek, List<SkillCategory> skillCategories,
		List<ResumeScore> scoreByResume) {

	// A skill and the number of analyzed applications in which it was missing
	public record SkillCount(String skill, long applications) {
	}

	// How many applications ever reached this stage. rateFromPrevious is the share of the stage before that
	// got this far, in percent; null for the first stage and when the stage before is empty.
	public record FunnelStage(ApplicationStatus stage, long applications, Double rateFromPrevious) {
	}

	// The average score of the analyses made in the week that starts on this Monday
	public record WeekScore(LocalDate weekStart, double averageScore, long analyses) {
	}

	// All skills of one category over all analyses: how often they matched and how often they were missing.
	// matchRate is matching / (matching + missing) in percent.
	public record SkillCategory(String category, long matching, long missing, double matchRate) {
	}

	// The average score of the analyses made with this resume, best first
	public record ResumeScore(Long resumeId, String fileName, long analyses, double averageScore) {
	}

}
