package com.jatin.jobassistant.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.entity.MatchAnalysis;
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.JobApplicationRepository;
import com.jatin.jobassistant.repository.MatchAnalysisRepository;
import com.jatin.jobassistant.repository.ResumeRepository;
import com.jatin.jobassistant.repository.UserRepository;

// The shared demo account behind "Try with demo account".
// It is created when the application starts, filled with made-up sample data, and put back to that
// sample data every night, so whatever visitors change during the day is gone the next morning.
@Service
public class DemoAccountService {

	public static final String DEMO_EMAIL = "demo@jobassistant.example";

	// Shown wherever the app names the AI model of an analysis, so nobody takes the sample for a real AI answer
	static final String SAMPLE_MODEL_NAME = "sample data (not an AI result)";

	private static final Logger log = LoggerFactory.getLogger(DemoAccountService.class);

	private final UserRepository userRepository;

	private final ResumeRepository resumeRepository;

	private final JobApplicationRepository applicationRepository;

	private final MatchAnalysisRepository analysisRepository;

	private final PasswordEncoder passwordEncoder;

	private final TransactionTemplate transaction;

	private final boolean enabled;

	public DemoAccountService(UserRepository userRepository, ResumeRepository resumeRepository,
			JobApplicationRepository applicationRepository, MatchAnalysisRepository analysisRepository,
			PasswordEncoder passwordEncoder, TransactionTemplate transaction,
			@Value("${demo.enabled:true}") boolean enabled) {
		this.userRepository = userRepository;
		this.resumeRepository = resumeRepository;
		this.applicationRepository = applicationRepository;
		this.analysisRepository = analysisRepository;
		this.passwordEncoder = passwordEncoder;
		this.transaction = transaction;
		this.enabled = enabled;
	}

	// The seed: runs once the application has started
	@EventListener(ApplicationReadyEvent.class)
	public void seedOnStartup() {
		reset();
	}

	// The nightly reset (the time is set with demo.reset-cron)
	@Scheduled(cron = "${demo.reset-cron:0 0 3 * * *}")
	public void nightlyReset() {
		reset();
	}

	// Creates the demo user if it is missing, removes everything it owns, and stores the sample data again.
	// All of it happens in one transaction: visitors see either the old data or the complete new data.
	public void reset() {
		if (!enabled) {
			return;
		}
		transaction.executeWithoutResult(status -> {
			User demo = userRepository.findByDemoTrue().orElseGet(this::createDemoUser);
			applicationRepository.deleteByUserId(demo.getId());
			resumeRepository.deleteByUserId(demo.getId());
			seed(demo.getId());
		});
		log.info("The demo account was reset to its sample data");
	}

	private User createDemoUser() {
		User demo = new User();
		demo.setEmail(DEMO_EMAIL);
		// A random password that is thrown away at once: nobody can log in to this account with a password.
		// Visitors enter through POST /api/auth/demo instead.
		demo.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
		demo.setDemo(true);
		return userRepository.save(demo);
	}

	private void seed(Long userId) {
		Resume resume = new Resume();
		resume.setUserId(userId);
		resume.setFileName("sample-resume-alex-example.pdf");
		resume.setExtractedText(SAMPLE_RESUME);
		Long resumeId = resumeRepository.save(resume).getId();

		Resume older = new Resume();
		older.setUserId(userId);
		older.setFileName("sample-resume-short-version.pdf");
		older.setExtractedText(SAMPLE_RESUME_SHORT);
		resumeRepository.save(older);

		application(userId, resumeId, "Nordlicht Software", "Backend Developer", ApplicationStatus.INTERVIEW,
				"We are looking for a backend developer for our logistics platform. You build REST APIs with Java and Spring Boot, "
						+ "store data in PostgreSQL and ship your services in Docker containers to our Kubernetes cluster. "
						+ "You write tests for your code and take part in code reviews.",
				82, List.of("Java", "Spring Boot", "PostgreSQL", "Docker", "REST APIs"), List.of("Kubernetes"),
				List.of("Name the Docker work in your thesis project in the first third of the resume.",
						"Add one sentence on how you tested your REST APIs.",
						"Kubernetes is asked for: mention any course or tutorial you did, or plan to do."),
				SAMPLE_COVER_LETTER);
		application(userId, resumeId, "Tintenfass Verlag", "Junior Java Developer", ApplicationStatus.OFFER,
				"Our small team maintains the publishing system of the house. You work with Java, Spring Boot and SQL, "
						+ "fix bugs, write unit tests with JUnit and learn from experienced colleagues. Git is used every day.",
				88, List.of("Java", "Spring Boot", "SQL", "JUnit", "Git"), List.of("Maven multi-module builds"),
				List.of("Put the JUnit experience next to the project it belongs to.",
						"Say how large the team of your working-student job was.",
						"Shorten the list of courses; the projects say more."),
				null);
		application(userId, resumeId, "Hafenwerk Digital", "Full Stack Developer", ApplicationStatus.SAVED,
				"You develop features from the database to the browser: Java services, a React and TypeScript frontend, "
						+ "PostgreSQL, and deployments on AWS with Kubernetes. GraphQL is used between frontend and backend.",
				74, List.of("Java", "React", "TypeScript", "PostgreSQL"), List.of("GraphQL", "AWS", "Kubernetes"),
				List.of("Describe what you built with React, not only that you used it.",
						"The posting asks for AWS: say which cloud services you have touched, even in a course.",
						"Move the full stack project above the backend-only ones for this application."),
				null);
		application(userId, resumeId, "Kornfeld Analytics", "Data Engineer", ApplicationStatus.APPLIED,
				"You build data pipelines with Python and SQL, schedule them with Apache Airflow and process large data sets "
						+ "with Apache Spark. Experience with Git and code reviews is expected.",
				61, List.of("Python", "SQL", "Git"), List.of("Apache Spark", "Apache Airflow"),
				List.of("Your Python work is listed last: move it up for a data role.",
						"Give the size of the data you worked with in the statistics course project.",
						"Spark and Airflow are missing: a small pipeline project would close the gap."),
				null);
		application(userId, resumeId, "Lumen Labs", "iOS Developer", ApplicationStatus.REJECTED,
				"You develop our iOS app with Swift and SwiftUI in Xcode, talk to REST APIs and publish to the App Store.",
				34, List.of("Git", "REST APIs"), List.of("Swift", "SwiftUI", "Xcode"),
				List.of("The resume shows no mobile work: this role needs a different profile.",
						"If you want to move to iOS, build and publish one small app first.",
						"Your REST API experience is relevant: describe it from the client side as well."),
				null);
		// One application that was saved but not analyzed yet, so the demo also shows that state
		application(userId, null, "Bergwind Cloud", "DevOps Engineer", ApplicationStatus.SAVED,
				"You run our build pipelines and our Kubernetes clusters, write infrastructure as code with Terraform "
						+ "and help the development teams to ship safely.",
				null, List.of(), List.of(), List.of(), null);
	}

	private void application(Long userId, Long resumeId, String company, String title, ApplicationStatus status,
			String description, Integer score, List<String> matching, List<String> missing, List<String> tips,
			String coverLetter) {
		JobApplication application = new JobApplication();
		application.setUserId(userId);
		application.setCompanyName(company);
		application.setJobTitle(title);
		application.setJobDescription(description);
		application.setStatus(status);
		application.setMatchScore(score);
		application.setCoverLetter(coverLetter);
		Long applicationId = applicationRepository.save(application).getId();
		if (score == null) {
			return;
		}
		MatchAnalysis analysis = new MatchAnalysis();
		analysis.setApplicationId(applicationId);
		analysis.setResumeId(resumeId);
		analysis.setMatchScore(score);
		analysis.setMatchingSkills(matching);
		analysis.setMissingSkills(missing);
		analysis.setResumeTips(tips);
		analysis.setModelName(SAMPLE_MODEL_NAME);
		analysis.setAnalyzedAt(Instant.now());
		analysisRepository.save(analysis);
	}

	// A made-up person. Nothing here describes a real applicant.
	private static final String SAMPLE_RESUME = """
			Alex Example (sample resume, made up for the demo account)
			M.Sc. student, Software Engineering

			Experience
			Working student, backend development (18 months)
			- Built REST APIs with Java and Spring Boot for an internal booking tool
			- Wrote SQL queries and database migrations for PostgreSQL
			- Packaged services with Docker and wrote unit tests with JUnit

			Projects
			- Course planner: React and TypeScript frontend with a Spring Boot backend
			- Statistics course project: data cleaning and charts with Python

			Skills
			Java, Spring Boot, SQL, PostgreSQL, Docker, React, TypeScript, Python, Git, JUnit, REST APIs

			Education
			B.Sc. Computer Science
			""";

	private static final String SAMPLE_RESUME_SHORT = """
			Alex Example (sample resume, short version, made up for the demo account)
			M.Sc. student, Software Engineering

			Skills
			Java, Spring Boot, SQL, Docker, Git

			Experience
			Working student, backend development (18 months)
			""";

	private static final String SAMPLE_COVER_LETTER = """
			Dear hiring team at Nordlicht Software,

			I am applying for the Backend Developer position. In my working-student job I built REST APIs with Java \
			and Spring Boot for an internal booking tool, wrote the PostgreSQL migrations for it, and packaged the \
			services with Docker.

			Your posting also asks for Kubernetes. I have not worked with it in a project yet, and I would like to \
			learn it on the job.

			I would be glad to tell you more in an interview.

			Kind regards,
			Alex Example

			(Sample letter of the demo account, not written by the AI.)
			""";

}
