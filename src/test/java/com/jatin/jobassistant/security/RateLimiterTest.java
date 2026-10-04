package com.jatin.jobassistant.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

	private final RateLimiter rateLimiter = new RateLimiter();

	@Test
	void allowsAsManyAttemptsAsTheLimitAndRefusesTheNext() {
		for (int i = 0; i < 3; i++) {
			rateLimiter.check("login-ip:203.0.113.7", 3, Duration.ofMinutes(5), "login attempts");
		}

		assertThatThrownBy(() -> rateLimiter.check("login-ip:203.0.113.7", 3, Duration.ofMinutes(5), "login attempts"))
			.isInstanceOf(RateLimitExceededException.class)
			.hasMessageStartingWith("Too many login attempts. Please wait ")
			.satisfies(ex -> assertThat(((RateLimitExceededException) ex).getRetryAfterSeconds()).isBetween(1L, 101L));
	}

	@Test
	void everyKeyHasItsOwnBucket() {
		rateLimiter.check("ai:1", 1, Duration.ofHours(1), "AI requests");

		// User 1 is out of requests; user 2 is not affected
		assertThatThrownBy(() -> rateLimiter.check("ai:1", 1, Duration.ofHours(1), "AI requests"))
			.isInstanceOf(RateLimitExceededException.class);
		assertThatCode(() -> rateLimiter.check("ai:2", 1, Duration.ofHours(1), "AI requests")).doesNotThrowAnyException();
	}

	@Test
	void theBucketRefillsOverTime() throws InterruptedException {
		// 20 per second: one new attempt every 50 milliseconds
		for (int i = 0; i < 20; i++) {
			rateLimiter.check("fast", 20, Duration.ofSeconds(1), "attempts");
		}
		assertThatThrownBy(() -> rateLimiter.check("fast", 20, Duration.ofSeconds(1), "attempts"))
			.isInstanceOf(RateLimitExceededException.class);

		Thread.sleep(200);

		assertThatCode(() -> rateLimiter.check("fast", 20, Duration.ofSeconds(1), "attempts")).doesNotThrowAnyException();
	}

	@Test
	void theMessageSaysHowLongToWaitInSecondsOrMinutes() {
		assertThat(new RateLimitExceededException("login attempts", 1)).hasMessage("Too many login attempts. Please wait 1 second and try again");
		assertThat(new RateLimitExceededException("login attempts", 45)).hasMessage("Too many login attempts. Please wait 45 seconds and try again");
		assertThat(new RateLimitExceededException("AI requests", 600)).hasMessage("Too many AI requests. Please wait 10 minutes and try again");
	}

}
