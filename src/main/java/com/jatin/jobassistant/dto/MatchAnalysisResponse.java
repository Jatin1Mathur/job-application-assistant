package com.jatin.jobassistant.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// The AI's answer is parsed straight into this, so extra fields it invents are ignored
@JsonIgnoreProperties(ignoreUnknown = true)
public record MatchAnalysisResponse(Integer matchScore, List<String> matchingSkills, List<String> missingSkills,
		List<String> resumeTips) {

}
