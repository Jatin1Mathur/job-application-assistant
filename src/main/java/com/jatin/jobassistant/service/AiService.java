package com.jatin.jobassistant.service;

import com.jatin.jobassistant.entity.CoverLetterTone;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

// What the app needs from an AI model. Each provider (Ollama, Gemini, Claude...) gets its own implementation.
public interface AiService {

	// Name of the model that answers, e.g. "llama3.2". Cached results are kept per model
	String modelName();

	MatchAnalysisResponse analyzeMatch(String resumeText, String jobDescription);

	// tone says how the letter should sound: formal, friendly, or short
	String generateCoverLetter(String resumeText, String jobTitle, String companyName, String jobDescription,
			CoverLetterTone tone);

	default String generateCoverLetter(String resumeText, String jobTitle, String companyName, String jobDescription) {
		return generateCoverLetter(resumeText, jobTitle, companyName, jobDescription, CoverLetterTone.FORMAL);
	}

}
