package com.jatin.jobassistant.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.jatin.jobassistant.dto.InsightsResponse;
import com.jatin.jobassistant.dto.InsightsResponse.SkillCount;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.StatusCount;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InsightsService {

	static final int TOP_MISSING_SKILLS = 10;

	private final JobApplicationRepository jobApplicationRepository;

	private final MatchAnalysisRepository matchAnalysisRepository;

	public InsightsResponse getInsights(Long userId) {
		// Start every status at 0, so the answer always lists all of them
		Map<ApplicationStatus, Long> byStatus = new EnumMap<>(ApplicationStatus.class);
		for (ApplicationStatus status : ApplicationStatus.values()) {
			byStatus.put(status, 0L);
		}
		long total = 0;
		for (StatusCount count : jobApplicationRepository.countByStatus(userId)) {
			byStatus.put(count.getStatus(), count.getTotal());
			total += count.getTotal();
		}

		List<MatchAnalysis> analyses = matchAnalysisRepository.findByUserId(userId);
		return new InsightsResponse(total, byStatus, analyses.size(), averageScore(analyses),
				topMissingSkills(analyses));
	}

	// Rounded to one decimal, e.g. 72.5
	private Double averageScore(List<MatchAnalysis> analyses) {
		if (analyses.isEmpty()) {
			return null;
		}
		double average = analyses.stream().mapToInt(MatchAnalysis::getMatchScore).average().orElse(0);
		return Math.round(average * 10) / 10.0;
	}

	private List<SkillCount> topMissingSkills(List<MatchAnalysis> analyses) {
		// "docker", "Docker" and " Docker " are the same skill; the first spelling seen is the one shown
		Map<String, String> displayNames = new LinkedHashMap<>();
		Map<String, Long> counts = new LinkedHashMap<>();
		for (MatchAnalysis analysis : analyses) {
			// A skill listed twice in one analysis still counts as one application
			Set<String> seenInThisAnalysis = new HashSet<>();
			for (String skill : analysis.getMissingSkills()) {
				if (skill == null || skill.isBlank()) {
					continue;
				}
				String key = skill.strip().toLowerCase(Locale.ROOT);
				if (seenInThisAnalysis.add(key)) {
					displayNames.putIfAbsent(key, skill.strip());
					counts.merge(key, 1L, Long::sum);
				}
			}
		}

		List<SkillCount> skills = new ArrayList<>();
		counts.forEach((key, count) -> skills.add(new SkillCount(displayNames.get(key), count)));
		// Most often missing first; the same count is sorted by name so the order is always the same
		skills.sort(Comparator.comparingLong(SkillCount::applications)
			.reversed()
			.thenComparing(SkillCount::skill, String.CASE_INSENSITIVE_ORDER));
		return skills.stream().limit(TOP_MISSING_SKILLS).toList();
	}

}
