package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateApplicationRequest(
		@NotBlank(message = "companyName is required")
		@Size(max = 255, message = "companyName must be at most 255 characters") String companyName,

		@NotBlank(message = "jobTitle is required")
		@Size(max = 255, message = "jobTitle must be at most 255 characters") String jobTitle,

		String jobDescription) {

}
