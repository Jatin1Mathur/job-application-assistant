package com.jatin.jobassistant.service;

import com.jatin.jobassistant.dto.UpdateDetailsRequest;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.entity.CoverLetterTone;
import org.mockito.Spy;
import java.time.ZoneOffset;
import java.time.Clock;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.jatin.jobassistant.dto.ApplicationResponse;
import com.jatin.jobassistant.dto.CoverLetterResponse;
import com.jatin.jobassistant.dto.CreateApplicationRequest;
import com.jatin.jobassistant.dto.MatchAnalysisResponse;
import com.jatin.jobassistant.dto.MatchAnalysisResult;
import com.jatin.jobassistant.dto.PageResponse;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.ResumeRepository;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

	private static final Instant NOW = Instant.parse("2026-10-03T10:00:00Z");

	private static final Long USER_ID = 1L;

	private static final Long OTHER_USER_ID = 2L;

	private static final String JOB_DESCRIPTION = "We need a Java Backend Developer with Spring Boot, REST APIs, PostgreSQL, Docker and unit testing experience.";

	@Mock
	private JobApplicationRepository jobApplicationRepository;

	@Mock
	private ResumeRepository resumeRepository;

	@Mock
	private AiService aiService;

	@Mock
	private MatchAnalysisCache matchAnalysisCache;

	@Mock
	private MatchAnalysisRepository matchAnalysisRepository;

	@Mock
	private StatusHistoryRepository statusHistoryRepository;

	@Mock
	private PdfTextWriter pdfTextWriter;

	@Spy
	private Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

	@InjectMocks
	private JobApplicationService jobApplicationService;

	@Test
	void createSavesApplicationWithStatusSaved() {
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> {
			JobApplication saved = invocation.getArgument(0);
			saved.setId(1L);
			saved.setCreatedAt(Instant.now());
			saved.setUpdatedAt(Instant.now());
			return saved;
		});

		ApplicationResponse response = jobApplicationService
			.create(USER_ID, new CreateApplicationRequest(" Acme ", "Java Developer", "  " + JOB_DESCRIPTION + "\n"));

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.companyName()).isEqualTo("Acme");
		assertThat(response.jobTitle()).isEqualTo("Java Developer");
		assertThat(response.jobDescription()).isEqualTo(JOB_DESCRIPTION);
		assertThat(response.status()).isEqualTo(ApplicationStatus.SAVED);

		ArgumentCaptor<JobApplication> saved = ArgumentCaptor.forClass(JobApplication.class);
		verify(jobApplicationRepository).save(saved.capture());
		assertThat(saved.getValue().getUserId()).isEqualTo(USER_ID);
	}

	// The application exists, but the query "id AND user id" finds nothing for a different user
	@Test
	void anotherUserCannotReadChangeOrDeleteTheApplication() {
		when(jobApplicationRepository.findByIdAndUserId(7L, OTHER_USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.getById(OTHER_USER_ID, 7L))
			.isInstanceOf(ApplicationNotFoundException.class);
		assertThatThrownBy(() -> jobApplicationService.updateStatus(OTHER_USER_ID, 7L, ApplicationStatus.APPLIED))
			.isInstanceOf(ApplicationNotFoundException.class);
		assertThatThrownBy(() -> jobApplicationService.delete(OTHER_USER_ID, 7L))
			.isInstanceOf(ApplicationNotFoundException.class);
		assertThatThrownBy(() -> jobApplicationService.analyze(OTHER_USER_ID, 7L, 2L))
			.isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).save(any());
		verify(jobApplicationRepository, never()).delete(any());
		verifyNoInteractions(aiService, matchAnalysisCache);
	}

	@Test
	void analyzeCannotUseAResumeOfAnotherUser() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		// Resume 5 belongs to someone else, so it is not found for this user
		when(resumeRepository.findByIdAndUserId(5L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 5L))
			.isInstanceOf(ResumeNotFoundException.class);
		verifyNoInteractions(aiService, matchAnalysisCache);
	}

	@Test
	void listWithoutStatusReturnsAllNewestFirst() {
		when(jobApplicationRepository.findByUserId(eq(USER_ID), any(Pageable.class)))
			.thenAnswer(invocation -> new PageImpl<>(
				List.of(application(2L, ApplicationStatus.APPLIED), application(1L, ApplicationStatus.SAVED)),
				invocation.getArgument(1), 5));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(USER_ID, null, 0, 2);

		assertThat(response.content()).extracting(ApplicationResponse::id).containsExactly(2L, 1L);
		assertThat(response.page()).isZero();
		assertThat(response.size()).isEqualTo(2);
		assertThat(response.totalElements()).isEqualTo(5);
		assertThat(response.totalPages()).isEqualTo(3);

		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		verify(jobApplicationRepository).findByUserId(eq(USER_ID), pageable.capture());
		assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection())
			.isEqualTo(Sort.Direction.DESC);
	}

	@Test
	void listWithStatusFiltersByStatus() {
		when(jobApplicationRepository.findByUserIdAndStatus(eq(USER_ID), eq(ApplicationStatus.APPLIED),
				any(Pageable.class)))
			.thenReturn(new PageImpl<>(List.of(application(2L, ApplicationStatus.APPLIED)), PageRequest.of(1, 10),
					11));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(USER_ID, ApplicationStatus.APPLIED, 1, 10);

		assertThat(response.content()).hasSize(1);
		assertThat(response.content().get(0).status()).isEqualTo(ApplicationStatus.APPLIED);
		assertThat(response.page()).isEqualTo(1);
		verify(jobApplicationRepository, never()).findByUserId(any(), any(Pageable.class));
	}

	@Test
	void getByIdReturnsApplication() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));

		assertThat(jobApplicationService.getById(USER_ID, 7L).id()).isEqualTo(7L);
	}

	@Test
	void getByIdThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.getById(USER_ID, 99L)).isInstanceOf(ApplicationNotFoundException.class)
			.hasMessageContaining("99");
	}

	@Test
	void updateStatusChangesOnlyTheStatus() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ApplicationResponse response = jobApplicationService.updateStatus(USER_ID, 7L, ApplicationStatus.INTERVIEW);

		assertThat(response.status()).isEqualTo(ApplicationStatus.INTERVIEW);
		assertThat(response.companyName()).isEqualTo("Company 7");
	}

	@Test
	void updateStatusThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.updateStatus(USER_ID, 99L, ApplicationStatus.APPLIED))
			.isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).save(any());
	}

	@Test
	void deleteRemovesApplication() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));

		jobApplicationService.delete(USER_ID, 7L);

		verify(jobApplicationRepository).delete(application);
	}

	@Test
	void deleteThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.delete(USER_ID, 99L)).isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).delete(any());
	}

	@Test
	void analyzeSendsTextsToTheAiAndSavesTheScore() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		MatchAnalysisResponse analysis = new MatchAnalysisResponse(80, List.of("Java"), List.of("Spring Boot"),
				List.of("tip 1", "tip 2", "tip 3"));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch("I know Java", JOB_DESCRIPTION)).thenReturn(analysis);

		MatchAnalysisResult result = jobApplicationService.analyze(USER_ID, 7L, 2L);

		assertThat(result.analysis()).isEqualTo(analysis);
		assertThat(result.fromCache()).isFalse();
		assertThat(application.getMatchScore()).isEqualTo(80);
		verify(jobApplicationRepository).save(application);
		verify(matchAnalysisCache).put(2L, 7L, JOB_DESCRIPTION, analysis);
	}

	@Test
	void analyzeSavesTheFullAnalysisWithModelNameAndDate() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch("I know Java", JOB_DESCRIPTION)).thenReturn(new MatchAnalysisResponse(80,
				List.of("Java"), List.of("Spring Boot"), List.of("tip 1", "tip 2", "tip 3")));
		when(aiService.modelName()).thenReturn("llama3.2");

		jobApplicationService.analyze(USER_ID, 7L, 2L);

		ArgumentCaptor<MatchAnalysis> saved = ArgumentCaptor.forClass(MatchAnalysis.class);
		verify(matchAnalysisRepository).save(saved.capture());
		assertThat(saved.getValue().getApplicationId()).isEqualTo(7L);
		assertThat(saved.getValue().getResumeId()).isEqualTo(2L);
		assertThat(saved.getValue().getMatchScore()).isEqualTo(80);
		assertThat(saved.getValue().getMatchingSkills()).containsExactly("Java");
		assertThat(saved.getValue().getMissingSkills()).containsExactly("Spring Boot");
		assertThat(saved.getValue().getResumeTips()).hasSize(3);
		assertThat(saved.getValue().getModelName()).isEqualTo("llama3.2");
		assertThat(saved.getValue().getAnalyzedAt()).isNotNull();
	}

	@Test
	void analyzeAgainReplacesTheSavedAnalysisInsteadOfAddingASecondOne() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		MatchAnalysis existing = savedAnalysis(7L, 2L, 40);
		existing.setId(55L);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch(any(), any()))
			.thenReturn(new MatchAnalysisResponse(90, List.of("Java"), List.of(), List.of("tip")));
		when(aiService.modelName()).thenReturn("llama3.2");
		when(matchAnalysisRepository.findByApplicationId(7L)).thenReturn(Optional.of(existing));

		jobApplicationService.analyze(USER_ID, 7L, 2L);

		ArgumentCaptor<MatchAnalysis> saved = ArgumentCaptor.forClass(MatchAnalysis.class);
		verify(matchAnalysisRepository).save(saved.capture());
		assertThat(saved.getValue().getId()).isEqualTo(55L);
		assertThat(saved.getValue().getMatchScore()).isEqualTo(90);
	}

	@Test
	void analyzeFromCacheKeepsTheAlreadySavedAnalysis() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional
			.of(new MatchAnalysisResponse(80, List.of("Java"), List.of("Spring Boot"), List.of("tip"))));
		when(matchAnalysisRepository.findByApplicationId(7L)).thenReturn(Optional.of(savedAnalysis(7L, 2L, 80)));

		jobApplicationService.analyze(USER_ID, 7L, 2L);

		verify(matchAnalysisRepository, never()).save(any());
	}

	@Test
	void analyzeDoesNotSaveAnAnalysisWhenTheAiFails() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch(any(), any())).thenThrow(new AiTimeoutException("slow", null));

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 2L))
			.isInstanceOf(AiTimeoutException.class);
		verifyNoInteractions(matchAnalysisRepository);
	}

	@Test
	void getByIdReturnsTheSavedAnalysisWithTheApplication() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID))
			.thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(matchAnalysisRepository.findByApplicationId(7L)).thenReturn(Optional.of(savedAnalysis(7L, 2L, 80)));

		ApplicationResponse response = jobApplicationService.getById(USER_ID, 7L);

		assertThat(response.analysis()).isNotNull();
		assertThat(response.analysis().matchScore()).isEqualTo(80);
		assertThat(response.analysis().missingSkills()).containsExactly("Docker");
		assertThat(response.analysis().modelName()).isEqualTo("llama3.2");
		assertThat(response.analysis().resumeId()).isEqualTo(2L);
	}

	@Test
	void getByIdReturnsNoAnalysisBeforeTheApplicationWasAnalyzed() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID))
			.thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));

		assertThat(jobApplicationService.getById(USER_ID, 7L).analysis()).isNull();
	}

	@Test
	void listAttachesEachSavedAnalysisToItsApplication() {
		when(jobApplicationRepository.findByUserId(eq(USER_ID), any(Pageable.class)))
			.thenAnswer(invocation -> new PageImpl<>(
					List.of(application(2L, ApplicationStatus.APPLIED), application(1L, ApplicationStatus.SAVED)),
					invocation.getArgument(1), 2));
		when(matchAnalysisRepository.findByApplicationIdIn(List.of(2L, 1L)))
			.thenReturn(List.of(savedAnalysis(1L, 2L, 65)));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(USER_ID, null, 0, 10);

		assertThat(response.content().get(0).analysis()).isNull();
		assertThat(response.content().get(1).analysis().matchScore()).isEqualTo(65);
	}

	private MatchAnalysis savedAnalysis(Long applicationId, Long resumeId, int score) {
		MatchAnalysis analysis = new MatchAnalysis();
		analysis.setApplicationId(applicationId);
		analysis.setResumeId(resumeId);
		analysis.setMatchScore(score);
		analysis.setMatchingSkills(List.of("Java"));
		analysis.setMissingSkills(List.of("Docker"));
		analysis.setResumeTips(List.of("tip 1", "tip 2", "tip 3"));
		analysis.setModelName("llama3.2");
		analysis.setAnalyzedAt(Instant.now());
		return analysis;
	}

	@Test
	void analyzeReturnsTheCachedResultWithoutCallingTheAi() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		MatchAnalysisResponse cached = new MatchAnalysisResponse(80, List.of("Java"), List.of("Spring Boot"),
				List.of("tip 1", "tip 2", "tip 3"));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.of(cached));

		MatchAnalysisResult result = jobApplicationService.analyze(USER_ID, 7L, 2L);

		assertThat(result.analysis()).isEqualTo(cached);
		assertThat(result.fromCache()).isTrue();
		assertThat(application.getMatchScore()).isEqualTo(80);
		verify(aiService, never()).analyzeMatch(any(), any());
		verify(matchAnalysisCache, never()).put(any(), any(), any(), any());
	}

	@Test
	void analyzeRejectsJobDescriptionShorterThan100Characters() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription("Java and Spring Boot");
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("at least 100 characters");
		verifyNoInteractions(aiService, matchAnalysisCache);
	}

	@Test
	void generateCoverLetterRejectsJobDescriptionShorterThan100Characters() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription("x".repeat(99));
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(USER_ID, 7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("at least 100 characters");
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 99L, 2L))
			.isInstanceOf(ApplicationNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenResumeDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 99L)).isInstanceOf(ResumeNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenApplicationHasNoJobDescription() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("job description");
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeDoesNotSaveAScoreWhenTheAiFails() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch(any(), any())).thenThrow(new AiUnavailableException("down", null));

		assertThatThrownBy(() -> jobApplicationService.analyze(USER_ID, 7L, 2L)).isInstanceOf(AiUnavailableException.class);
		assertThat(application.getMatchScore()).isNull();
		verify(jobApplicationRepository, never()).save(any());
		// Errors must not be cached, or every later call would get the same error for 24 hours
		verify(matchAnalysisCache, never()).put(any(), any(), any(), any());
	}

	@Test
	void generateCoverLetterSendsDetailsToTheAiAndSavesTheLetter() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(aiService.generateCoverLetter("I know Java", "Developer", "Company 7", JOB_DESCRIPTION, CoverLetterTone.FORMAL))
			.thenReturn("Dear Hiring Manager, ...");

		CoverLetterResponse response = jobApplicationService.generateCoverLetter(USER_ID, 7L, 2L);

		assertThat(response.applicationId()).isEqualTo(7L);
		assertThat(response.coverLetter()).isEqualTo("Dear Hiring Manager, ...");
		assertThat(application.getCoverLetter()).isEqualTo("Dear Hiring Manager, ...");
		verify(jobApplicationRepository).save(application);
	}

	@Test
	void generateCoverLetterThrowsWhenResumeDoesNotExist() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(USER_ID, 7L, 99L))
			.isInstanceOf(ResumeNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void generateCoverLetterThrowsWhenApplicationHasNoJobDescription() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(USER_ID, 7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void generateCoverLetterDoesNotSaveWhenTheAiFails() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(aiService.generateCoverLetter(any(), any(), any(), any(), any())).thenThrow(new AiTimeoutException("slow", null));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(USER_ID, 7L, 2L))
			.isInstanceOf(AiTimeoutException.class);
		assertThat(application.getCoverLetter()).isNull();
		verify(jobApplicationRepository, never()).save(any());
	}

	private Resume resume(Long id, String text) {
		Resume resume = new Resume();
		resume.setId(id);
		resume.setFileName("resume.pdf");
		resume.setExtractedText(text);
		return resume;
	}

	private JobApplication application(Long id, ApplicationStatus status) {
		JobApplication application = new JobApplication();
		application.setId(id);
		application.setCompanyName("Company " + id);
		application.setJobTitle("Developer");
		application.setStatus(status);
		application.setCreatedAt(Instant.now());
		application.setUpdatedAt(Instant.now());
		return application;
	}

	@Test
	void createRecordsTheFirstLineOfTheStatusHistory() {
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> {
			JobApplication saved = invocation.getArgument(0);
			saved.setId(1L);
			return saved;
		});

		ApplicationResponse response = jobApplicationService
			.create(USER_ID, new CreateApplicationRequest("Acme", "Java Developer", JOB_DESCRIPTION));

		ArgumentCaptor<StatusHistory> recorded = ArgumentCaptor.forClass(StatusHistory.class);
		verify(statusHistoryRepository).save(recorded.capture());
		assertThat(recorded.getValue().getApplicationId()).isEqualTo(1L);
		assertThat(recorded.getValue().getFromStatus()).isNull();
		assertThat(recorded.getValue().getToStatus()).isEqualTo(ApplicationStatus.SAVED);
		assertThat(recorded.getValue().getChangedAt()).isEqualTo(NOW);
		assertThat(response.statusChangedAt()).isEqualTo(NOW);
		assertThat(response.statusHistory()).hasSize(1);
	}

	@Test
	void updateStatusRecordsTheChangeWithItsDate() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setStatusChangedAt(NOW.minusSeconds(86_400));
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));

		ApplicationResponse response = jobApplicationService.updateStatus(USER_ID, 7L, ApplicationStatus.APPLIED);

		ArgumentCaptor<StatusHistory> recorded = ArgumentCaptor.forClass(StatusHistory.class);
		verify(statusHistoryRepository).save(recorded.capture());
		assertThat(recorded.getValue().getFromStatus()).isEqualTo(ApplicationStatus.SAVED);
		assertThat(recorded.getValue().getToStatus()).isEqualTo(ApplicationStatus.APPLIED);
		assertThat(recorded.getValue().getChangedAt()).isEqualTo(NOW);
		// "Days in this stage" starts again
		assertThat(response.statusChangedAt()).isEqualTo(NOW);
	}

	@Test
	void updateStatusToTheSameStatusRecordsNothing() {
		JobApplication application = application(7L, ApplicationStatus.APPLIED);
		Instant since = NOW.minusSeconds(5 * 86_400);
		application.setStatusChangedAt(since);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));

		ApplicationResponse response = jobApplicationService.updateStatus(USER_ID, 7L, ApplicationStatus.APPLIED);

		verify(statusHistoryRepository, never()).save(any());
		verify(jobApplicationRepository, never()).save(any());
		assertThat(response.statusChangedAt()).isEqualTo(since);
	}

	@Test
	void getByIdReturnsTheStatusHistoryOldestFirst() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.APPLIED)));
		when(statusHistoryRepository.findByApplicationIdOrderByChangedAtAscIdAsc(7L)).thenReturn(List.of(
				new StatusHistory(7L, null, ApplicationStatus.SAVED, NOW.minusSeconds(200)),
				new StatusHistory(7L, ApplicationStatus.SAVED, ApplicationStatus.APPLIED, NOW.minusSeconds(100))));

		ApplicationResponse response = jobApplicationService.getById(USER_ID, 7L);

		assertThat(response.statusHistory()).extracting(change -> change.toStatus())
			.containsExactly(ApplicationStatus.SAVED, ApplicationStatus.APPLIED);
	}

	@Test
	void updateDetailsStoresNotesAndInterviewDate() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.INTERVIEW)));
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));
		Instant interview = Instant.parse("2026-10-06T09:00:00Z");

		ApplicationResponse response = jobApplicationService.updateDetails(USER_ID, 7L,
				new UpdateDetailsRequest("  Ask about the team.  ", interview));

		assertThat(response.notes()).isEqualTo("Ask about the team.");
		assertThat(response.interviewAt()).isEqualTo(interview);
		// Notes and dates are not a status change
		verify(statusHistoryRepository, never()).save(any());
	}

	@Test
	void updateDetailsWithEmptyValuesRemovesNotesAndInterviewDate() {
		JobApplication application = application(7L, ApplicationStatus.INTERVIEW);
		application.setNotes("old");
		application.setInterviewAt(NOW);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ApplicationResponse response = jobApplicationService.updateDetails(USER_ID, 7L, new UpdateDetailsRequest("   ", null));

		assertThat(response.notes()).isNull();
		assertThat(response.interviewAt()).isNull();
	}

	@Test
	void updateDetailsOfAnotherUsersApplicationIsNotFound() {
		when(jobApplicationRepository.findByIdAndUserId(7L, OTHER_USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.updateDetails(OTHER_USER_ID, 7L, new UpdateDetailsRequest("x", null)))
			.isInstanceOf(ApplicationNotFoundException.class);
	}

	@Test
	void generateCoverLetterPassesTheToneToTheAiAndRemembersIt() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(resumeRepository.findByIdAndUserId(2L, USER_ID)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(aiService.generateCoverLetter("I know Java", "Developer", "Company 7", JOB_DESCRIPTION, CoverLetterTone.SHORT))
			.thenReturn("A short letter.");

		CoverLetterResponse response = jobApplicationService.generateCoverLetter(USER_ID, 7L, 2L, CoverLetterTone.SHORT);

		assertThat(response.coverLetter()).isEqualTo("A short letter.");
		assertThat(response.tone()).isEqualTo(CoverLetterTone.SHORT);
		assertThat(application.getCoverLetterTone()).isEqualTo(CoverLetterTone.SHORT);
	}

	@Test
	void coverLetterPdfContainsTheStoredLetterAndHasASafeFileName() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setCompanyName("Müller & Söhne GmbH");
		application.setCoverLetter("Dear Hiring Manager, ...");
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application));
		when(pdfTextWriter.write(any(), any())).thenReturn(new byte[] { 1, 2, 3 });

		JobApplicationService.CoverLetterPdf pdf = jobApplicationService.coverLetterPdf(USER_ID, 7L);

		assertThat(pdf.content()).containsExactly(1, 2, 3);
		assertThat(pdf.fileName()).isEqualTo("cover-letter-m-ller-s-hne-gmbh.pdf");
		verify(pdfTextWriter).write("Cover letter - Developer at Müller & Söhne GmbH", "Dear Hiring Manager, ...");
	}

	@Test
	void coverLetterPdfIsRefusedWhenThereIsNoLetterYet() {
		when(jobApplicationRepository.findByIdAndUserId(7L, USER_ID)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));

		assertThatThrownBy(() -> jobApplicationService.coverLetterPdf(USER_ID, 7L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("no cover letter yet");
	}

}
