package com.jatin.jobassistant.security;

import java.time.Duration;
import java.util.Locale;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

// The limits of this application, with their numbers from application.yml (rate-limit.*)
@Component
@RequiredArgsConstructor
public class RateLimits {

	private final RateLimiter rateLimiter;

	private final Settings settings;

	// A login attempt counts twice: for the address it comes from, and for the email it tries.
	// The first stops one machine from trying many accounts, the second stops many machines from trying one account.
	public void loginAttempt(String ipAddress, String email) {
		rateLimiter.check("login-ip:" + ipAddress, settings.getLoginPerIp(), settings.getLoginPeriod(), "login attempts");
		if (email != null && !email.isBlank()) {
			rateLimiter.check("login-email:" + email.strip().toLowerCase(Locale.ROOT), settings.getLoginPerEmail(),
					settings.getLoginPeriod(), "login attempts for this email");
		}
	}

	// An analysis or a cover letter. Each one keeps the AI model busy for seconds.
	public void aiRequest(Long userId) {
		rateLimiter.check("ai:" + userId, settings.getAiPerUser(), settings.getAiPeriod(), "AI requests");
	}

	@Component
	@ConfigurationProperties(prefix = "rate-limit")
	@Getter
	@Setter
	public static class Settings {

		private int loginPerIp = 60;

		private int loginPerEmail = 10;

		private Duration loginPeriod = Duration.ofMinutes(5);

		private int aiPerUser = 30;

		private Duration aiPeriod = Duration.ofHours(1);

	}

}
