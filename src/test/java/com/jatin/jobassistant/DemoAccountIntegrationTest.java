package com.jatin.jobassistant;

import com.jatin.jobassistant.service.JobApplicationService;
import com.jatin.jobassistant.service.ResumeService;
import com.jatin.jobassistant.service.InsightsService;
import com.jatin.jobassistant.service.DashboardService;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.dto.InsightsResponse;
import com.jatin.jobassistant.dto.DashboardResponse.ActionType;
import com.jatin.jobassistant.dto.DashboardResponse;
import com.jatin.jobassistant.dto.ApplicationResponse;
import java.time.temporal.ChronoUnit;
import java.time.ZoneOffset;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;

import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.UserRepository;
import com.jatin.jobassistant.service.DemoAccountService;

// Runs against the real PostgreSQL from docker-compose, because the protection of the demo user is a
// database trigger (migration V5)
@SpringBootTest
class DemoAccountIntegrationTest {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private JobApplicationRepository applicationRepository;

	@Autowired
	private ResumeRepository resumeRepository;

	@Autowired
	private DemoAccountService demoAccountService;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private DashboardService dashboardService;

	@Autowired
	private InsightsService insightsService;

	@Autowired
	private ResumeService resumeService;

	@Autowired
	private JobApplicationService jobApplicationService;

	private User demo() {
		return userRepository.findByDemoTrue().orElseThrow();
	}

	@Test
	void theSeedCreatesTheDemoUserWithItsSampleData() {
		assertThat(demo().getEmail()).isEqualTo(DemoAccountService.DEMO_EMAIL);
		assertThat(applicationRepository.findByUserId(demo().getId(), Pageable.unpaged()).getTotalElements()).isEqualTo(8);
		assertThat(resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(demo().getId())).hasSize(2);
		assertThat(demo().getName()).isEqualTo("Alex");
	}

	@Test
	void theDatabaseRefusesToDeleteTheDemoUser() {
		Long id = demo().getId();

		assertThatThrownBy(() -> jdbc.update("delete from users where id = ?", id))
			.hasMessageContaining("The demo user cannot be deleted");
		assertThat(userRepository.findById(id)).isPresent();
	}

	@Test
	void theDatabaseRefusesToChangeThePasswordOfTheDemoUser() {
		User before = demo();

		assertThatThrownBy(() -> jdbc.update("update users set password_hash = 'another-hash' where id = ?", before.getId()))
			.hasMessageContaining("cannot be changed");
		assertThat(demo().getPasswordHash()).isEqualTo(before.getPasswordHash());
	}

	@Test
	void resetPutsBackTheSampleDataAfterAVisitorChangedIt() {
		Long id = demo().getId();
		jdbc.update("delete from job_application where user_id = ?", id);
		assertThat(applicationRepository.findByUserId(id, Pageable.unpaged()).getTotalElements()).isZero();

		demoAccountService.reset();

		assertThat(applicationRepository.findByUserId(id, Pageable.unpaged()).getTotalElements()).isEqualTo(8);
		// Still the same user row: a reset never creates a second demo user
		assertThat(demo().getId()).isEqualTo(id);
	}

	@Test
	void theSampleDataFillsTheDashboardAndTheInsights() {
		Long id = demo().getId();
		DashboardResponse dashboard = dashboardService.getDashboard(id, ZoneOffset.UTC);

		assertThat(dashboard.name()).isEqualTo("Alex");
		assertThat(dashboard.totalApplications()).isEqualTo(8);
		// Sent: 6 of 8. Interviews: Nordlicht and Tintenfass.
		assertThat(dashboard.appliedApplications()).isEqualTo(6);
		assertThat(dashboard.interviewApplications()).isEqualTo(2);
		assertThat(dashboard.interviewRate()).isEqualTo(33.3);
		// The sample applications were created on different days of the last weeks, not all today
		assertThat(dashboard.days().stream().filter(day -> day.applications() > 0).count()).isGreaterThanOrEqualTo(6);
		assertThat(dashboard.nextActions()).extracting(action -> action.type())
			.contains(ActionType.INTERVIEW_SOON, ActionType.FOLLOW_UP, ActionType.ANALYZE);

		InsightsResponse insights = insightsService.getInsights(id);
		assertThat(insights.funnel()).extracting(stage -> stage.applications()).containsExactly(8L, 6L, 2L, 1L);
		assertThat(insights.scoreByWeek()).hasSizeGreaterThanOrEqualTo(3);
		assertThat(insights.skillCategories()).isNotEmpty();
		assertThat(insights.scoreByResume()).hasSize(2);
		assertThat(insights.scoreByResume().getFirst().fileName()).isEqualTo("sample-resume-alex-example.pdf");
	}

	@Test
	void theSampleResumesHaveARealPdfAndTheSampleApplicationHasATimeline() {
		Long id = demo().getId();
		Long resumeId = resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(id).getFirst().getId();

		assertThat(new String(resumeService.getFile(id, resumeId).data(), 0, 5)).isEqualTo("%PDF-");
		assertThat(resumeService.list(id).getFirst().detectedSkills()).contains("Java", "Spring Boot", "Docker");

		Long nordlicht = applicationRepository.findByUserId(id)
			.stream()
			.filter(application -> application.getCompanyName().equals("Nordlicht Software"))
			.findFirst()
			.orElseThrow()
			.getId();
		ApplicationResponse application = jobApplicationService.getById(id, nordlicht);
		assertThat(application.statusHistory()).extracting(change -> change.toStatus())
			.containsExactly(ApplicationStatus.SAVED, ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEW);
		assertThat(application.notes()).isNotBlank();
		assertThat(application.interviewAt()).isAfter(Instant.now());
		// The dates were written back: created about 20 days ago, not today
		assertThat(application.createdAt()).isBefore(Instant.now().minus(19, ChronoUnit.DAYS));
	}

}
