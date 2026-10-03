package com.jatin.jobassistant.dto;

import java.time.Instant;
import java.util.List;

import com.jatin.jobassistant.entity.MatchAnalysis;

// The full analysis stored for an application, including which model made it and when
public record SavedAnalysisResponse(Integer matchScore, List<String> matchingSkills, List<String> missingSkills,
		List<String> resumeTips, String modelName, Instant analyzedAt, Long resumeId) {

	public static SavedAnalysisResponse from(MatchAnalysis analysis) {
		return new SavedAnalysisResponse(analysis.getMatchScore(), analysis.getMatchingSkills(),
				analysis.getMissingSkills(), analysis.getResumeTips(), analysis.getModelName(),
				analysis.getAnalyzedAt(), analysis.getResumeId());
	}

}
