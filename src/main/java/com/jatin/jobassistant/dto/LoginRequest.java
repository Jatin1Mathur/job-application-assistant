package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(@NotBlank(message = "email is required") String email,
		@NotBlank(message = "password is required") String password) {

	// Keeps the password out of logs if this object is ever printed
	@Override
	public String toString() {
		return "LoginRequest[email=" + email + ", password=***]";
	}

}
