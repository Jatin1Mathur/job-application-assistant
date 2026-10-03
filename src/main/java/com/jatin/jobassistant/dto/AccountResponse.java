package com.jatin.jobassistant.dto;

import com.jatin.jobassistant.entity.User;

public record AccountResponse(String email, String name, boolean demo) {

	public static AccountResponse from(User user) {
		return new AccountResponse(user.getEmail(), user.getName(), user.isDemo());
	}

}
