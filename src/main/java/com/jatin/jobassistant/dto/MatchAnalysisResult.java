package com.jatin.jobassistant.dto;

// The analysis plus whether it came from the cache (true) or from a fresh AI call (false)
public record MatchAnalysisResult(MatchAnalysisResponse analysis, boolean fromCache) {

}
