package com.jatin.jobassistant.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.jatin.jobassistant.dto.ResumeResponse;
import com.jatin.jobassistant.dto.ResumeUploadResponse;
import com.jatin.jobassistant.security.CurrentUser;
import com.jatin.jobassistant.service.ResumeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

	private final ResumeService resumeService;

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public ResumeUploadResponse upload(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(value = "file", required = false) MultipartFile file) {
		return resumeService.upload(CurrentUser.id(jwt), file);
	}

	@GetMapping("/{id}")
	public ResumeResponse getById(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
		return resumeService.getById(CurrentUser.id(jwt), id);
	}

}
