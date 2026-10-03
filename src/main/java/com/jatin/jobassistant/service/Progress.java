package com.jatin.jobassistant.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.StatusHistory;

// Small calculations the dashboard and the insights share: which stage an application ever reached,
// and which week a moment belongs to.
final class Progress {

	private Progress() {
	}

	// For every application: all statuses it has ever had (from the history) plus the one it has now
	static Map<Long, Set<ApplicationStatus>> statusesEverHeld(List<JobApplication> applications,
			List<StatusHistory> history) {
		Map<Long, Set<ApplicationStatus>> held = new HashMap<>();
		for (JobApplication application : applications) {
			held.computeIfAbsent(application.getId(), id -> EnumSet.noneOf(ApplicationStatus.class))
				.add(application.getStatus());
		}
		for (StatusHistory change : history) {
			Set<ApplicationStatus> statuses = held.get(change.getApplicationId());
			if (statuses != null) {
				statuses.add(change.getToStatus());
			}
		}
		return held;
	}

	// An application that had an interview or an offer was sent, even if "applied" was skipped on the board.
	// A rejected application counts as sent only if the history shows that it was.
	static boolean reachedApplied(Set<ApplicationStatus> held) {
		return held.contains(ApplicationStatus.APPLIED) || reachedInterview(held);
	}

	static boolean reachedInterview(Set<ApplicationStatus> held) {
		return held.contains(ApplicationStatus.INTERVIEW) || held.contains(ApplicationStatus.OFFER);
	}

	static boolean reachedOffer(Set<ApplicationStatus> held) {
		return held.contains(ApplicationStatus.OFFER);
	}

	static LocalDate dateOf(Instant moment, ZoneId zone) {
		return moment.atZone(zone).toLocalDate();
	}

	// The Monday of the week this day belongs to
	static LocalDate weekStart(LocalDate day) {
		return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
	}

	// Rounded to one decimal, e.g. 72.5
	static double round1(double value) {
		return Math.round(value * 10) / 10.0;
	}

}
