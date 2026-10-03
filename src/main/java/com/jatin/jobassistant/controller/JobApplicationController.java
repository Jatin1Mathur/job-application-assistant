package com.jatin.jobassistant.controller;

import com.jatin.jobassistant.service.JobApplicationService.CoverLetterPdf;
import com.jatin.jobassistant.entity.CoverLetterTone;
import com.jatin.jobassistant.dto.UpdateDetailsRequest;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.jatin.jobassistant.dto.ApplicationResponse;
import com.jatin.jobassistant.dto.CoverLetterResponse;
import com.jatin.jobassistant.dto.CreateApplicationRequest;
import com.jatin.jobassistant.dto.MatchAnalysisResponse;
import com.jatin.jobassistant.dto.MatchAnalysisResult;
import com.jatin.jobassistant.dto.PageResponse;
import com.jatin.jobassistant.dto.UpdateStatusRequest;
import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.security.CurrentUser;
import com.jatin.jobassistant.service.JobApplicationService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class JobApplicationController {

	private final JobApplicationService jobApplicationService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApplicationResponse create(@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody CreateApplicationRequest request) {
		return jobApplicationService.create(CurrentUser.id(jwt), request);
	}

	@GetMapping
	public PageResponse<ApplicationResponse> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) ApplicationStatus status,
			@RequestParam(defaultValue = "0") @Min(value = 0, message = "page must be 0 or greater") int page,
			@RequestParam(defaultValue = "20") @Min(value = 1, message = "size must be between 1 and 100")
			@Max(value = 100, message = "size must be between 1 and 100") int size) {
		return jobApplicationService.list(CurrentUser.id(jwt), status, page, size);
	}

	@GetMapping("/{id}")
	public ApplicationResponse getById(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
		return jobApplicationService.getById(CurrentUser.id(jwt), id);
	}

	@PatchMapping("/{id}/status")
	public ApplicationResponse updateStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
			@Valid @RequestBody UpdateStatusRequest request) {
		return jobApplicationService.updateStatus(CurrentUser.id(jwt), id, request.status());
	}

	// Asks the AI how well the resume fits this job and stores the score on the application.
	// The X-Cache header says whether the answer came from Redis (HIT) or from a fresh AI call (MISS)
	@PostMapping("/{id}/analyze")
	public ResponseEntity<MatchAnalysisResponse> analyze(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
			@RequestParam Long resumeId) {
		MatchAnalysisResult result = jobApplicationService.analyze(CurrentUser.id(jwt), id, resumeId);
		return ResponseEntity.ok().header("X-Cache", result.fromCache() ? "HIT" : "MISS").body(result.analysis());
	}

	// Asks the AI to write a cover letter from the resume and stores it on the application
	@PostMapping("/{id}/cover-letter")
	public CoverLetterResponse generateCoverLetter(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
			@RequestParam Long resumeId, @RequestParam(defaultValue = "FORMAL") CoverLetterTone tone) {
		return jobApplicationService.generateCoverLetter(CurrentUser.id(jwt), id, resumeId, tone);
	}

	// The stored cover letter as a PDF download
	@GetMapping(value = "/{id}/cover-letter.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> coverLetterPdf(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
		CoverLetterPdf pdf = jobApplicationService.coverLetterPdf(CurrentUser.id(jwt), id);
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + pdf.fileName() + "\"")
			.contentType(MediaType.APPLICATION_PDF)
			.body(pdf.content());
	}

	// Notes and the interview date
	@PatchMapping("/{id}/details")
	public ApplicationResponse updateDetails(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
			@Valid @RequestBody UpdateDetailsRequest request) {
		return jobApplicationService.updateDetails(CurrentUser.id(jwt), id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
		jobApplicationService.delete(CurrentUser.id(jwt), id);
	}

}
