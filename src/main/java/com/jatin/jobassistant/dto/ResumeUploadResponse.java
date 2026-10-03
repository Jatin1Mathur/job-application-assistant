package com.jatin.jobassistant.dto;

import java.time.Instant;

import com.jatin.jobassistant.entity.Resume;

public record ResumeUploadResponse(Long id, String fileName, Instant createdAt, String textPreview) {

	private static final int PREVIEW_LENGTH = 200;

	public static ResumeUploadResponse from(Resume resume) {
		String text = resume.getExtractedText();
		String preview = text.length() <= PREVIEW_LENGTH ? text : text.substring(0, PREVIEW_LENGTH);
		return new ResumeUploadResponse(resume.getId(), resume.getFileName(), resume.getCreatedAt(), preview);
	}

}
