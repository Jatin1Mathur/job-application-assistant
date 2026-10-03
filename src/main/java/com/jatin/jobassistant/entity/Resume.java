package com.jatin.jobassistant.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "resume")
@Getter
@Setter
@NoArgsConstructor
public class Resume {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// The user who owns this row; other users cannot see or change it
	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(nullable = false)
	private String fileName;

	@Column(columnDefinition = "text")
	private String extractedText;

	// True if the uploaded PDF itself is stored (see ResumeFile). Resumes uploaded before that existed have only text
	@Column(nullable = false)
	private boolean hasFile;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

}
