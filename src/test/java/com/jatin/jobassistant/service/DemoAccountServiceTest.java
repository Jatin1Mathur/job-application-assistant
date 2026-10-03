package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DemoAccountServiceTest {

	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

	// Runs the callback at once; there is no real database in this test
	private final TransactionTemplate transaction = new TransactionTemplate(mock(PlatformTransactionManager.class));

	@Mock
	private UserRepository userRepository;

	@Mock
	private ResumeRepository resumeRepository;

	@Mock
	private JobApplicationRepository applicationRepository;

	@Mock
	private MatchAnalysisRepository analysisRepository;

	private final AtomicLong ids = new AtomicLong(100);

	@BeforeEach
	void setUp() {
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
			User user = invocation.getArgument(0);
			user.setId(7L);
			return user;
		});
		when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> {
			Resume resume = invocation.getArgument(0);
			resume.setId(ids.incrementAndGet());
			return resume;
		});
		when(applicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> {
			JobApplication application = invocation.getArgument(0);
			application.setId(ids.incrementAndGet());
			return application;
		});
	}

	private DemoAccountService service(boolean enabled) {
		return new DemoAccountService(userRepository, resumeRepository, applicationRepository, analysisRepository,
				passwordEncoder, transaction, enabled);
	}

	private User existingDemoUser() {
		User demo = new User();
		demo.setId(7L);
		demo.setEmail(DemoAccountService.DEMO_EMAIL);
		demo.setPasswordHash("existing-hash");
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
		order.verify(resumeRepository, times(2)).save(any(Resume.class));
		order.verify(applicationRepository, times(6)).save(any(JobApplication.class));
		// The demo user itself is kept: it is never created twice and never changed
		verify(userRepository, never()).save(any(User.class));
	}

	@Test
	void sampleDataBelongsToTheDemoUserAndIsLabelledAsSampleData() {
		when(userRepository.findByDemoTrue()).thenReturn(Optional.of(existingDemoUser()));

		service(true).reset();

		ArgumentCaptor<JobApplication> applications = ArgumentCaptor.forClass(JobApplication.class);
		verify(applicationRepository, times(6)).save(applications.capture());
		assertThat(applications.getAllValues()).allSatisfy(application -> assertThat(application.getUserId()).isEqualTo(7L));
		// One application is left without an analysis on purpose
		assertThat(applications.getAllValues()).filteredOn(application -> application.getMatchScore() == null).hasSize(1);

		ArgumentCaptor<MatchAnalysis> analyses = ArgumentCaptor.forClass(MatchAnalysis.class);
		verify(analysisRepository, times(5)).save(analyses.capture());
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
	}

	@Test
	void switchedOffDoesNothing() {
		service(false).reset();

		verifyNoInteractions(userRepository, resumeRepository, applicationRepository, analysisRepository);
	}

}
