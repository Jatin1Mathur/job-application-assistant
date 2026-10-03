package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "email is required")
		@Email(message = "email must be a valid email address")
		@Size(max = 255, message = "email must be at most 255 characters") String email,

		// BCrypt only looks at the first 72 bytes, so longer passwords are not allowed
		@NotNull(message = "password is required")
		@Size(min = 8, max = 72, message = "password must be between 8 and 72 characters") String password,
		// Optional. Shown in the greeting on the dashboard
		@Size(max = 100, message = "name must be at most 100 characters") String name) {

	public RegisterRequest(String email, String password) {
		this(email, password, null);
	}


	// Keeps the password out of logs if this object is ever printed
	@Override
	public String toString() {
		return "RegisterRequest[email=" + email + ", password=***, name=" + name + "]";
	}

}
