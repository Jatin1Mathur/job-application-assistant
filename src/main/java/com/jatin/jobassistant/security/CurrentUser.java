package com.jatin.jobassistant.security;

import org.springframework.security.oauth2.jwt.Jwt;

public final class CurrentUser {

	private CurrentUser() {
	}

	// The user id was put into the token's "subject" at login
	public static Long id(Jwt jwt) {
		return Long.valueOf(jwt.getSubject());
	}

}
