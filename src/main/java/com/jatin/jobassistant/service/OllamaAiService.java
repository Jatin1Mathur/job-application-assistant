package com.jatin.jobassistant.service;

import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.jatin.jobassistant.dto.MatchAnalysisResponse;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

// Talks to a local Ollama server over its REST API (POST /api/chat)
@Service
public class OllamaAiService implements AiService {

	static final int COVER_LETTER_MAX_WORDS = 300;

	private static final String MATCH_SYSTEM_PROMPT = """
			You are an experienced technical recruiter. You compare a candidate's resume with a job description.
			Reply with JSON only, no other text, in exactly this shape:
			{
			  "matchScore": <whole number from 0 to 100, how well the resume fits the job>,
			  "matchingSkills": [<skills the job asks for that the resume shows>],
			  "missingSkills": [<skills the job asks for that the resume does not show>],
			  "resumeTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
			}
			Rules:
			- resumeTips must have exactly 3 items. Each item is one short, concrete tip to improve the resume for this job.
			- A skill belongs in matchingSkills only if the resume clearly mentions it.
			- Only use information that is in the resume and the job description.
			""";

	private static final String COVER_LETTER_SYSTEM_PROMPT = """
			You write cover letters for job applicants. You get the applicant's resume and a job posting.
			Write the cover letter in the applicant's own voice ("I").
			Rules:
			- Use ONLY facts that are written in the resume. Never invent experience, skills, employers, projects,
			  degrees, numbers or years. If the job asks for something the resume does not show, do not claim it.
			  You may say the applicant is eager to learn it.
			- Keep the facts exactly as the resume states them. For example, a student is not a graduate.
			- Say nothing about the company that is not in the job posting.
			- Mention the company name and the job title exactly as given.
			- Professional, confident and friendly tone.
			- At most 250 words, in 3 or 4 short paragraphs.
			- Start with "Dear Hiring Manager," and end with "Sincerely," followed by the applicant's name from the resume.
			- No placeholders in brackets such as [Your Name] or [Date]. No address block, no subject line.
			- Reply with the cover letter only, as plain text. No introduction, no notes, no markdown.
			""";

	private final RestClient restClient;

	private final String model;

	private final JsonMapper jsonMapper;

	@Autowired
	public OllamaAiService(@Value("${ai.ollama.base-url}") String baseUrl, @Value("${ai.ollama.model}") String model,
			@Value("${ai.ollama.timeout}") Duration timeout, JsonMapper jsonMapper) {
		this(RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory(timeout)).build(), model,
				jsonMapper);
	}

	// Used by tests to pass in a RestClient that does not call a real server
	OllamaAiService(RestClient restClient, String model, JsonMapper jsonMapper) {
		this.restClient = restClient;
		this.model = model;
		this.jsonMapper = jsonMapper;
	}

	@Override
	public MatchAnalysisResponse analyzeMatch(String resumeText, String jobDescription) {
		String userPrompt = """
				RESUME:
				%s

				JOB DESCRIPTION:
				%s
				""".formatted(resumeText.strip(), jobDescription.strip());
		return parse(chat(MATCH_SYSTEM_PROMPT, userPrompt, true));
	}

	@Override
	public String generateCoverLetter(String resumeText, String jobTitle, String companyName,
			String jobDescription) {
		String userPrompt = """
				COMPANY NAME: %s
				JOB TITLE: %s

				JOB DESCRIPTION:
				%s

				RESUME:
				%s
				""".formatted(companyName, jobTitle, jobDescription.strip(), resumeText.strip());
		String coverLetter = chat(COVER_LETTER_SYSTEM_PROMPT, userPrompt, false).strip();
		if (coverLetter.isEmpty()) {
			throw new InvalidAiResponseException("The AI returned an empty answer. Please try again", null);
		}
		// The prompt asks for less, but a model can ignore it, so the limit is checked here too
		if (coverLetter.split("\\s+").length > COVER_LETTER_MAX_WORDS) {
			throw new InvalidAiResponseException(
					"The AI wrote a cover letter longer than " + COVER_LETTER_MAX_WORDS + " words. Please try again",
					null);
		}
		return coverLetter;
	}

	private String chat(String systemPrompt, String userPrompt, boolean jsonMode) {
		Map<String, Object> request = new HashMap<>();
		request.put("model", model);
		request.put("stream", false); // one complete answer instead of word-by-word chunks
		request.put("options", Map.of("temperature", 0)); // same input gives (nearly) the same answer
		request.put("messages", List.of(Map.of("role", "system", "content", systemPrompt),
				Map.of("role", "user", "content", userPrompt)));
		if (jsonMode) {
			request.put("format", "json"); // JSON mode: the model may only produce valid JSON
		}
		try {
			OllamaChatResponse response = restClient.post()
				.uri("/api/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(OllamaChatResponse.class);
			if (response == null || response.message() == null || response.message().content() == null) {
				throw new InvalidAiResponseException("The AI returned an empty answer. Please try again", null);
			}
			return response.message().content();
		}
		catch (ResourceAccessException ex) {
			if (isTimeout(ex)) {
				throw new AiTimeoutException("The AI took too long to answer. Please try again", ex);
			}
			throw new AiUnavailableException("Could not reach the AI. Is Ollama running? Start it with: ollama serve",
					ex);
		}
		catch (RestClientResponseException ex) {
			// e.g. 404 when the model has not been downloaded yet
			throw new AiUnavailableException("Ollama returned an error (HTTP " + ex.getStatusCode().value()
					+ "). Is the model \"" + model + "\" installed? Install it with: ollama pull " + model, ex);
		}
		catch (RestClientException ex) {
			throw new InvalidAiResponseException("Could not read the answer from Ollama. Please try again", ex);
		}
	}

	private MatchAnalysisResponse parse(String json) {
		MatchAnalysisResponse analysis;
		try {
			analysis = jsonMapper.readValue(json, MatchAnalysisResponse.class);
		}
		catch (JacksonException ex) {
			throw new InvalidAiResponseException("The AI did not return valid JSON. Please try again", ex);
		}
		if (analysis == null || analysis.matchScore() == null || analysis.matchScore() < 0
				|| analysis.matchScore() > 100) {
			throw new InvalidAiResponseException("The AI did not return a match score from 0 to 100. Please try again",
					null);
		}
		return new MatchAnalysisResponse(analysis.matchScore(), orEmpty(analysis.matchingSkills()),
				orEmpty(analysis.missingSkills()), orEmpty(analysis.resumeTips()).stream().limit(3).toList());
	}

	private List<String> orEmpty(List<String> list) {
		return list == null ? List.of() : list;
	}

	private boolean isTimeout(Throwable ex) {
		for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
			if (cause instanceof HttpTimeoutException || cause instanceof SocketTimeoutException) {
				return true;
			}
		}
		return false;
	}

	private static JdkClientHttpRequestFactory requestFactory(Duration timeout) {
		// Connecting is quick even when the model is slow, so only the answer gets the long timeout
		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
		factory.setReadTimeout(timeout);
		return factory;
	}

	// The part of Ollama's reply we care about: {"message": {"content": "..."}}
	private record OllamaChatResponse(Message message) {

		private record Message(String content) {

		}

	}

}
