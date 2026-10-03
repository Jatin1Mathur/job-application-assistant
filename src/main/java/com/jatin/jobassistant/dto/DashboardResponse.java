package com.jatin.jobassistant.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.jatin.jobassistant.entity.ApplicationStatus;

// Everything the dashboard shows above the list of applications.
// interviewRate and averageScore are null when there is nothing to calculate them from.
public record DashboardResponse(String name, long totalApplications, Map<ApplicationStatus, Long> applicationsByStatus,
		long appliedApplications, long interviewApplications, Double interviewRate, long analyzedApplications,
		Double averageScore, List<DayCount> days, List<WeekSummary> weeks, List<NextAction> nextActions) {

	// How many applications were created on this day
	public record DayCount(LocalDate date, long applications) {
	}

	// One week (Monday to Sunday) of the last twelve: what was created, sent, invited, and the average score of
	// the analyses made in that week (null if there were none)
	public record WeekSummary(LocalDate weekStart, long created, long applied, long interviews, Double averageScore) {
	}

	public enum ActionType {

		// The interview is today or within the next three days
		INTERVIEW_SOON,
		// Applied more than seven days ago and the status has not changed since
		FOLLOW_UP,
		// Saved or applied, but never compared with a resume
		ANALYZE

	}

	// date is the interview time (INTERVIEW_SOON), the day it was sent (FOLLOW_UP) or the day it was created
	// (ANALYZE). days counts from that date to today, or from today to the interview.
	public record NextAction(ActionType type, Long applicationId, String companyName, String jobTitle, Instant date,
			long days) {
	}

}
