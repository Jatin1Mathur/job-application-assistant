package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.jatin.jobassistant.dto.DashboardResponse;
import com.jatin.jobassistant.dto.DashboardResponse.ActionType;
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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceTest {

	private static final Long USER_ID = 1L;

	// A Saturday. Its week started on Monday 2026-09-28.
	private static final Instant NOW = Instant.parse("2026-10-03T10:00:00Z");

	@Mock
	private UserRepository userRepository;

	@Mock
	private JobApplicationRepository jobApplicationRepository;

	@Mock
	private MatchAnalysisRepository matchAnalysisRepository;

	@Mock
	private StatusHistoryRepository statusHistoryRepository;

	private DashboardService dashboardService;

	private final List<JobApplication> applications = new ArrayList<>();

	private final List<StatusHistory> history = new ArrayList<>();

	private final List<MatchAnalysis> analyses = new ArrayList<>();

	@BeforeEach
	void setUp() {
		dashboardService = new DashboardService(userRepository, jobApplicationRepository, matchAnalysisRepository,
				statusHistoryRepository, Clock.fixed(NOW, ZoneOffset.UTC));
		when(jobApplicationRepository.findByUserId(USER_ID)).thenReturn(applications);
		when(statusHistoryRepository.findByUserId(USER_ID)).thenReturn(history);
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(analyses);
		User user = new User();
		user.setName("Jatin");
		when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
	}

	private Instant daysAgo(int days) {
		return NOW.minusSeconds(days * 86_400L);
	}

	// An application created `createdDaysAgo` days ago that went through the given statuses, one per (status, daysAgo)
	private JobApplication application(long id, int createdDaysAgo, Object... steps) {
		JobApplication application = new JobApplication();
		application.setId(id);
		application.setCompanyName("Company " + id);
		application.setJobTitle("Developer");
		application.setCreatedAt(daysAgo(createdDaysAgo));
		application.setStatus(ApplicationStatus.SAVED);
		application.setStatusChangedAt(daysAgo(createdDaysAgo));
		history.add(new StatusHistory(id, null, ApplicationStatus.SAVED, daysAgo(createdDaysAgo)));
		for (int i = 0; i < steps.length; i += 2) {
			ApplicationStatus status = (ApplicationStatus) steps[i];
			Instant when = daysAgo((Integer) steps[i + 1]);
			history.add(new StatusHistory(id, application.getStatus(), status, when));
			application.setStatus(status);
			application.setStatusChangedAt(when);
		}
		applications.add(application);
		return application;
	}

	private void analysis(JobApplication application, int score, int daysAgo) {
		MatchAnalysis analysis = new MatchAnalysis();
		analysis.setApplicationId(application.getId());
		analysis.setMatchScore(score);
		analysis.setAnalyzedAt(daysAgo(daysAgo));
		analyses.add(analysis);
		application.setMatchScore(score);
	}

	private DashboardResponse dashboard() {
		return dashboardService.getDashboard(USER_ID, ZoneOffset.UTC);
	}

	@Test
	void anEmptyAccountHasZerosAndNoMadeUpRates() {
		DashboardResponse dashboard = dashboard();

		assertThat(dashboard.name()).isEqualTo("Jatin");
		assertThat(dashboard.totalApplications()).isZero();
		assertThat(dashboard.applicationsByStatus()).containsOnlyKeys(ApplicationStatus.values());
		assertThat(dashboard.applicationsByStatus().values()).containsOnly(0L);
		// Nothing was sent and nothing was analyzed: there is no rate and no average, not 0
		assertThat(dashboard.interviewRate()).isNull();
		assertThat(dashboard.averageScore()).isNull();
		assertThat(dashboard.nextActions()).isEmpty();
		assertThat(dashboard.weeks()).hasSize(12);
		assertThat(dashboard.days()).allSatisfy(day -> assertThat(day.applications()).isZero());
	}

	@Test
	void countsPerStatus() {
		application(1, 5);
		application(2, 5, ApplicationStatus.APPLIED, 4);
		application(3, 5, ApplicationStatus.APPLIED, 4);
		application(4, 9, ApplicationStatus.APPLIED, 8, ApplicationStatus.REJECTED, 2);

		DashboardResponse dashboard = dashboard();

		assertThat(dashboard.totalApplications()).isEqualTo(4);
		assertThat(dashboard.applicationsByStatus()).containsEntry(ApplicationStatus.SAVED, 1L)
			.containsEntry(ApplicationStatus.APPLIED, 2L)
			.containsEntry(ApplicationStatus.REJECTED, 1L)
			.containsEntry(ApplicationStatus.OFFER, 0L);
	}

	@Test
	void interviewRateIsInterviewsOutOfSentApplications() {
		application(1, 30);
		application(2, 30, ApplicationStatus.APPLIED, 28);
		application(3, 30, ApplicationStatus.APPLIED, 28, ApplicationStatus.INTERVIEW, 20);
		// Rejected after the interview: it was sent and it did lead to an interview
		application(4, 30, ApplicationStatus.APPLIED, 28, ApplicationStatus.INTERVIEW, 20, ApplicationStatus.REJECTED, 10);
		// Moved straight to "offer" on the board: counts as sent and as an interview
		application(5, 30, ApplicationStatus.OFFER, 5);

		DashboardResponse dashboard = dashboard();

		assertThat(dashboard.appliedApplications()).isEqualTo(4);
		assertThat(dashboard.interviewApplications()).isEqualTo(3);
		assertThat(dashboard.interviewRate()).isEqualTo(75.0);
	}

	@Test
	void aRejectionWithoutASendDateDoesNotCountAsSent() {
		// Dragged from "saved" straight to "rejected": the history does not say it was ever sent
		application(1, 10, ApplicationStatus.REJECTED, 2);

		assertThat(dashboard().appliedApplications()).isZero();
		assertThat(dashboard().interviewRate()).isNull();
	}

	@Test
	void averageScoreIsRoundedToOneDecimal() {
		analysis(application(1, 3), 80, 3);
		analysis(application(2, 3), 61, 3);
		analysis(application(3, 3), 62, 3);

		DashboardResponse dashboard = dashboard();

		assertThat(dashboard.analyzedApplications()).isEqualTo(3);
		assertThat(dashboard.averageScore()).isEqualTo(67.7);
	}

	@Test
	void daysCoverTwelveWeeksFromAMondayUntilToday() {
		application(1, 0);
		application(2, 0);
		application(3, 2);
		// Older than twelve weeks: not in the list of days
		application(4, 100);

		DashboardResponse dashboard = dashboard();

		assertThat(dashboard.days().getFirst().date()).isEqualTo(LocalDate.parse("2026-07-13"));
		assertThat(dashboard.days().getFirst().date().getDayOfWeek().getValue()).isEqualTo(1);
		assertThat(dashboard.days().getLast().date()).isEqualTo(LocalDate.parse("2026-10-03"));
		// 11 full weeks and 6 days of the current week (Monday to Saturday)
		assertThat(dashboard.days()).hasSize(11 * 7 + 6);
		assertThat(dashboard.days().getLast().applications()).isEqualTo(2);
		assertThat(dashboard.days().get(dashboard.days().size() - 3).applications()).isEqualTo(1);
		assertThat(dashboard.days().stream().mapToLong(day -> day.applications()).sum()).isEqualTo(3);
	}

	@Test
	void theDayAnApplicationBelongsToDependsOnTheUsersTimeZone() {
		JobApplication late = application(1, 0);
		// 23:30 UTC on Friday is already Saturday 01:30 in Berlin
		late.setCreatedAt(Instant.parse("2026-10-02T23:30:00Z"));

		DashboardResponse utc = dashboardService.getDashboard(USER_ID, ZoneOffset.UTC);
		DashboardResponse berlin = dashboardService.getDashboard(USER_ID, ZoneId.of("Europe/Berlin"));

		assertThat(utc.days().getLast().applications()).isZero();
		assertThat(berlin.days().getLast().applications()).isEqualTo(1);
	}

	@Test
	void weeksSummariseWhatHappenedInEachWeek() {
		// This week (from Monday 2026-09-28): two created, one sent, one analysis
		analysis(application(1, 1, ApplicationStatus.APPLIED, 0), 70, 1);
		application(2, 2);
		// Last week: one created and sent, invited this week
		analysis(application(3, 9, ApplicationStatus.APPLIED, 8, ApplicationStatus.INTERVIEW, 3), 90, 9);

		List<WeekSummary> weeks = dashboard().weeks();

		assertThat(weeks).hasSize(12);
		WeekSummary thisWeek = weeks.getLast();
		assertThat(thisWeek.weekStart()).isEqualTo(LocalDate.parse("2026-09-28"));
		assertThat(thisWeek.created()).isEqualTo(2);
		assertThat(thisWeek.applied()).isEqualTo(1);
		assertThat(thisWeek.interviews()).isEqualTo(1);
		assertThat(thisWeek.averageScore()).isEqualTo(70.0);
		WeekSummary lastWeek = weeks.get(10);
		assertThat(lastWeek.created()).isEqualTo(1);
		assertThat(lastWeek.applied()).isEqualTo(1);
		assertThat(lastWeek.interviews()).isZero();
		assertThat(lastWeek.averageScore()).isEqualTo(90.0);
		// A week without analyses has no average, not 0
		assertThat(weeks.getFirst().averageScore()).isNull();
	}

	@Test
	void followUpIsForApplicationsSentMoreThanSevenDaysAgoWithoutAReply() {
		analysis(application(1, 20, ApplicationStatus.APPLIED, 8), 70, 20);
		// Exactly seven days: not yet
		analysis(application(2, 20, ApplicationStatus.APPLIED, 7), 70, 20);
		// Sent long ago, but there was a reply (an interview)
		analysis(application(3, 20, ApplicationStatus.APPLIED, 18, ApplicationStatus.INTERVIEW, 2), 70, 20);

		List<NextAction> actions = dashboard().nextActions();

		assertThat(actions).singleElement().satisfies(action -> {
			assertThat(action.type()).isEqualTo(ActionType.FOLLOW_UP);
			assertThat(action.applicationId()).isEqualTo(1L);
			assertThat(action.days()).isEqualTo(8);
			assertThat(action.companyName()).isEqualTo("Company 1");
		});
	}

	@Test
	void analyzeIsForOpenApplicationsThatWereNeverAnalyzed() {
		application(1, 2);
		analysis(application(2, 2), 60, 2);
		// Not analyzed, but already rejected: nothing to do
		application(3, 9, ApplicationStatus.APPLIED, 8, ApplicationStatus.REJECTED, 1);

		List<NextAction> actions = dashboard().nextActions();

		assertThat(actions).singleElement().satisfies(action -> {
			assertThat(action.type()).isEqualTo(ActionType.ANALYZE);
			assertThat(action.applicationId()).isEqualTo(1L);
		});
	}

	@Test
	void interviewSoonIsForInterviewsTodayOrInTheNextThreeDays() {
		JobApplication today = application(1, 10, ApplicationStatus.INTERVIEW, 3);
		today.setMatchScore(70);
		today.setInterviewAt(Instant.parse("2026-10-03T15:00:00Z"));
		JobApplication inThreeDays = application(2, 10, ApplicationStatus.INTERVIEW, 3);
		inThreeDays.setMatchScore(70);
		inThreeDays.setInterviewAt(Instant.parse("2026-10-06T09:00:00Z"));
		JobApplication inFourDays = application(3, 10, ApplicationStatus.INTERVIEW, 3);
		inFourDays.setMatchScore(70);
		inFourDays.setInterviewAt(Instant.parse("2026-10-07T09:00:00Z"));
		JobApplication yesterday = application(4, 10, ApplicationStatus.INTERVIEW, 3);
		yesterday.setMatchScore(70);
		yesterday.setInterviewAt(Instant.parse("2026-10-02T09:00:00Z"));

		List<NextAction> actions = dashboard().nextActions();

		assertThat(actions).extracting(NextAction::applicationId).containsExactly(1L, 2L);
		assertThat(actions).extracting(NextAction::days).containsExactly(0L, 3L);
		assertThat(actions).allSatisfy(action -> assertThat(action.type()).isEqualTo(ActionType.INTERVIEW_SOON));
	}

	@Test
	void nextActionsPutInterviewsFirstThenFollowUpsThenAnalyses() {
		application(1, 1);
		analysis(application(2, 20, ApplicationStatus.APPLIED, 12), 70, 20);
		JobApplication interview = application(3, 10, ApplicationStatus.INTERVIEW, 3);
		interview.setMatchScore(70);
		interview.setInterviewAt(Instant.parse("2026-10-05T09:00:00Z"));

		assertThat(dashboard().nextActions()).extracting(NextAction::type)
			.containsExactly(ActionType.INTERVIEW_SOON, ActionType.FOLLOW_UP, ActionType.ANALYZE);
	}

}
