package com.jatin.jobassistant.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.jatin.jobassistant.dto.DashboardResponse;
import com.jatin.jobassistant.dto.DashboardResponse.ActionType;
import com.jatin.jobassistant.dto.DashboardResponse.DayCount;
import com.jatin.jobassistant.dto.DashboardResponse.NextAction;
import com.jatin.jobassistant.dto.DashboardResponse.WeekSummary;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.repository.UserRepository;

import lombok.RequiredArgsConstructor;

// The numbers at the top of the dashboard. Everything is counted from the user's own rows; nothing is estimated.
@Service
@RequiredArgsConstructor
public class DashboardService {

	static final int WEEKS = 12;

	static final int FOLLOW_UP_AFTER_DAYS = 7;

	static final int INTERVIEW_SOON_DAYS = 3;

	static final int MAX_NEXT_ACTIONS = 8;

	private final UserRepository userRepository;

	private final JobApplicationRepository jobApplicationRepository;

	private final MatchAnalysisRepository matchAnalysisRepository;

	private final StatusHistoryRepository statusHistoryRepository;

	private final Clock clock;

	// zone: the user's time zone, so that "today" and the days of the heatmap are the user's days
	public DashboardResponse getDashboard(Long userId, ZoneId zone) {
		Instant now = clock.instant();
		LocalDate today = Progress.dateOf(now, zone);
		List<JobApplication> applications = jobApplicationRepository.findByUserId(userId);
		List<StatusHistory> history = statusHistoryRepository.findByUserId(userId);
		List<MatchAnalysis> analyses = matchAnalysisRepository.findByUserId(userId);

		Map<ApplicationStatus, Long> byStatus = new EnumMap<>(ApplicationStatus.class);
		for (ApplicationStatus status : ApplicationStatus.values()) {
			byStatus.put(status, 0L);
		}
		applications.forEach(application -> byStatus.merge(application.getStatus(), 1L, Long::sum));

		Map<Long, Set<ApplicationStatus>> held = Progress.statusesEverHeld(applications, history);
		long applied = held.values().stream().filter(Progress::reachedApplied).count();
		long interviews = held.values().stream().filter(Progress::reachedInterview).count();
		// Of the applications that were sent, how many led to an interview. No value before anything was sent.
		Double interviewRate = applied == 0 ? null : Progress.round1(interviews * 100.0 / applied);

		Double averageScore = analyses.isEmpty() ? null
				: Progress.round1(analyses.stream().mapToInt(MatchAnalysis::getMatchScore).average().orElse(0));

		String name = userRepository.findById(userId).map(User::getName).orElse(null);
		return new DashboardResponse(name, applications.size(), byStatus, applied, interviews, interviewRate,
				analyses.size(), averageScore, days(applications, today, zone),
				weeks(applications, history, analyses, today, zone), nextActions(applications, now, today, zone));
	}

	// One entry per day, from the Monday eleven weeks ago until today, also for days without applications
	private List<DayCount> days(List<JobApplication> applications, LocalDate today, ZoneId zone) {
		LocalDate first = Progress.weekStart(today).minusWeeks(WEEKS - 1);
		Map<LocalDate, Long> perDay = new HashMap<>();
		applications.forEach(application -> perDay.merge(Progress.dateOf(application.getCreatedAt(), zone), 1L, Long::sum));
		List<DayCount> days = new ArrayList<>();
		for (LocalDate day = first; !day.isAfter(today); day = day.plusDays(1)) {
			days.add(new DayCount(day, perDay.getOrDefault(day, 0L)));
		}
		return days;
	}

	private List<WeekSummary> weeks(List<JobApplication> applications, List<StatusHistory> history,
			List<MatchAnalysis> analyses, LocalDate today, ZoneId zone) {
		LocalDate first = Progress.weekStart(today).minusWeeks(WEEKS - 1);
		List<WeekSummary> weeks = new ArrayList<>();
		for (int i = 0; i < WEEKS; i++) {
			LocalDate start = first.plusWeeks(i);
			long created = applications.stream()
				.filter(application -> inWeek(application.getCreatedAt(), start, zone))
				.count();
			long applied = changesTo(history, ApplicationStatus.APPLIED, start, zone);
			long interviews = changesTo(history, ApplicationStatus.INTERVIEW, start, zone);
			List<MatchAnalysis> ofWeek = analyses.stream()
				.filter(analysis -> inWeek(analysis.getAnalyzedAt(), start, zone))
				.toList();
			Double average = ofWeek.isEmpty() ? null
					: Progress.round1(ofWeek.stream().mapToInt(MatchAnalysis::getMatchScore).average().orElse(0));
			weeks.add(new WeekSummary(start, created, applied, interviews, average));
		}
		return weeks;
	}

	private long changesTo(List<StatusHistory> history, ApplicationStatus status, LocalDate weekStart, ZoneId zone) {
		return history.stream()
			.filter(change -> change.getToStatus() == status && inWeek(change.getChangedAt(), weekStart, zone))
			.count();
	}

	private boolean inWeek(Instant moment, LocalDate weekStart, ZoneId zone) {
		return Progress.weekStart(Progress.dateOf(moment, zone)).equals(weekStart);
	}

	// What to do next, most urgent first: interviews that are close, then letters without a reply, then
	// applications that were never analyzed
	private List<NextAction> nextActions(List<JobApplication> applications, Instant now, LocalDate today,
			ZoneId zone) {
		List<NextAction> interviewsSoon = new ArrayList<>();
		List<NextAction> followUps = new ArrayList<>();
		List<NextAction> toAnalyze = new ArrayList<>();
		for (JobApplication application : applications) {
			ApplicationStatus status = application.getStatus();
			boolean open = status != ApplicationStatus.REJECTED && status != ApplicationStatus.OFFER;
			if (open && application.getInterviewAt() != null) {
				long days = ChronoUnit.DAYS.between(today, Progress.dateOf(application.getInterviewAt(), zone));
				if (days >= 0 && days <= INTERVIEW_SOON_DAYS) {
					interviewsSoon.add(action(ActionType.INTERVIEW_SOON, application, application.getInterviewAt(), days));
				}
			}
			if (status == ApplicationStatus.APPLIED) {
				long days = ChronoUnit.DAYS.between(Progress.dateOf(application.getStatusChangedAt(), zone), today);
				if (days > FOLLOW_UP_AFTER_DAYS) {
					followUps.add(action(ActionType.FOLLOW_UP, application, application.getStatusChangedAt(), days));
				}
			}
			if (application.getMatchScore() == null
					&& (status == ApplicationStatus.SAVED || status == ApplicationStatus.APPLIED)) {
				long days = ChronoUnit.DAYS.between(Progress.dateOf(application.getCreatedAt(), zone), today);
				toAnalyze.add(action(ActionType.ANALYZE, application, application.getCreatedAt(), days));
			}
		}
		interviewsSoon.sort(Comparator.comparing(NextAction::date));
		// The one that has waited longest comes first
		followUps.sort(Comparator.comparing(NextAction::date));
		toAnalyze.sort(Comparator.comparing(NextAction::date).reversed());
		List<NextAction> all = new ArrayList<>(interviewsSoon);
		all.addAll(followUps);
		all.addAll(toAnalyze);
		return all.stream().limit(MAX_NEXT_ACTIONS).toList();
	}

	private NextAction action(ActionType type, JobApplication application, Instant date, long days) {
		return new NextAction(type, application.getId(), application.getCompanyName(), application.getJobTitle(), date,
				days);
	}

}
