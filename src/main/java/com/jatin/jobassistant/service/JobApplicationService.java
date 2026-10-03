package com.jatin.jobassistant.service;

import java.util.Optional;

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
import com.jatin.jobassistant.entity.Resume;
import com.jatin.jobassistant.repository.JobApplicationRepository;
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

	public ApplicationResponse create(CreateApplicationRequest request) {
		JobApplication application = new JobApplication();
		application.setCompanyName(request.companyName().strip());
		application.setJobTitle(request.jobTitle().strip());
		application.setJobDescription(request.jobDescription());
		application.setStatus(ApplicationStatus.SAVED);
		return ApplicationResponse.from(jobApplicationRepository.save(application));
	}

	public PageResponse<ApplicationResponse> list(ApplicationStatus status, int page, int size) {
		Pageable pageable = PageRequest.of(page, size, NEWEST_FIRST);
		Page<JobApplication> applications = status == null ? jobApplicationRepository.findAll(pageable)
				: jobApplicationRepository.findByStatus(status, pageable);
		return PageResponse.from(applications.map(ApplicationResponse::from));
	}

	public ApplicationResponse getById(Long id) {
		return ApplicationResponse.from(find(id));
	}

	public ApplicationResponse updateStatus(Long id, ApplicationStatus status) {
		JobApplication application = find(id);
		application.setStatus(status);
		return ApplicationResponse.from(jobApplicationRepository.save(application));
	}

	public MatchAnalysisResult analyze(Long id, Long resumeId) {
		JobApplication application = find(id);
		Resume resume = findResumeFor(application, resumeId);
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
		return new MatchAnalysisResult(analysis, cached.isPresent());
	}

	public CoverLetterResponse generateCoverLetter(Long id, Long resumeId) {
		JobApplication application = find(id);
		Resume resume = findResumeFor(application, resumeId);

		String coverLetter = aiService.generateCoverLetter(resume.getExtractedText(), application.getJobTitle(),
				application.getCompanyName(), application.getJobDescription());
		application.setCoverLetter(coverLetter);
		jobApplicationRepository.save(application);
		return new CoverLetterResponse(application.getId(), coverLetter);
	}

	public void delete(Long id) {
		jobApplicationRepository.delete(find(id));
	}

	// Loads the resume and makes sure both texts the AI needs are there
	private Resume findResumeFor(JobApplication application, Long resumeId) {
		Resume resume = resumeRepository.findById(resumeId).orElseThrow(() -> new ResumeNotFoundException(resumeId));
		String jobDescription = application.getJobDescription();
		if (isBlank(jobDescription)) {
			throw new InvalidAnalysisRequestException("This application has no job description for the AI to use");
		}
		if (jobDescription.strip().length() < CreateApplicationRequest.MIN_JOB_DESCRIPTION_LENGTH) {
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

	private JobApplication find(Long id) {
		return jobApplicationRepository.findById(id).orElseThrow(() -> new ApplicationNotFoundException(id));
	}

}
