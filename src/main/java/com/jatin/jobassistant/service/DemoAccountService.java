package com.jatin.jobassistant.service;

import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.repository.ResumeFileRepository;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.ResumeFile;
import com.jatin.jobassistant.entity.CoverLetterTone;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.temporal.ChronoUnit;
import java.time.Clock;
import java.sql.Timestamp;
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

	static final String DEMO_NAME = "Alex";

	private final UserRepository userRepository;

	private final ResumeRepository resumeRepository;

	private final ResumeFileRepository resumeFileRepository;

	private final JobApplicationRepository applicationRepository;

	private final MatchAnalysisRepository analysisRepository;

	private final StatusHistoryRepository statusHistoryRepository;

	private final PasswordEncoder passwordEncoder;

	private final PdfTextWriter pdfTextWriter;

	private final TransactionTemplate transaction;

	private final JdbcTemplate jdbc;

	private final Clock clock;

	private final boolean enabled;

	public DemoAccountService(UserRepository userRepository, ResumeRepository resumeRepository,
			ResumeFileRepository resumeFileRepository, JobApplicationRepository applicationRepository,
			MatchAnalysisRepository analysisRepository, StatusHistoryRepository statusHistoryRepository,
			PasswordEncoder passwordEncoder, PdfTextWriter pdfTextWriter, TransactionTemplate transaction,
			JdbcTemplate jdbc, Clock clock, @Value("${demo.enabled:true}") boolean enabled) {
		this.userRepository = userRepository;
		this.resumeRepository = resumeRepository;
		this.resumeFileRepository = resumeFileRepository;
		this.applicationRepository = applicationRepository;
		this.analysisRepository = analysisRepository;
		this.statusHistoryRepository = statusHistoryRepository;
		this.passwordEncoder = passwordEncoder;
		this.pdfTextWriter = pdfTextWriter;
		this.transaction = transaction;
		this.jdbc = jdbc;
		this.clock = clock;
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
			// A demo user created before names existed gets its sample name now
			if (demo.getName() == null) {
				demo.setName(DEMO_NAME);
				userRepository.save(demo);
			}
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
		demo.setName(DEMO_NAME);
		return userRepository.save(demo);
	}

	// One status change of a sample application, a number of days before the reset
	private record Step(ApplicationStatus status, int daysAgo) {
	}

	// The sample data is dated relative to the day of the reset, so the demo always looks like a job search that
	// is going on right now: something to follow up, an interview in two days, activity over the last weeks.
	private void seed(Long userId) {
		Instant now = clock.instant();
		Long resumeId = resume(userId, "sample-resume-alex-example.pdf", SAMPLE_RESUME, now, 41);
		Long shortResumeId = resume(userId, "sample-resume-short-version.pdf", SAMPLE_RESUME_SHORT, now, 58);

		application(userId, resumeId, now, 20, "Nordlicht Software", "Backend Developer",
				List.of(new Step(ApplicationStatus.APPLIED, 18), new Step(ApplicationStatus.INTERVIEW, 6)),
				"We are looking for a backend developer for our logistics platform. You build REST APIs with Java and Spring Boot, "
						+ "store data in PostgreSQL and ship your services in Docker containers to our Kubernetes cluster. "
						+ "You write tests for your code and take part in code reviews.",
				82, List.of("Java", "Spring Boot", "PostgreSQL", "Docker", "REST APIs"), List.of("Kubernetes"),
				List.of("Name the Docker work in your thesis project in the first third of the resume.",
						"Add one sentence on how you tested your REST APIs.",
						"Kubernetes is asked for: mention any course or tutorial you did, or plan to do."),
				SAMPLE_COVER_LETTER,
				"Second round with the team lead. Prepare: the booking tool project, how the Docker images are built, questions about the on-call rotation.",
				now.truncatedTo(ChronoUnit.DAYS).plus(2, ChronoUnit.DAYS).plus(10, ChronoUnit.HOURS));
		application(userId, resumeId, now, 40, "Tintenfass Verlag", "Junior Java Developer",
				List.of(new Step(ApplicationStatus.APPLIED, 38), new Step(ApplicationStatus.INTERVIEW, 25),
						new Step(ApplicationStatus.OFFER, 10)),
				"Our small team maintains the publishing system of the house. You work with Java, Spring Boot and SQL, "
						+ "fix bugs, write unit tests with JUnit and learn from experienced colleagues. Git is used every day.",
				88, List.of("Java", "Spring Boot", "SQL", "JUnit", "Git"), List.of("Maven multi-module builds"),
				List.of("Put the JUnit experience next to the project it belongs to.",
						"Say how large the team of your working-student job was.",
						"Shorten the list of courses; the projects say more."),
				null, "Offer received by email. Answer is due by the end of next week.", null);
		application(userId, resumeId, now, 3, "Hafenwerk Digital", "Full Stack Developer", List.of(),
				"You develop features from the database to the browser: Java services, a React and TypeScript frontend, "
						+ "PostgreSQL, and deployments on AWS with Kubernetes. GraphQL is used between frontend and backend.",
				74, List.of("Java", "React", "TypeScript", "PostgreSQL"), List.of("GraphQL", "AWS", "Kubernetes"),
				List.of("Describe what you built with React, not only that you used it.",
						"The posting asks for AWS: say which cloud services you have touched, even in a course.",
						"Move the full stack project above the backend-only ones for this application."),
				null, null, null);
		application(userId, resumeId, now, 15, "Kornfeld Analytics", "Data Engineer",
				List.of(new Step(ApplicationStatus.APPLIED, 12)),
				"You build data pipelines with Python and SQL, schedule them with Apache Airflow and process large data sets "
						+ "with Apache Spark. Experience with Git and code reviews is expected.",
				61, List.of("Python", "SQL", "Git"), List.of("Apache Spark", "Apache Airflow"),
				List.of("Your Python work is listed last: move it up for a data role.",
						"Give the size of the data you worked with in the statistics course project.",
						"Spark and Airflow are missing: a small pipeline project would close the gap."),
				null, null, null);
		application(userId, resumeId, now, 9, "Blaupause GmbH", "Software Engineer",
				List.of(new Step(ApplicationStatus.APPLIED, 8)),
				"You work on our planning software for architects: Java and Spring Boot services, PostgreSQL, a React frontend, "
						+ "and automated builds with GitHub Actions. You take part in code reviews and write unit tests.",
				79, List.of("Java", "Spring Boot", "PostgreSQL", "React", "Git"), List.of("GitHub Actions"),
				List.of("Mention the build pipeline of your course planner project, if it had one.",
						"Put React next to Spring Boot in the skills line: this job asks for both.",
						"Add one result of your working-student job, in plain words."),
				null, null, null);
		application(userId, shortResumeId, now, 30, "Lumen Labs", "iOS Developer",
				List.of(new Step(ApplicationStatus.APPLIED, 29), new Step(ApplicationStatus.REJECTED, 21)),
				"You develop our iOS app with Swift and SwiftUI in Xcode, talk to REST APIs and publish to the App Store.",
				34, List.of("Git", "REST APIs"), List.of("Swift", "SwiftUI", "Xcode"),
				List.of("The resume shows no mobile work: this role needs a different profile.",
						"If you want to move to iOS, build and publish one small app first.",
						"Your REST API experience is relevant: describe it from the client side as well."),
				null, "Rejected: they were looking for someone with a published app.", null);
		application(userId, shortResumeId, now, 55, "Sonnenhof Systems", "Java Developer",
				List.of(new Step(ApplicationStatus.APPLIED, 54), new Step(ApplicationStatus.REJECTED, 45)),
				"You extend our warehouse software: Java and Spring Boot, Oracle databases, message queues with Kafka, "
						+ "and deployments with Jenkins on Linux servers.",
				58, List.of("Java", "Spring Boot", "SQL"), List.of("Oracle", "Kafka", "Jenkins"),
				List.of("The short resume leaves out your projects: use the long version for jobs like this.",
						"Say which SQL database you used; the posting asks for Oracle.",
						"Mention how your services were built and deployed."),
				null, null, null);
		// One application that was saved but not analyzed yet, so the demo also shows that state
		application(userId, null, now, 1, "Bergwind Cloud", "DevOps Engineer", List.of(),
				"You run our build pipelines and our Kubernetes clusters, write infrastructure as code with Terraform "
						+ "and help the development teams to ship safely.",
				null, List.of(), List.of(), List.of(), null, null, null);
	}

	// Stores a sample resume together with a real PDF of its text, so the preview picture works in the demo too
	private Long resume(Long userId, String fileName, String text, Instant now, int daysAgo) {
		Resume resume = new Resume();
		resume.setUserId(userId);
		resume.setFileName(fileName);
		resume.setExtractedText(text);
		resume.setHasFile(true);
		Long id = resumeRepository.saveAndFlush(resume).getId();
		resumeFileRepository.save(new ResumeFile(id, pdfTextWriter.write(fileName, text)));
		// The creation date is set by Hibernate, so the earlier date is written afterwards
		jdbc.update("update resume set created_at = ? where id = ?", Timestamp.from(now.minus(daysAgo, ChronoUnit.DAYS)), id);
		return id;
	}

	private void application(Long userId, Long resumeId, Instant now, int createdDaysAgo, String company, String title,
			List<Step> steps, String description, Integer score, List<String> matching, List<String> missing,
			List<String> tips, String coverLetter, String notes, Instant interviewAt) {
		Instant createdAt = now.minus(createdDaysAgo, ChronoUnit.DAYS);
		Instant lastChange = steps.isEmpty() ? createdAt : now.minus(steps.getLast().daysAgo(), ChronoUnit.DAYS);
		JobApplication application = new JobApplication();
		application.setUserId(userId);
		application.setCompanyName(company);
		application.setJobTitle(title);
		application.setJobDescription(description);
		application.setStatus(steps.isEmpty() ? ApplicationStatus.SAVED : steps.getLast().status());
		application.setStatusChangedAt(lastChange);
		application.setMatchScore(score);
		application.setCoverLetter(coverLetter);
		application.setCoverLetterTone(coverLetter == null ? null : CoverLetterTone.FORMAL);
		application.setNotes(notes);
		application.setInterviewAt(interviewAt);
		Long applicationId = applicationRepository.saveAndFlush(application).getId();
		jdbc.update("update job_application set created_at = ?, updated_at = ? where id = ?", Timestamp.from(createdAt),
				Timestamp.from(lastChange), applicationId);

		// The status timeline: created, then every step
		statusHistoryRepository.save(new StatusHistory(applicationId, null, ApplicationStatus.SAVED, createdAt));
		ApplicationStatus before = ApplicationStatus.SAVED;
		for (Step step : steps) {
			statusHistoryRepository.save(new StatusHistory(applicationId, before, step.status(),
					now.minus(step.daysAgo(), ChronoUnit.DAYS)));
			before = step.status();
		}

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
		// Analyzed on the day it was saved
		analysis.setAnalyzedAt(createdAt.plus(2, ChronoUnit.HOURS));
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
