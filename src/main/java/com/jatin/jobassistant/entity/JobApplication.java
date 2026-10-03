package com.jatin.jobassistant.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "job_application")
@Getter
@Setter
@NoArgsConstructor
public class JobApplication {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// The user who owns this row; other users cannot see or change it
	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(nullable = false)
	private String companyName;

	@Column(nullable = false)
	private String jobTitle;

	@Column(columnDefinition = "text")
	private String jobDescription;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ApplicationStatus status = ApplicationStatus.SAVED;

	private Integer matchScore;

	@Column(columnDefinition = "text")
	private String coverLetter;

	// How the stored cover letter was asked to sound; null when there is no letter or it is older than this field
	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private CoverLetterTone coverLetterTone;

	// The user's own notes about this application
	@Column(columnDefinition = "text")
	private String notes;

	// When the interview takes place, if one is planned
	private Instant interviewAt;

	// When the application got its current status: the start of "days in this stage"
	@Column(nullable = false)
	private Instant statusChangedAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

}
