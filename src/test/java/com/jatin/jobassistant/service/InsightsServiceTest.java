package com.jatin.jobassistant.service;

import com.jatin.jobassistant.dto.InsightsResponse.ResumeScore;
import com.jatin.jobassistant.dto.InsightsResponse.SkillCategory;
import com.jatin.jobassistant.dto.InsightsResponse.WeekScore;
import com.jatin.jobassistant.dto.InsightsResponse.FunnelStage;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.entity.JobApplication;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.time.LocalDate;
import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.StatusHistoryRepository;
import org.mockito.Spy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.jatin.jobassistant.dto.InsightsResponse;
import com.jatin.jobassistant.dto.InsightsResponse.SkillCount;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.StatusCount;

@ExtendWith(MockitoExtension.class)
class InsightsServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private JobApplicationRepository jobApplicationRepository;

	@Mock
	private MatchAnalysisRepository matchAnalysisRepository;

	@Mock
	private StatusHistoryRepository statusHistoryRepository;

	@Mock
	private ResumeRepository resumeRepository;

	@Spy
	private SkillCatalog skillCatalog = new SkillCatalog();

	@InjectMocks
	private InsightsService insightsService;

	@Test
	void countsApplicationsPerStatusAndListsEveryStatus() {
		when(jobApplicationRepository.countByStatus(USER_ID))
			.thenReturn(List.of(count(ApplicationStatus.SAVED, 3), count(ApplicationStatus.INTERVIEW, 1)));
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of());

		InsightsResponse insights = insightsService.getInsights(USER_ID);

		assertThat(insights.totalApplications()).isEqualTo(4);
		assertThat(insights.applicationsByStatus()).containsOnlyKeys(ApplicationStatus.values())
			.containsEntry(ApplicationStatus.SAVED, 3L)
			.containsEntry(ApplicationStatus.INTERVIEW, 1L)
			.containsEntry(ApplicationStatus.APPLIED, 0L)
			.containsEntry(ApplicationStatus.OFFER, 0L)
			.containsEntry(ApplicationStatus.REJECTED, 0L);
	}

	@Test
	void averageScoreIsRoundedToOneDecimal() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of(count(ApplicationStatus.SAVED, 3)));
		when(matchAnalysisRepository.findByUserId(USER_ID))
			.thenReturn(List.of(analysis(80), analysis(65), analysis(70)));

		InsightsResponse insights = insightsService.getInsights(USER_ID);

		assertThat(insights.analyzedApplications()).isEqualTo(3);
		// (80 + 65 + 70) / 3 = 71.666...
		assertThat(insights.averageMatchScore()).isEqualTo(71.7);
	}

	@Test
	void nothingAnalyzedMeansNoAverageAndNoMissingSkills() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of());

		InsightsResponse insights = insightsService.getInsights(USER_ID);

		assertThat(insights.totalApplications()).isZero();
		assertThat(insights.analyzedApplications()).isZero();
		assertThat(insights.averageMatchScore()).isNull();
		assertThat(insights.topMissingSkills()).isEmpty();
	}

	@Test
	void missingSkillsAreCountedPerApplicationIgnoringCaseAndSpaces() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of(
				analysis(50, "Docker", "Kubernetes", "AWS"),
				// "docker" twice in one analysis still counts as one application
				analysis(60, " docker ", "DOCKER", "Kubernetes"),
				analysis(70, "Docker", "", "Kafka")));

		List<SkillCount> skills = insightsService.getInsights(USER_ID).topMissingSkills();

		// Most often missing first; the same count is sorted by name
		assertThat(skills).containsExactly(new SkillCount("Docker", 3), new SkillCount("Kubernetes", 2),
				new SkillCount("AWS", 1), new SkillCount("Kafka", 1));
	}

	@Test
	void onlyTheTenMostFrequentMissingSkillsAreReturned() {
		List<MatchAnalysis> analyses = new ArrayList<>();
		String[] manySkills = new String[15];
		for (int i = 0; i < manySkills.length; i++) {
			manySkills[i] = "Skill " + (char) ('A' + i);
		}
		analyses.add(analysis(50, manySkills));
		analyses.add(analysis(50, "Skill O"));
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(analyses);

		List<SkillCount> skills = insightsService.getInsights(USER_ID).topMissingSkills();

		assertThat(skills).hasSize(10);
		assertThat(skills.get(0)).isEqualTo(new SkillCount("Skill O", 2));
	}

	private StatusCount count(ApplicationStatus status, long total) {
		return new StatusCount() {
			@Override
			public ApplicationStatus getStatus() {
				return status;
			}

			@Override
			public long getTotal() {
				return total;
			}
		};
	}

	private MatchAnalysis analysis(int score, String... missingSkills) {
		MatchAnalysis analysis = new MatchAnalysis();
		analysis.setMatchScore(score);
		analysis.setMatchingSkills(List.of());
		analysis.setMissingSkills(List.of(missingSkills));
		analysis.setResumeTips(List.of());
		analysis.setModelName("llama3.2");
		analysis.setAnalyzedAt(Instant.now());
		return analysis;
	}

	private JobApplication application(long id, ApplicationStatus status) {
		JobApplication application = new JobApplication();
		application.setId(id);
		application.setStatus(status);
		return application;
	}

	private MatchAnalysis scored(int score, Long resumeId, String analyzedAt, List<String> matching, List<String> missing) {
		MatchAnalysis analysis = new MatchAnalysis();
		analysis.setMatchScore(score);
		analysis.setResumeId(resumeId);
		analysis.setAnalyzedAt(Instant.parse(analyzedAt));
		analysis.setMatchingSkills(matching);
		analysis.setMissingSkills(missing);
		return analysis;
	}

	private Resume resume(long id, String fileName) {
		Resume resume = new Resume();
		resume.setId(id);
		resume.setFileName(fileName);
		return resume;
	}

	@Test
	void funnelCountsHowManyApplicationsEverReachedEachStage() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(jobApplicationRepository.findByUserId(USER_ID)).thenReturn(List.of(application(1, ApplicationStatus.SAVED),
				application(2, ApplicationStatus.APPLIED), application(3, ApplicationStatus.INTERVIEW),
				application(4, ApplicationStatus.OFFER), application(5, ApplicationStatus.REJECTED),
				application(6, ApplicationStatus.REJECTED)));
		// 5 was rejected after an interview; 6 was rejected without ever being sent
		when(statusHistoryRepository.findByUserId(USER_ID)).thenReturn(List.of(
				new StatusHistory(5L, ApplicationStatus.SAVED, ApplicationStatus.APPLIED, Instant.parse("2026-09-01T10:00:00Z")),
				new StatusHistory(5L, ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEW, Instant.parse("2026-09-10T10:00:00Z")),
				new StatusHistory(5L, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED, Instant.parse("2026-09-20T10:00:00Z"))));
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of());

		List<FunnelStage> funnel = insightsService.getInsights(USER_ID).funnel();

		assertThat(funnel).containsExactly(new FunnelStage(ApplicationStatus.SAVED, 6, null),
				new FunnelStage(ApplicationStatus.APPLIED, 4, 66.7), new FunnelStage(ApplicationStatus.INTERVIEW, 3, 75.0),
				new FunnelStage(ApplicationStatus.OFFER, 1, 33.3));
	}

	@Test
	void funnelOfAnEmptyAccountHasZerosAndNoRates() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of());

		InsightsResponse insights = insightsService.getInsights(USER_ID);

		assertThat(insights.funnel()).extracting(FunnelStage::applications).containsExactly(0L, 0L, 0L, 0L);
		assertThat(insights.funnel()).extracting(FunnelStage::rateFromPrevious).containsOnlyNulls();
		assertThat(insights.scoreByWeek()).isEmpty();
		assertThat(insights.skillCategories()).isEmpty();
		assertThat(insights.scoreByResume()).isEmpty();
	}

	@Test
	void scoreByWeekAveragesTheAnalysesOfEachWeekAndLeavesEmptyWeeksOut() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		// Monday 2026-09-14 and Sunday 2026-09-20 are the same week; 2026-10-01 is two weeks later
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of(
				scored(60, 1L, "2026-09-14T08:00:00Z", List.of(), List.of()),
				scored(75, 1L, "2026-09-20T20:00:00Z", List.of(), List.of()),
				scored(90, 1L, "2026-10-01T08:00:00Z", List.of(), List.of())));

		List<WeekScore> weeks = insightsService.getInsights(USER_ID).scoreByWeek();

		assertThat(weeks).containsExactly(new WeekScore(LocalDate.parse("2026-09-14"), 67.5, 2),
				new WeekScore(LocalDate.parse("2026-09-28"), 90.0, 1));
	}

	@Test
	void scoreByWeekUsesTheUsersTimeZone() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		// Sunday 23:30 UTC is already Monday in Berlin
		when(matchAnalysisRepository.findByUserId(USER_ID))
			.thenReturn(List.of(scored(60, 1L, "2026-09-20T23:30:00Z", List.of(), List.of())));

		assertThat(insightsService.getInsights(USER_ID, ZoneOffset.UTC).scoreByWeek().getFirst().weekStart())
			.isEqualTo(LocalDate.parse("2026-09-14"));
		assertThat(insightsService.getInsights(USER_ID, ZoneId.of("Europe/Berlin")).scoreByWeek().getFirst().weekStart())
			.isEqualTo(LocalDate.parse("2026-09-21"));
	}

	@Test
	void skillsAreGroupedByCategoryWithTheirMatchRate() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of(
				scored(80, 1L, "2026-09-14T08:00:00Z", List.of("Java", "Spring Boot", "PostgreSQL"), List.of("Kubernetes")),
				scored(60, 1L, "2026-09-15T08:00:00Z", List.of("java", "Docker"), List.of("AWS", "Negotiation"))));

		List<SkillCategory> categories = insightsService.getInsights(USER_ID).skillCategories();

		assertThat(categories).containsExactly(new SkillCategory("Languages", 2, 0, 100.0),
				new SkillCategory("Frameworks", 1, 0, 100.0), new SkillCategory("Databases", 1, 0, 100.0),
				new SkillCategory("Cloud and DevOps", 1, 2, 33.3), new SkillCategory("Other", 0, 1, 0.0));
	}

	@Test
	void scoreByResumePutsTheBestResumeFirstAndIgnoresDeletedResumes() {
		when(jobApplicationRepository.countByStatus(USER_ID)).thenReturn(List.of());
		when(resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(USER_ID))
			.thenReturn(List.of(resume(1, "short.pdf"), resume(2, "long.pdf"), resume(3, "unused.pdf")));
		when(matchAnalysisRepository.findByUserId(USER_ID)).thenReturn(List.of(
				scored(50, 1L, "2026-09-14T08:00:00Z", List.of(), List.of()),
				scored(61, 1L, "2026-09-14T08:00:00Z", List.of(), List.of()),
				scored(82, 2L, "2026-09-14T08:00:00Z", List.of(), List.of()),
				// Its resume was deleted (99 is not in the list), or the link was removed (null)
				scored(99, 99L, "2026-09-14T08:00:00Z", List.of(), List.of()),
				scored(99, null, "2026-09-14T08:00:00Z", List.of(), List.of())));

		List<ResumeScore> scores = insightsService.getInsights(USER_ID).scoreByResume();

		assertThat(scores).containsExactly(new ResumeScore(2L, "long.pdf", 1, 82.0), new ResumeScore(1L, "short.pdf", 2, 55.5));
	}

}
