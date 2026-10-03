package com.jatin.jobassistant.dto;

import java.time.Instant;
import java.util.List;

import com.jatin.jobassistant.entity.CoverLetterTone;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.StatusHistory;

// analysis is null until the application has been analyzed.
// statusHistory is filled when one application is asked for; in lists it is empty.
public record ApplicationResponse(Long id, String companyName, String jobTitle, String jobDescription,
		ApplicationStatus status, Integer matchScore, String coverLetter, Instant createdAt, Instant updatedAt,
		SavedAnalysisResponse analysis, String notes, Instant interviewAt, Instant statusChangedAt,
		CoverLetterTone coverLetterTone, List<StatusChangeResponse> statusHistory) {

	public static ApplicationResponse from(JobApplication application, MatchAnalysis analysis) {
		return from(application, analysis, List.of());
	}

	public static ApplicationResponse from(JobApplication application, MatchAnalysis analysis,
			List<StatusHistory> history) {
		return new ApplicationResponse(application.getId(), application.getCompanyName(), application.getJobTitle(),
				application.getJobDescription(), application.getStatus(), application.getMatchScore(),
				application.getCoverLetter(), application.getCreatedAt(), application.getUpdatedAt(),
				analysis == null ? null : SavedAnalysisResponse.from(analysis), application.getNotes(),
				application.getInterviewAt(), application.getStatusChangedAt(), application.getCoverLetterTone(),
				history.stream().map(StatusChangeResponse::from).toList());
	}

}
