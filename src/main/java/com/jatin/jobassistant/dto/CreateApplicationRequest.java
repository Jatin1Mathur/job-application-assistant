package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateApplicationRequest(
		@NotBlank(message = "companyName is required")
		@Size(max = 255, message = "companyName must be at most 255 characters") String companyName,

		@NotBlank(message = "jobTitle is required")
		@Size(max = 255, message = "jobTitle must be at most 255 characters") String jobTitle,

		@NotNull(message = "jobDescription is required") String jobDescription) {

	public static final int MIN_JOB_DESCRIPTION_LENGTH = 100;

	// Must be long enough for the AI to work with. Spaces at the start and end do not count
	public static boolean isLongEnough(String jobDescription) {
		return jobDescription.strip().length() >= MIN_JOB_DESCRIPTION_LENGTH;
	}

	@AssertTrue(message = "jobDescription must be at least 100 characters")
	private boolean isJobDescriptionLongEnough() {
		// A missing description is reported by @NotNull instead
		return jobDescription == null || isLongEnough(jobDescription);
	}

}
