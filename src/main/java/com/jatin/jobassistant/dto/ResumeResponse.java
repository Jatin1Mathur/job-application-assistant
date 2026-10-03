package com.jatin.jobassistant.dto;

import java.time.Instant;

import com.jatin.jobassistant.entity.Resume;

public record ResumeResponse(Long id, String fileName, Instant createdAt, String extractedText) {

	public static ResumeResponse from(Resume resume) {
		return new ResumeResponse(resume.getId(), resume.getFileName(), resume.getCreatedAt(),
				resume.getExtractedText());
	}

}
