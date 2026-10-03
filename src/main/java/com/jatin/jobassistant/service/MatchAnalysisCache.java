package com.jatin.jobassistant.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.json.JsonMapper;

// Remembers AI match results in Redis so the same question is not sent to the slow AI twice
@Component
@RequiredArgsConstructor
@Slf4j
public class MatchAnalysisCache {

	static final Duration TTL = Duration.ofHours(24);

	private final StringRedisTemplate redisTemplate;

	private final JsonMapper jsonMapper;

	private final AiService aiService;

	public Optional<MatchAnalysisResponse> get(Long resumeId, Long applicationId, String jobDescription) {
		try {
			String json = redisTemplate.opsForValue().get(key(aiService.modelName(), resumeId, applicationId, jobDescription));
			return json == null ? Optional.empty() : Optional.of(jsonMapper.readValue(json, MatchAnalysisResponse.class));
		}
		catch (RuntimeException ex) {
			// The cache only saves time. If Redis is down or the entry is unreadable, just ask the AI again
			log.warn("Could not read match analysis from the cache: {}", ex.getMessage());
			return Optional.empty();
		}
	}

	public void put(Long resumeId, Long applicationId, String jobDescription, MatchAnalysisResponse analysis) {
		try {
			redisTemplate.opsForValue()
				.set(key(aiService.modelName(), resumeId, applicationId, jobDescription),
						jsonMapper.writeValueAsString(analysis), TTL);
		}
		catch (RuntimeException ex) {
			log.warn("Could not save match analysis to the cache: {}", ex.getMessage());
		}
	}

	// The hash makes the key change when the job description changes, so an old result is never reused for new text.
	// The model name is in the key so that switching to another model does not return the old model's answers
	static String key(String model, Long resumeId, Long applicationId, String jobDescription) {
		return "match-analysis:model:" + model + ":resume:" + resumeId + ":application:" + applicationId + ":"
				+ sha256(jobDescription);
	}

	private static String sha256(String text) {
		try {
			byte[] hash = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is not available", ex);
		}
	}

}
