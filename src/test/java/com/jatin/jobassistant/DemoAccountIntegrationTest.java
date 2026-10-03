package com.jatin.jobassistant;

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

	private User demo() {
		return userRepository.findByDemoTrue().orElseThrow();
	}

	@Test
	void theSeedCreatesTheDemoUserWithItsSampleData() {
		assertThat(demo().getEmail()).isEqualTo(DemoAccountService.DEMO_EMAIL);
		assertThat(applicationRepository.findByUserId(demo().getId(), Pageable.unpaged()).getTotalElements()).isEqualTo(6);
		assertThat(resumeRepository.findByUserIdOrderByCreatedAtDescIdDesc(demo().getId())).hasSize(2);
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

		assertThat(applicationRepository.findByUserId(id, Pageable.unpaged()).getTotalElements()).isEqualTo(6);
		// Still the same user row: a reset never creates a second demo user
		assertThat(demo().getId()).isEqualTo(id);
	}

}
