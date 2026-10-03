package com.jatin.jobassistant.dto;

import java.time.Instant;
import java.util.List;

import com.jatin.jobassistant.entity.Resume;

// detectedSkills: the skills of the built-in skill list that appear in the text of the resume.
// hasFile: true if the PDF itself can be downloaded (GET /api/resumes/{id}/file).
public record ResumeUploadResponse(Long id, String fileName, Instant createdAt, String textPreview,
		List<String> detectedSkills, boolean hasFile) {

	private static final int PREVIEW_LENGTH = 200;

	public static ResumeUploadResponse from(Resume resume, List<String> detectedSkills) {
		String text = resume.getExtractedText();
		String preview = text.length() <= PREVIEW_LENGTH ? text : text.substring(0, PREVIEW_LENGTH);
		return new ResumeUploadResponse(resume.getId(), resume.getFileName(), resume.getCreatedAt(), preview,
				detectedSkills, resume.isHasFile());
	}

}
