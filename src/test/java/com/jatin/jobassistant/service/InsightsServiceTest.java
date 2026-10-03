package com.jatin.jobassistant.service;

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

}
