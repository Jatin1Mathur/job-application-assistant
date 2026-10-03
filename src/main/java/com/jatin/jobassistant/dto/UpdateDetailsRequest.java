package com.jatin.jobassistant.dto;

import java.time.Instant;

import jakarta.validation.constraints.Size;

// The user's notes and the interview date of an application. Both are optional: null or empty removes them
public record UpdateDetailsRequest(
		@Size(max = 5000, message = "notes must be at most 5000 characters") String notes,
		Instant interviewAt) {
}
