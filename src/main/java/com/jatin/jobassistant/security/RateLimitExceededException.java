package com.jatin.jobassistant.security;

public class RateLimitExceededException extends RuntimeException {

	private final long retryAfterSeconds;

	public RateLimitExceededException(String what, long retryAfterSeconds) {
		super("Too many " + what + ". Please wait " + describe(retryAfterSeconds) + " and try again");
		this.retryAfterSeconds = retryAfterSeconds;
	}

	public long getRetryAfterSeconds() {
		return retryAfterSeconds;
	}

	private static String describe(long seconds) {
		if (seconds < 90) {
			return seconds + (seconds == 1 ? " second" : " seconds");
		}
		long minutes = Math.round(seconds / 60.0);
		return minutes + " minutes";
	}

}
