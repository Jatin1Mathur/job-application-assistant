package com.jatin.jobassistant.service;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

// What the app needs from an AI model. Each provider (Ollama, Gemini, Claude...) gets its own implementation.
public interface AiService {

	MatchAnalysisResponse analyzeMatch(String resumeText, String jobDescription);

	String generateCoverLetter(String resumeText, String jobTitle, String companyName, String jobDescription);

}
