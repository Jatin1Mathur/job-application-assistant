package com.jatin.jobassistant.entity;

import java.time.Instant;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// The latest full AI analysis of one job application
@Entity
@Table(name = "match_analysis")
@Getter
@Setter
@NoArgsConstructor
public class MatchAnalysis {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "application_id", nullable = false, updatable = false, unique = true)
	private Long applicationId;

	// The resume that was compared with the job
	@Column(name = "resume_id")
	private Long resumeId;

	@Column(nullable = false)
	private Integer matchScore;

	@Convert(converter = StringListConverter.class)
	@Column(nullable = false, columnDefinition = "text")
	private List<String> matchingSkills;

	@Convert(converter = StringListConverter.class)
	@Column(nullable = false, columnDefinition = "text")
	private List<String> missingSkills;

	@Convert(converter = StringListConverter.class)
	@Column(nullable = false, columnDefinition = "text")
	private List<String> resumeTips;

	// The AI model that produced the analysis, e.g. "llama3.2"
	@Column(nullable = false, length = 100)
	private String modelName;

	@Column(nullable = false)
	private Instant analyzedAt;

}
