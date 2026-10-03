package com.jatin.jobassistant.service;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

// What the app needs from an AI model. Each provider (Ollama, Gemini, Claude...) gets its own implementation.
public interface AiService {

	// Name of the model that answers, e.g. "llama3.2". Cached results are kept per model
	String modelName();

	MatchAnalysisResponse analyzeMatch(String resumeText, String jobDescription);

	String generateCoverLetter(String resumeText, String jobTitle, String companyName, String jobDescription);

}
