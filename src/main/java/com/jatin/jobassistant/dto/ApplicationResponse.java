package com.jatin.jobassistant.dto;

import java.time.Instant;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;

public record ApplicationResponse(Long id, String companyName, String jobTitle, String jobDescription,
		ApplicationStatus status, Integer matchScore, String coverLetter, Instant createdAt, Instant updatedAt) {

	public static ApplicationResponse from(JobApplication application) {
		return new ApplicationResponse(application.getId(), application.getCompanyName(), application.getJobTitle(),
				application.getJobDescription(), application.getStatus(), application.getMatchScore(),
				application.getCoverLetter(), application.getCreatedAt(), application.getUpdatedAt());
	}

}
