package com.jatin.jobassistant.service;

import com.jatin.jobassistant.repository.StatusHistoryRepository;
import com.jatin.jobassistant.entity.StatusHistory;
import com.jatin.jobassistant.entity.CoverLetterTone;
import com.jatin.jobassistant.dto.UpdateDetailsRequest;
import java.util.Locale;
import java.util.List;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

	// Newest first; id breaks the tie when two rows were created at the same instant
	private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

	private final JobApplicationRepository jobApplicationRepository;

	private final ResumeRepository resumeRepository;

	private final AiService aiService;

	private final MatchAnalysisCache matchAnalysisCache;

	private final MatchAnalysisRepository matchAnalysisRepository;

	private final StatusHistoryRepository statusHistoryRepository;

	private final PdfTextWriter pdfTextWriter;

	private final Clock clock;

	public ApplicationResponse create(Long userId, CreateApplicationRequest request) {
		JobApplication application = new JobApplication();
		application.setUserId(userId);
		application.setCompanyName(request.companyName().strip());
		application.setJobTitle(request.jobTitle().strip());
		application.setJobDescription(request.jobDescription().strip());
		application.setStatus(ApplicationStatus.SAVED);
		Instant now = clock.instant();
		application.setStatusChangedAt(now);
		JobApplication saved = jobApplicationRepository.save(application);
		// The first line of the status timeline: the application was created
		StatusHistory created = new StatusHistory(saved.getId(), null, ApplicationStatus.SAVED, now);
		statusHistoryRepository.save(created);
		return ApplicationResponse.from(saved, null, List.of(created));
	}

	public PageResponse<ApplicationResponse> list(Long userId, ApplicationStatus status, int page, int size) {
		Pageable pageable = PageRequest.of(page, size, NEWEST_FIRST);
		Page<JobApplication> applications = status == null
				? jobApplicationRepository.findByUserId(userId, pageable)
				: jobApplicationRepository.findByUserIdAndStatus(userId, status, pageable);
		// Load the saved analyses of the whole page with one query instead of one query per application
		Map<Long, MatchAnalysis> analyses = matchAnalysisRepository
			.findByApplicationIdIn(applications.map(JobApplication::getId).getContent())
			.stream()
			.collect(Collectors.toMap(MatchAnalysis::getApplicationId, Function.identity()));
		return PageResponse
			.from(applications.map(application -> ApplicationResponse.from(application, analyses.get(application.getId()))));
	}

	public ApplicationResponse getById(Long userId, Long id) {
		return withAnalysis(find(userId, id));
	}

	public ApplicationResponse updateStatus(Long userId, Long id, ApplicationStatus status) {
		JobApplication application = find(userId, id);
		ApplicationStatus before = application.getStatus();
		// Setting the same status again is not a change: nothing is recorded and "days in this stage" keeps counting
		if (before != status) {
			Instant now = clock.instant();
			application.setStatus(status);
			application.setStatusChangedAt(now);
			jobApplicationRepository.save(application);
			statusHistoryRepository.save(new StatusHistory(id, before, status, now));
		}
		return withAnalysis(application);
	}

	// Stores the user's notes and the interview date. Empty notes and a missing date remove what was stored.
	public ApplicationResponse updateDetails(Long userId, Long id, UpdateDetailsRequest request) {
		JobApplication application = find(userId, id);
		String notes = request.notes() == null ? null : request.notes().strip();
		application.setNotes(notes == null || notes.isEmpty() ? null : notes);
		application.setInterviewAt(request.interviewAt());
		return withAnalysis(jobApplicationRepository.save(application));
	}

	public MatchAnalysisResult analyze(Long userId, Long id, Long resumeId) {
		JobApplication application = find(userId, id);
		Resume resume = findResumeFor(userId, application, resumeId);
		String jobDescription = application.getJobDescription();

		Optional<MatchAnalysisResponse> cached = matchAnalysisCache.get(resumeId, id, jobDescription);
		// Only reached when the AI answered properly, so errors are never cached
		MatchAnalysisResponse analysis = cached.orElseGet(() -> {
			MatchAnalysisResponse fresh = aiService.analyzeMatch(resume.getExtractedText(), jobDescription);
			matchAnalysisCache.put(resumeId, id, jobDescription, fresh);
			return fresh;
		});

		application.setMatchScore(analysis.matchScore());
		jobApplicationRepository.save(application);
		saveAnalysis(id, resumeId, analysis, cached.isPresent());
		return new MatchAnalysisResult(analysis, cached.isPresent());
	}

	// Keeps the full analysis (not only the score) in the database, one row per application
	private void saveAnalysis(Long applicationId, Long resumeId, MatchAnalysisResponse analysis, boolean fromCache) {
		Optional<MatchAnalysis> existing = matchAnalysisRepository.findByApplicationId(applicationId);
		// A cached answer for the same resume is the one already stored; keep its original date
		if (fromCache && existing.isPresent() && resumeId.equals(existing.get().getResumeId())) {
			return;
		}
		MatchAnalysis saved = existing.orElseGet(MatchAnalysis::new);
		saved.setApplicationId(applicationId);
		saved.setResumeId(resumeId);
		saved.setMatchScore(analysis.matchScore());
		saved.setMatchingSkills(analysis.matchingSkills());
		saved.setMissingSkills(analysis.missingSkills());
		saved.setResumeTips(analysis.resumeTips());
		saved.setModelName(aiService.modelName());
		saved.setAnalyzedAt(Instant.now());
		matchAnalysisRepository.save(saved);
	}

	private ApplicationResponse withAnalysis(JobApplication application) {
		return ApplicationResponse.from(application,
				matchAnalysisRepository.findByApplicationId(application.getId()).orElse(null),
				statusHistoryRepository.findByApplicationIdOrderByChangedAtAscIdAsc(application.getId()));
	}

	public CoverLetterResponse generateCoverLetter(Long userId, Long id, Long resumeId) {
		return generateCoverLetter(userId, id, resumeId, CoverLetterTone.FORMAL);
	}

	// Writes a new cover letter in the asked tone and replaces the stored one. Calling it again is "regenerate".
	public CoverLetterResponse generateCoverLetter(Long userId, Long id, Long resumeId, CoverLetterTone tone) {
		JobApplication application = find(userId, id);
		Resume resume = findResumeFor(userId, application, resumeId);
		String coverLetter = aiService.generateCoverLetter(resume.getExtractedText(), application.getJobTitle(),
				application.getCompanyName(), application.getJobDescription(), tone);
		application.setCoverLetter(coverLetter);
		application.setCoverLetterTone(tone);
		jobApplicationRepository.save(application);
		return new CoverLetterResponse(application.getId(), coverLetter, tone);
	}

	// The stored cover letter as a PDF file
	public CoverLetterPdf coverLetterPdf(Long userId, Long id) {
		JobApplication application = find(userId, id);
		if (isBlank(application.getCoverLetter())) {
			throw new InvalidAnalysisRequestException("This application has no cover letter yet. Generate one first");
		}
		String title = "Cover letter - " + application.getJobTitle() + " at " + application.getCompanyName();
		return new CoverLetterPdf(fileName(application), pdfTextWriter.write(title, application.getCoverLetter()));
	}

	public record CoverLetterPdf(String fileName, byte[] content) {
	}

	// e.g. "cover-letter-nordlicht-software.pdf": only letters, digits and dashes, so it is safe in a header
	private String fileName(JobApplication application) {
		String company = application.getCompanyName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
			.replaceAll("^-|-$", "");
		return "cover-letter" + (company.isEmpty() ? "" : "-" + company) + ".pdf";
	}

	public void delete(Long userId, Long id) {
		jobApplicationRepository.delete(find(userId, id));
	}

	// Loads the resume and makes sure both texts the AI needs are there
	private Resume findResumeFor(Long userId, JobApplication application, Long resumeId) {
		Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
			.orElseThrow(() -> new ResumeNotFoundException(resumeId));
		String jobDescription = application.getJobDescription();
		if (isBlank(jobDescription)) {
			throw new InvalidAnalysisRequestException("This application has no job description for the AI to use");
		}
		if (!CreateApplicationRequest.isLongEnough(jobDescription)) {
			throw new InvalidAnalysisRequestException("The job description is too short ("
					+ jobDescription.strip().length() + " characters). The AI needs at least "
					+ CreateApplicationRequest.MIN_JOB_DESCRIPTION_LENGTH + " characters");
		}
		if (isBlank(resume.getExtractedText())) {
			throw new InvalidAnalysisRequestException("This resume has no text for the AI to use");
		}
		return resume;
	}

	private boolean isBlank(String text) {
		return text == null || text.isBlank();
	}

	// An application of another user is reported as "not found", the same as one that does not exist
	private JobApplication find(Long userId, Long id) {
		return jobApplicationRepository.findByIdAndUserId(id, userId)
			.orElseThrow(() -> new ApplicationNotFoundException(id));
	}

}
