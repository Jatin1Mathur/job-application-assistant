package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.Map;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

import tools.jackson.databind.json.JsonMapper;

// Ollama is replaced by a fake server, so these tests run without a real AI model
class OllamaAiServiceTest {

	private static final String CHAT_URL = "http://localhost:11434/api/chat";

	private final JsonMapper jsonMapper = JsonMapper.builder().build();

	private MockRestServiceServer ollama;

	private OllamaAiService aiService;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:11434");
		ollama = MockRestServiceServer.bindTo(builder).build();
		aiService = new OllamaAiService(builder.build(), "llama3.2", jsonMapper);
	}

	@Test
	void analyzeMatchSendsPromptInJsonModeAndParsesTheAnswer() {
		ollama.expect(requestTo(CHAT_URL))
			.andExpect(method(HttpMethod.POST))
			.andExpect(jsonPath("$.model").value("llama3.2"))
			.andExpect(jsonPath("$.format").value("json"))
			.andExpect(jsonPath("$.stream").value(false))
			.andExpect(jsonPath("$.messages[0].role").value("system"))
			.andExpect(jsonPath("$.messages[0].content", Matchers.containsString("matchScore")))
			.andExpect(jsonPath("$.messages[1].role").value("user"))
			.andExpect(jsonPath("$.messages[1].content",
					Matchers.allOf(Matchers.containsString("I know Java"), Matchers.containsString("Spring Boot role"))))
			.andRespond(withSuccess(ollamaReply("""
					{"matchScore": 72, "matchingSkills": ["Java"], "missingSkills": ["Kubernetes"],
					 "resumeTips": ["tip 1", "tip 2", "tip 3"], "extra": "ignored"}
					"""), MediaType.APPLICATION_JSON));

		MatchAnalysisResponse analysis = aiService.analyzeMatch("I know Java", "Spring Boot role");

		assertThat(analysis.matchScore()).isEqualTo(72);
		assertThat(analysis.matchingSkills()).containsExactly("Java");
		assertThat(analysis.missingSkills()).containsExactly("Kubernetes");
		assertThat(analysis.resumeTips()).containsExactly("tip 1", "tip 2", "tip 3");
		ollama.verify();
	}

	@Test
	void analyzeMatchKeepsOnlyThreeTipsAndTurnsMissingListsIntoEmptyOnes() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withSuccess(ollamaReply("""
				{"matchScore": 40, "resumeTips": ["1", "2", "3", "4", "5"]}
				"""), MediaType.APPLICATION_JSON));

		MatchAnalysisResponse analysis = aiService.analyzeMatch("resume", "job");

		assertThat(analysis.resumeTips()).containsExactly("1", "2", "3");
		assertThat(analysis.matchingSkills()).isEmpty();
		assertThat(analysis.missingSkills()).isEmpty();
	}

	@Test
	void analyzeMatchThrowsWhenOllamaIsNotRunning() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withException(new ConnectException("Connection refused")));

		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job")).isInstanceOf(AiUnavailableException.class)
			.hasMessageContaining("Is Ollama running?");
	}

	@Test
	void analyzeMatchThrowsWhenOllamaTimesOut() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withException(new SocketTimeoutException("Read timed out")));

		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job")).isInstanceOf(AiTimeoutException.class);
	}

	@Test
	void analyzeMatchThrowsWhenTheModelIsNotInstalled() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withResourceNotFound());

		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job")).isInstanceOf(AiUnavailableException.class)
			.hasMessageContaining("ollama pull llama3.2");
	}

	@Test
	void analyzeMatchThrowsWhenTheAiAnswerIsNotJson() {
		ollama.expect(requestTo(CHAT_URL))
			.andRespond(withSuccess(ollamaReply("Sure! Here is my analysis..."), MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job"))
			.isInstanceOf(InvalidAiResponseException.class)
			.hasMessageContaining("valid JSON");
	}

	@Test
	void analyzeMatchThrowsWhenTheScoreIsMissingOrOutOfRange() {
		ollama.expect(requestTo(CHAT_URL))
			.andRespond(withSuccess(ollamaReply("{\"matchingSkills\": [\"Java\"]}"), MediaType.APPLICATION_JSON));
		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job"))
			.isInstanceOf(InvalidAiResponseException.class);

		ollama.reset();
		ollama.expect(requestTo(CHAT_URL))
			.andRespond(withSuccess(ollamaReply("{\"matchScore\": 150}"), MediaType.APPLICATION_JSON));
		assertThatThrownBy(() -> aiService.analyzeMatch("resume", "job"))
			.isInstanceOf(InvalidAiResponseException.class)
			.hasMessageContaining("0 to 100");
	}

	@Test
	void generateCoverLetterUsesPlainTextModeAndReturnsTheLetter() {
		ollama.expect(requestTo(CHAT_URL))
			.andExpect(method(HttpMethod.POST))
			.andExpect(jsonPath("$.format").doesNotExist())
			.andExpect(jsonPath("$.stream").value(false))
			.andExpect(jsonPath("$.messages[0].content", Matchers.containsString("Never invent experience")))
			.andExpect(jsonPath("$.messages[1].content",
					Matchers.allOf(Matchers.containsString("COMPANY NAME: TechNova"),
							Matchers.containsString("JOB TITLE: Java Developer"),
							Matchers.containsString("Spring Boot role"), Matchers.containsString("I know Java"))))
			.andRespond(withSuccess(ollamaReply("\nDear Hiring Manager,\n\nI am applying...\n\nSincerely,\nJatin\n"),
					MediaType.APPLICATION_JSON));

		String coverLetter = aiService.generateCoverLetter("I know Java", "Java Developer", "TechNova",
				"Spring Boot role");

		assertThat(coverLetter).isEqualTo("Dear Hiring Manager,\n\nI am applying...\n\nSincerely,\nJatin");
		ollama.verify();
	}

	@Test
	void generateCoverLetterThrowsWhenTheAnswerIsBlank() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withSuccess(ollamaReply("  \n"), MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> aiService.generateCoverLetter("resume", "title", "company", "job"))
			.isInstanceOf(InvalidAiResponseException.class);
	}

	@Test
	void generateCoverLetterThrowsWhenTheLetterIsLongerThan300Words() {
		ollama.expect(requestTo(CHAT_URL))
			.andRespond(withSuccess(ollamaReply("word ".repeat(301)), MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> aiService.generateCoverLetter("resume", "title", "company", "job"))
			.isInstanceOf(InvalidAiResponseException.class)
			.hasMessageContaining("300 words");
	}

	@Test
	void generateCoverLetterAcceptsExactly300Words() {
		ollama.expect(requestTo(CHAT_URL))
			.andRespond(withSuccess(ollamaReply("word ".repeat(300)), MediaType.APPLICATION_JSON));

		assertThat(aiService.generateCoverLetter("resume", "title", "company", "job")).isNotBlank();
	}

	@Test
	void generateCoverLetterThrowsWhenOllamaIsNotRunning() {
		ollama.expect(requestTo(CHAT_URL)).andRespond(withException(new ConnectException("Connection refused")));

		assertThatThrownBy(() -> aiService.generateCoverLetter("resume", "title", "company", "job"))
			.isInstanceOf(AiUnavailableException.class);
	}

	// Wraps the model's text the way Ollama does: {"message": {"content": "<text>"}}
	private String ollamaReply(String content) {
		return jsonMapper.writeValueAsString(Map.of("message", Map.of("role", "assistant", "content", content)));
	}

}
