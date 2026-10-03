package com.jatin.jobassistant.dto;

import java.time.Instant;

import com.jatin.jobassistant.entity.User;

// Never includes the password hash
public record UserResponse(Long id, String email, Instant createdAt) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getCreatedAt());
	}

}
