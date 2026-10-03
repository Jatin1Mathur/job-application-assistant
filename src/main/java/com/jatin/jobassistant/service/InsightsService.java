package com.jatin.jobassistant.service;

import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.dto.InsightsResponse.ResumeScore;
import com.jatin.jobassistant.dto.InsightsResponse.SkillCategory;
import com.jatin.jobassistant.dto.InsightsResponse.WeekScore;
import com.jatin.jobassistant.dto.InsightsResponse.FunnelStage;
import java.util.TreeMap;
import java.util.HashMap;
import java.util.Collection;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.time.LocalDate;
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

	private final StatusHistoryRepository statusHistoryRepository;

	private final ResumeRepository resumeRepository;

	private final SkillCatalog skillCatalog;

	public InsightsResponse getInsights(Long userId) {
		return getInsights(userId, ZoneOffset.UTC);
	}

	// zone: the user's time zone, used to decide which week an analysis belongs to
	public InsightsResponse getInsights(Long userId, ZoneId zone) {
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
		List<JobApplication> applications = jobApplicationRepository.findByUserId(userId);
		List<MatchAnalysis> analyses = matchAnalysisRepository.findByUserId(userId);
		return new InsightsResponse(total, byStatus, analyses.size(), averageScore(analyses),
				topMissingSkills(analyses), funnel(applications, statusHistoryRepository.findByUserId(userId)),
				scoreByWeek(analyses, zone), skillCategories(analyses), scoreByResume(userId, analyses));
	}

	// Saved (everything), then how many were sent, how many led to an interview, how many to an offer.
	// An application counts for a stage if it ever reached it, also when it was rejected afterwards.
	private List<FunnelStage> funnel(List<JobApplication> applications, List<StatusHistory> history) {
		Collection<Set<ApplicationStatus>> held = Progress.statusesEverHeld(applications, history).values();
		long saved = applications.size();
		long applied = held.stream().filter(Progress::reachedApplied).count();
		long interview = held.stream().filter(Progress::reachedInterview).count();
		long offer = held.stream().filter(Progress::reachedOffer).count();
		return List.of(new FunnelStage(ApplicationStatus.SAVED, saved, null),
				new FunnelStage(ApplicationStatus.APPLIED, applied, rate(applied, saved)),
				new FunnelStage(ApplicationStatus.INTERVIEW, interview, rate(interview, applied)),
				new FunnelStage(ApplicationStatus.OFFER, offer, rate(offer, interview)));
	}

	private Double rate(long part, long whole) {
		return whole == 0 ? null : Progress.round1(part * 100.0 / whole);
	}

	// One entry per week in which at least one analysis was made, oldest first. Weeks without analyses are left out
	// instead of being shown as 0.
	private List<WeekScore> scoreByWeek(List<MatchAnalysis> analyses, ZoneId zone) {
		Map<LocalDate, List<MatchAnalysis>> perWeek = new TreeMap<>();
		for (MatchAnalysis analysis : analyses) {
			LocalDate week = Progress.weekStart(Progress.dateOf(analysis.getAnalyzedAt(), zone));
			perWeek.computeIfAbsent(week, key -> new ArrayList<>()).add(analysis);
		}
		List<WeekScore> weeks = new ArrayList<>();
		perWeek.forEach((week, ofWeek) -> weeks.add(new WeekScore(week,
				Progress.round1(ofWeek.stream().mapToInt(MatchAnalysis::getMatchScore).average().orElse(0)),
				ofWeek.size())));
		return weeks;
	}

	// Every skill an analysis named is put into its category (see SkillCatalog). Categories that never came up are
	// left out.
	private List<SkillCategory> skillCategories(List<MatchAnalysis> analyses) {
		Map<String, long[]> counts = new LinkedHashMap<>();
		skillCatalog.categories().forEach(category -> counts.put(category, new long[2]));
		for (MatchAnalysis analysis : analyses) {
			count(analysis.getMatchingSkills(), counts, 0);
			count(analysis.getMissingSkills(), counts, 1);
		}
		List<SkillCategory> categories = new ArrayList<>();
		counts.forEach((category, pair) -> {
			long all = pair[0] + pair[1];
			if (all > 0) {
				categories.add(new SkillCategory(category, pair[0], pair[1], Progress.round1(pair[0] * 100.0 / all)));
			}
		});
		return categories;
	}

	private void count(List<String> skills, Map<String, long[]> counts, int index) {
		for (String skill : skills) {
			if (skill != null && !skill.isBlank()) {
				counts.get(skillCatalog.categoryOf(skill))[index]++;
			}
		}
	}

	// The average score of the analyses made with each resume, best first. An analysis whose resume was deleted is
	// left out.
	private List<ResumeScore> scoreByResume(Long userId, List<MatchAnalysis> analyses) {
		Map<Long, String> fileNames = new HashMap<>();
		resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId)
			.forEach(resume -> fileNames.put(resume.getId(), resume.getFileName()));
		Map<Long, List<MatchAnalysis>> perResume = new LinkedHashMap<>();
		for (MatchAnalysis analysis : analyses) {
			if (analysis.getResumeId() != null && fileNames.containsKey(analysis.getResumeId())) {
				perResume.computeIfAbsent(analysis.getResumeId(), key -> new ArrayList<>()).add(analysis);
			}
		}
		List<ResumeScore> scores = new ArrayList<>();
		perResume.forEach((resumeId, ofResume) -> scores.add(new ResumeScore(resumeId, fileNames.get(resumeId),
				ofResume.size(),
				Progress.round1(ofResume.stream().mapToInt(MatchAnalysis::getMatchScore).average().orElse(0)))));
		scores.sort(Comparator.comparingDouble(ResumeScore::averageScore)
			.reversed()
			.thenComparing(ResumeScore::fileName, String.CASE_INSENSITIVE_ORDER));
		return scores;
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
