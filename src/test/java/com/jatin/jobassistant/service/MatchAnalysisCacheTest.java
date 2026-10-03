package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

import tools.jackson.databind.json.JsonMapper;

// Redis is mocked, so these tests run without a Redis server
@ExtendWith(MockitoExtension.class)
class MatchAnalysisCacheTest {

	private static final MatchAnalysisResponse ANALYSIS = new MatchAnalysisResponse(80, List.of("Java"),
			List.of("Kafka"), List.of("tip 1", "tip 2", "tip 3"));

	@Mock
	private StringRedisTemplate redisTemplate;

	@Mock
	private ValueOperations<String, String> valueOperations;

	@Mock
	private AiService aiService;

	private MatchAnalysisCache cache;

	@BeforeEach
	void setUp() {
		// lenient: the two key-only tests never touch Redis
		lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		lenient().when(aiService.modelName()).thenReturn("llama3.2");
		cache = new MatchAnalysisCache(redisTemplate, JsonMapper.builder().build(), aiService);
	}

	@Test
	void keyContainsModelResumeIdApplicationIdAndAHashOfTheJobDescription() {
		String key = MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer");

		assertThat(key).startsWith("match-analysis:model:llama3.2:resume:2:application:4:");
		// SHA-256 written as hex is always 64 characters, however long the text is
		assertThat(key.substring(key.lastIndexOf(':') + 1)).hasSize(64).matches("[0-9a-f]+");
		assertThat(key).doesNotContain("Java developer");
	}

	@Test
	void keyIsTheSameForTheSameInputAndDifferentWhenAnyPartChanges() {
		String key = MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer");

		assertThat(MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer")).isEqualTo(key);
		assertThat(MatchAnalysisCache.key("qwen2.5:7b", 2L, 4L, "Java developer")).isNotEqualTo(key);
		assertThat(MatchAnalysisCache.key("llama3.2", 3L, 4L, "Java developer")).isNotEqualTo(key);
		assertThat(MatchAnalysisCache.key("llama3.2", 2L, 5L, "Java developer")).isNotEqualTo(key);
		assertThat(MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer!")).isNotEqualTo(key);
	}

	@Test
	void putStoresTheAnalysisFor24Hours() {
		cache.put(2L, 4L, "Java developer", ANALYSIS);

		ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
		verify(valueOperations).set(eq(MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer")), json.capture(),
				eq(Duration.ofHours(24)));
		assertThat(json.getValue()).contains("\"matchScore\":80");
	}

	@Test
	void getReturnsWhatPutStored() {
		ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
		cache.put(2L, 4L, "Java developer", ANALYSIS);
		verify(valueOperations).set(anyString(), json.capture(), any(Duration.class));
		when(valueOperations.get(MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer"))).thenReturn(json.getValue());

		assertThat(cache.get(2L, 4L, "Java developer")).contains(ANALYSIS);
	}

	@Test
	void resultCachedForOneModelIsNotReturnedForAnotherModel() {
		ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
		cache.put(2L, 4L, "Java developer", ANALYSIS);
		verify(valueOperations).set(anyString(), json.capture(), any(Duration.class));
		when(valueOperations.get(MatchAnalysisCache.key("llama3.2", 2L, 4L, "Java developer")))
			.thenReturn(json.getValue());
		assertThat(cache.get(2L, 4L, "Java developer")).isPresent();

		when(aiService.modelName()).thenReturn("qwen2.5:7b");

		assertThat(cache.get(2L, 4L, "Java developer")).isEmpty();
	}

	@Test
	void getReturnsEmptyWhenNothingIsCached() {
		when(valueOperations.get(anyString())).thenReturn(null);

		assertThat(cache.get(2L, 4L, "Java developer")).isEmpty();
	}

	@Test
	void getReturnsEmptyWhenTheCachedValueIsNotReadable() {
		when(valueOperations.get(anyString())).thenReturn("not json");

		assertThat(cache.get(2L, 4L, "Java developer")).isEmpty();
	}

	@Test
	void redisBeingDownIsTreatedAsACacheMissAndDoesNotFail() {
		when(valueOperations.get(anyString())).thenThrow(new RedisConnectionFailureException("down"));
		doThrow(new RedisConnectionFailureException("down")).when(valueOperations)
			.set(anyString(), anyString(), any(Duration.class));

		assertThat(cache.get(2L, 4L, "Java developer")).isEmpty();
		cache.put(2L, 4L, "Java developer", ANALYSIS);
	}

}
