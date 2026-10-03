package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.entity.ResumeFile;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.ResumeFileRepository;
import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DemoAccountServiceTest {

	private static final Instant NOW = Instant.parse("2026-10-03T10:00:00Z");

	private static final int SAMPLE_APPLICATIONS = 8;

	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

	// Runs the callback at once; there is no real database in this test
	private final TransactionTemplate transaction = new TransactionTemplate(mock(PlatformTransactionManager.class));

	@Mock
	private UserRepository userRepository;

	@Mock
	private ResumeRepository resumeRepository;

	@Mock
	private ResumeFileRepository resumeFileRepository;

	@Mock
	private JobApplicationRepository applicationRepository;

	@Mock
	private MatchAnalysisRepository analysisRepository;

	@Mock
	private StatusHistoryRepository statusHistoryRepository;

	@Mock
	private JdbcTemplate jdbc;

	private final AtomicLong ids = new AtomicLong(100);

	@BeforeEach
	void setUp() {
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
			User user = invocation.getArgument(0);
			user.setId(7L);
			return user;
		});
		when(resumeRepository.saveAndFlush(any(Resume.class))).thenAnswer(invocation -> {
			Resume resume = invocation.getArgument(0);
			resume.setId(ids.incrementAndGet());
			return resume;
		});
		when(applicationRepository.saveAndFlush(any(JobApplication.class))).thenAnswer(invocation -> {
			JobApplication application = invocation.getArgument(0);
			application.setId(ids.incrementAndGet());
			return application;
		});
	}

	private DemoAccountService service(boolean enabled) {
		return new DemoAccountService(userRepository, resumeRepository, resumeFileRepository, applicationRepository,
				analysisRepository, statusHistoryRepository, passwordEncoder, new PdfTextWriter(), transaction, jdbc,
				Clock.fixed(NOW, ZoneOffset.UTC), enabled);
	}

	private User existingDemoUser() {
		User demo = new User();
		demo.setId(7L);
		demo.setEmail(DemoAccountService.DEMO_EMAIL);
		demo.setPasswordHash("existing-hash");
		demo.setName(DemoAccountService.DEMO_NAME);
		demo.setDemo(true);
		return demo;
	}

	@Test
	void firstStartCreatesTheDemoUserWithAPasswordNobodyKnows() {
		when(userRepository.findByDemoTrue()).thenReturn(Optional.empty());

		service(true).seedOnStartup();

		ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
		verify(userRepository).save(saved.capture());
		assertThat(saved.getValue().isDemo()).isTrue();
		assertThat(saved.getValue().getEmail()).isEqualTo(DemoAccountService.DEMO_EMAIL);
		assertThat(saved.getValue().getName()).isEqualTo("Alex");
		// A BCrypt hash of a random value, not of anything written in the code
		assertThat(saved.getValue().getPasswordHash()).startsWith("$2");
		assertThat(passwordEncoder.matches("demo", saved.getValue().getPasswordHash())).isFalse();
	}

	@Test
	void resetRemovesWhatVisitorsChangedBeforeItStoresTheSampleDataAgain() {
		when(userRepository.findByDemoTrue()).thenReturn(Optional.of(existingDemoUser()));

		service(true).nightlyReset();

		InOrder order = inOrder(applicationRepository, resumeRepository);
		order.verify(applicationRepository).deleteByUserId(7L);
		order.verify(resumeRepository).deleteByUserId(7L);
		order.verify(resumeRepository, times(2)).saveAndFlush(any(Resume.class));
		order.verify(applicationRepository, times(SAMPLE_APPLICATIONS)).saveAndFlush(any(JobApplication.class));
		// The demo user itself is kept: it is never created twice and never changed
		verify(userRepository, never()).save(any(User.class));
	}

	@Test
	void sampleDataBelongsToTheDemoUserAndIsLabelledAsSampleData() {
		when(userRepository.findByDemoTrue()).thenReturn(Optional.of(existingDemoUser()));

		service(true).reset();

		ArgumentCaptor<JobApplication> applications = ArgumentCaptor.forClass(JobApplication.class);
		verify(applicationRepository, times(SAMPLE_APPLICATIONS)).saveAndFlush(applications.capture());
		assertThat(applications.getAllValues()).allSatisfy(application -> assertThat(application.getUserId()).isEqualTo(7L));
		// One application is left without an analysis on purpose
		assertThat(applications.getAllValues()).filteredOn(application -> application.getMatchScore() == null).hasSize(1);

		ArgumentCaptor<MatchAnalysis> analyses = ArgumentCaptor.forClass(MatchAnalysis.class);
		verify(analysisRepository, times(SAMPLE_APPLICATIONS - 1)).save(analyses.capture());
		assertThat(analyses.getAllValues()).allSatisfy(analysis -> {
			assertThat(analysis.getModelName()).isEqualTo(DemoAccountService.SAMPLE_MODEL_NAME);
			assertThat(analysis.getResumeTips()).hasSize(3);
			assertThat(analysis.getMatchScore()).isBetween(0, 100);
		});
		// The score on the application and the score of its analysis are the same number
		List<Integer> applicationScores = applications.getAllValues().stream().map(JobApplication::getMatchScore)
			.filter(score -> score != null).toList();
		assertThat(analyses.getAllValues().stream().map(MatchAnalysis::getMatchScore).toList())
			.isEqualTo(applicationScores);
		// Both sample resumes were used, so "average score per resume" has something to compare
		assertThat(analyses.getAllValues().stream().map(MatchAnalysis::getResumeId).distinct()).hasSize(2);
	}

	@Test
	void everyNewFeatureHasSampleData() {
		when(userRepository.findByDemoTrue()).thenReturn(Optional.of(existingDemoUser()));

		service(true).reset();

		ArgumentCaptor<JobApplication> applications = ArgumentCaptor.forClass(JobApplication.class);
		verify(applicationRepository, times(SAMPLE_APPLICATIONS)).saveAndFlush(applications.capture());
		List<JobApplication> saved = applications.getAllValues();
		// Notes, and an interview within the next three days (a "next action" on the dashboard)
		assertThat(saved).filteredOn(application -> application.getNotes() != null).hasSizeGreaterThanOrEqualTo(2);
		assertThat(saved).filteredOn(application -> application.getInterviewAt() != null)
			.singleElement()
			.satisfies(application -> assertThat(application.getInterviewAt()).isBetween(NOW,
					NOW.plus(3, ChronoUnit.DAYS)));
		// Something that was sent more than seven days ago and got no reply (a "follow up" action)
		assertThat(saved).anySatisfy(application -> {
			assertThat(application.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
			assertThat(application.getStatusChangedAt()).isBefore(NOW.minus(7, ChronoUnit.DAYS));
		});
		// Every status appears, so the board and the funnel are filled
		assertThat(saved.stream().map(JobApplication::getStatus).distinct()).containsExactlyInAnyOrder(ApplicationStatus.values());

		// The status timeline: one "created" line per application plus every step after it
		ArgumentCaptor<StatusHistory> history = ArgumentCaptor.forClass(StatusHistory.class);
		verify(statusHistoryRepository, atLeastOnce()).save(history.capture());
		assertThat(history.getAllValues()).filteredOn(change -> change.getFromStatus() == null).hasSize(SAMPLE_APPLICATIONS);
		assertThat(history.getAllValues()).hasSizeGreaterThan(SAMPLE_APPLICATIONS);
		assertThat(history.getAllValues()).allSatisfy(change -> assertThat(change.getChangedAt()).isBeforeOrEqualTo(NOW));

		// A real PDF for each sample resume, so the preview picture works
		ArgumentCaptor<ResumeFile> files = ArgumentCaptor.forClass(ResumeFile.class);
		verify(resumeFileRepository, times(2)).save(files.capture());
		assertThat(files.getAllValues()).allSatisfy(file -> assertThat(new String(file.getData(), 0, 5)).isEqualTo("%PDF-"));

		// The dates are written back, because Hibernate sets "created" itself
		verify(jdbc, times(SAMPLE_APPLICATIONS)).update(contains("update job_application set created_at"), any(), any(), any());
		verify(jdbc, times(2)).update(contains("update resume set created_at"), any(Timestamp.class), any(Long.class));
	}

	@Test
	void aDemoUserFromBeforeNamesExistedGetsItsSampleName() {
		User old = existingDemoUser();
		old.setName(null);
		when(userRepository.findByDemoTrue()).thenReturn(Optional.of(old));

		service(true).reset();

		assertThat(old.getName()).isEqualTo("Alex");
		verify(userRepository).save(old);
	}

	@Test
	void switchedOffDoesNothing() {
		service(false).reset();

		verifyNoInteractions(userRepository, resumeRepository, applicationRepository, analysisRepository);
	}

}
