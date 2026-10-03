package com.jatin.jobassistant.service;

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
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.ResumeRepository;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

	private static final String JOB_DESCRIPTION = "We need a Java Backend Developer with Spring Boot, REST APIs, PostgreSQL, Docker and unit testing experience.";

	@Mock
	private JobApplicationRepository jobApplicationRepository;

	@Mock
	private ResumeRepository resumeRepository;

	@Mock
	private AiService aiService;

	@Mock
	private MatchAnalysisCache matchAnalysisCache;

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
			.create(new CreateApplicationRequest(" Acme ", "Java Developer", "  " + JOB_DESCRIPTION + "\n"));

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.companyName()).isEqualTo("Acme");
		assertThat(response.jobTitle()).isEqualTo("Java Developer");
		assertThat(response.jobDescription()).isEqualTo(JOB_DESCRIPTION);
		assertThat(response.status()).isEqualTo(ApplicationStatus.SAVED);
	}

	@Test
	void listWithoutStatusReturnsAllNewestFirst() {
		when(jobApplicationRepository.findAll(any(Pageable.class))).thenAnswer(invocation -> new PageImpl<>(
				List.of(application(2L, ApplicationStatus.APPLIED), application(1L, ApplicationStatus.SAVED)),
				invocation.getArgument(0), 5));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(null, 0, 2);

		assertThat(response.content()).extracting(ApplicationResponse::id).containsExactly(2L, 1L);
		assertThat(response.page()).isZero();
		assertThat(response.size()).isEqualTo(2);
		assertThat(response.totalElements()).isEqualTo(5);
		assertThat(response.totalPages()).isEqualTo(3);

		ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
		verify(jobApplicationRepository).findAll(pageable.capture());
		assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection())
			.isEqualTo(Sort.Direction.DESC);
	}

	@Test
	void listWithStatusFiltersByStatus() {
		when(jobApplicationRepository.findByStatus(eq(ApplicationStatus.APPLIED), any(Pageable.class)))
			.thenReturn(new PageImpl<>(List.of(application(2L, ApplicationStatus.APPLIED)), PageRequest.of(1, 10),
					11));

		PageResponse<ApplicationResponse> response = jobApplicationService.list(ApplicationStatus.APPLIED, 1, 10);

		assertThat(response.content()).hasSize(1);
		assertThat(response.content().get(0).status()).isEqualTo(ApplicationStatus.APPLIED);
		assertThat(response.page()).isEqualTo(1);
		verify(jobApplicationRepository, never()).findAll(any(Pageable.class));
	}

	@Test
	void getByIdReturnsApplication() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));

		assertThat(jobApplicationService.getById(7L).id()).isEqualTo(7L);
	}

	@Test
	void getByIdThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.getById(99L)).isInstanceOf(ApplicationNotFoundException.class)
			.hasMessageContaining("99");
	}

	@Test
	void updateStatusChangesOnlyTheStatus() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ApplicationResponse response = jobApplicationService.updateStatus(7L, ApplicationStatus.INTERVIEW);

		assertThat(response.status()).isEqualTo(ApplicationStatus.INTERVIEW);
		assertThat(response.companyName()).isEqualTo("Company 7");
	}

	@Test
	void updateStatusThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.updateStatus(99L, ApplicationStatus.APPLIED))
			.isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).save(any());
	}

	@Test
	void deleteRemovesApplication() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));

		jobApplicationService.delete(7L);

		verify(jobApplicationRepository).delete(application);
	}

	@Test
	void deleteThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.delete(99L)).isInstanceOf(ApplicationNotFoundException.class);
		verify(jobApplicationRepository, never()).delete(any());
	}

	@Test
	void analyzeSendsTextsToTheAiAndSavesTheScore() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));
		MatchAnalysisResponse analysis = new MatchAnalysisResponse(80, List.of("Java"), List.of("Spring Boot"),
				List.of("tip 1", "tip 2", "tip 3"));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch("I know Java", JOB_DESCRIPTION)).thenReturn(analysis);

		MatchAnalysisResult result = jobApplicationService.analyze(7L, 2L);

		assertThat(result.analysis()).isEqualTo(analysis);
		assertThat(result.fromCache()).isFalse();
		assertThat(application.getMatchScore()).isEqualTo(80);
		verify(jobApplicationRepository).save(application);
		verify(matchAnalysisCache).put(2L, 7L, JOB_DESCRIPTION, analysis);
	}

	@Test
	void analyzeReturnsTheCachedResultWithoutCallingTheAi() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));
		MatchAnalysisResponse cached = new MatchAnalysisResponse(80, List.of("Java"), List.of("Spring Boot"),
				List.of("tip 1", "tip 2", "tip 3"));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.of(cached));

		MatchAnalysisResult result = jobApplicationService.analyze(7L, 2L);

		assertThat(result.analysis()).isEqualTo(cached);
		assertThat(result.fromCache()).isTrue();
		assertThat(application.getMatchScore()).isEqualTo(80);
		verifyNoInteractions(aiService);
		verify(matchAnalysisCache, never()).put(any(), any(), any(), any());
	}

	@Test
	void analyzeRejectsJobDescriptionShorterThan100Characters() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription("Java and Spring Boot");
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.analyze(7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("at least 100 characters");
		verifyNoInteractions(aiService, matchAnalysisCache);
	}

	@Test
	void generateCoverLetterRejectsJobDescriptionShorterThan100Characters() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription("x".repeat(99));
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("at least 100 characters");
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenApplicationDoesNotExist() {
		when(jobApplicationRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.analyze(99L, 2L))
			.isInstanceOf(ApplicationNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenResumeDoesNotExist() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.analyze(7L, 99L)).isInstanceOf(ResumeNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeThrowsWhenApplicationHasNoJobDescription() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.analyze(7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class)
			.hasMessageContaining("job description");
		verifyNoInteractions(aiService);
	}

	@Test
	void analyzeDoesNotSaveAScoreWhenTheAiFails() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(matchAnalysisCache.get(2L, 7L, JOB_DESCRIPTION)).thenReturn(Optional.empty());
		when(aiService.analyzeMatch(any(), any())).thenThrow(new AiUnavailableException("down", null));

		assertThatThrownBy(() -> jobApplicationService.analyze(7L, 2L)).isInstanceOf(AiUnavailableException.class);
		assertThat(application.getMatchScore()).isNull();
		verify(jobApplicationRepository, never()).save(any());
		// Errors must not be cached, or every later call would get the same error for 24 hours
		verify(matchAnalysisCache, never()).put(any(), any(), any(), any());
	}

	@Test
	void generateCoverLetterSendsDetailsToTheAiAndSavesTheLetter() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(aiService.generateCoverLetter("I know Java", "Developer", "Company 7", JOB_DESCRIPTION))
			.thenReturn("Dear Hiring Manager, ...");

		CoverLetterResponse response = jobApplicationService.generateCoverLetter(7L, 2L);

		assertThat(response.applicationId()).isEqualTo(7L);
		assertThat(response.coverLetter()).isEqualTo("Dear Hiring Manager, ...");
		assertThat(application.getCoverLetter()).isEqualTo("Dear Hiring Manager, ...");
		verify(jobApplicationRepository).save(application);
	}

	@Test
	void generateCoverLetterThrowsWhenResumeDoesNotExist() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(7L, 99L))
			.isInstanceOf(ResumeNotFoundException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void generateCoverLetterThrowsWhenApplicationHasNoJobDescription() {
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application(7L, ApplicationStatus.SAVED)));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(7L, 2L))
			.isInstanceOf(InvalidAnalysisRequestException.class);
		verifyNoInteractions(aiService);
	}

	@Test
	void generateCoverLetterDoesNotSaveWhenTheAiFails() {
		JobApplication application = application(7L, ApplicationStatus.SAVED);
		application.setJobDescription(JOB_DESCRIPTION);
		when(jobApplicationRepository.findById(7L)).thenReturn(Optional.of(application));
		when(resumeRepository.findById(2L)).thenReturn(Optional.of(resume(2L, "I know Java")));
		when(aiService.generateCoverLetter(any(), any(), any(), any())).thenThrow(new AiTimeoutException("slow", null));

		assertThatThrownBy(() -> jobApplicationService.generateCoverLetter(7L, 2L))
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

}
