package com.jatin.jobassistant.dto;

import com.jatin.jobassistant.entity.CoverLetterTone;

public record CoverLetterResponse(Long applicationId, String coverLetter, CoverLetterTone tone) {
}
