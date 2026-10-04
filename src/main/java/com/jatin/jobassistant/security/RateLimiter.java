package com.jatin.jobassistant.security;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;

// Limits how often something may be done in a period of time, for example login attempts from one address.
//
// Each key ("login-ip:203.0.113.7", "ai:42") has a bucket of tokens (the library is Bucket4j). Every attempt takes
// one token; the bucket refills evenly over the period. An empty bucket means: too many attempts, try later.
//
// The buckets live in the memory of this backend. That is enough for one instance; several instances would each
// count on their own (see docs/ARCHITECTURE.md, known limitations).
@Component
public class RateLimiter {

	// Old keys are dropped once this many are stored, so a flood of different addresses cannot fill the memory
	static final int MAX_KEYS = 20_000;

	private final Map<String, Bucket> buckets = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
		@Override
		protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
			return size() > MAX_KEYS;
		}
	});

	// Takes one token from the bucket of this key. Throws if the bucket is empty.
	// what: used in the error message, e.g. "login attempts"
	public void check(String key, int capacity, Duration period, String what) {
		Bucket bucket = buckets.computeIfAbsent(key,
				k -> Bucket.builder().addLimit(limit -> limit.capacity(capacity).refillGreedy(capacity, period)).build());
		ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
		if (!probe.isConsumed()) {
			long seconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds() + 1);
			throw new RateLimitExceededException(what, seconds);
		}
	}

}
