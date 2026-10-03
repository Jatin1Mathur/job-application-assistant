package com.jatin.jobassistant.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.jatin.jobassistant.dto.ApplicationResponse;
import com.jatin.jobassistant.dto.CreateApplicationRequest;
import com.jatin.jobassistant.dto.PageResponse;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;
import com.jatin.jobassistant.repository.JobApplicationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

	// Newest first; id breaks the tie when two rows were created at the same instant
	private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

	private final JobApplicationRepository jobApplicationRepository;

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

	public void delete(Long id) {
		jobApplicationRepository.delete(find(id));
	}

	private JobApplication find(Long id) {
		return jobApplicationRepository.findById(id).orElseThrow(() -> new ApplicationNotFoundException(id));
	}

}
