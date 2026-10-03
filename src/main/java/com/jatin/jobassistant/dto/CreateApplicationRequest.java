package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateApplicationRequest(
		@NotBlank(message = "companyName is required")
		@Size(max = 255, message = "companyName must be at most 255 characters") String companyName,

		@NotBlank(message = "jobTitle is required")
		@Size(max = 255, message = "jobTitle must be at most 255 characters") String jobTitle,

		// Optional, but when given it must be long enough for the AI to work with
		@Size(min = CreateApplicationRequest.MIN_JOB_DESCRIPTION_LENGTH,
				message = "jobDescription must be at least 100 characters") String jobDescription) {

	public static final int MIN_JOB_DESCRIPTION_LENGTH = 100;

}
