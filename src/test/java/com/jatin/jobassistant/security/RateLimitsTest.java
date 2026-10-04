package com.jatin.jobassistant.security;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateLimitsTest {

	private RateLimits rateLimits;

	@BeforeEach
	void setUp() {
		RateLimits.Settings settings = new RateLimits.Settings();
		settings.setLoginPerIp(5);
		settings.setLoginPerEmail(2);
		settings.setLoginPeriod(Duration.ofMinutes(5));
		settings.setAiPerUser(2);
		settings.setAiPeriod(Duration.ofHours(1));
		rateLimits = new RateLimits(new RateLimiter(), settings);
	}

	@Test
	void oneEmailIsLimitedEvenWhenTheAttemptsComeFromDifferentAddresses() {
		rateLimits.loginAttempt("203.0.113.1", "jatin@example.com");
		rateLimits.loginAttempt("203.0.113.2", "jatin@example.com");

		assertThatThrownBy(() -> rateLimits.loginAttempt("203.0.113.3", "jatin@example.com"))
			.isInstanceOf(RateLimitExceededException.class)
			.hasMessageContaining("login attempts for this email");
	}

	@Test
	void theEmailIsCountedWithoutRegardToCaseAndSpaces() {
		rateLimits.loginAttempt("203.0.113.1", "Jatin@Example.com");
		rateLimits.loginAttempt("203.0.113.1", " jatin@example.com ");

		assertThatThrownBy(() -> rateLimits.loginAttempt("203.0.113.1", "JATIN@EXAMPLE.COM"))
			.isInstanceOf(RateLimitExceededException.class);
	}

	@Test
	void oneAddressIsLimitedEvenWhenItTriesDifferentEmails() {
		for (int i = 0; i < 5; i++) {
			rateLimits.loginAttempt("203.0.113.9", "user" + i + "@example.com");
		}

		assertThatThrownBy(() -> rateLimits.loginAttempt("203.0.113.9", "another@example.com"))
			.isInstanceOf(RateLimitExceededException.class)
			.hasMessageStartingWith("Too many login attempts.");
	}

	@Test
	void theDemoLoginHasNoEmailAndCountsForTheAddressOnly() {
		for (int i = 0; i < 5; i++) {
			rateLimits.loginAttempt("203.0.113.9", null);
		}

		assertThatThrownBy(() -> rateLimits.loginAttempt("203.0.113.9", null)).isInstanceOf(RateLimitExceededException.class);
	}

	@Test
	void aiRequestsAreCountedPerUser() {
		rateLimits.aiRequest(1L);
		rateLimits.aiRequest(1L);

		assertThatThrownBy(() -> rateLimits.aiRequest(1L)).isInstanceOf(RateLimitExceededException.class)
			.hasMessageStartingWith("Too many AI requests.");
		assertThatCode(() -> rateLimits.aiRequest(2L)).doesNotThrowAnyException();
	}

}
