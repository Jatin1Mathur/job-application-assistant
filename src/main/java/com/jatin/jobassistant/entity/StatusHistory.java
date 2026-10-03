package com.jatin.jobassistant.entity;

import java.time.Instant;

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

// One status change of one application, with its date
@Entity
@Table(name = "application_status_history")
@Getter
@Setter
@NoArgsConstructor
public class StatusHistory {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "application_id", nullable = false, updatable = false)
	private Long applicationId;

	// null for the first row: the application was created
	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private ApplicationStatus fromStatus;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ApplicationStatus toStatus;

	@Column(nullable = false)
	private Instant changedAt;

	public StatusHistory(Long applicationId, ApplicationStatus fromStatus, ApplicationStatus toStatus,
			Instant changedAt) {
		this.applicationId = applicationId;
		this.fromStatus = fromStatus;
		this.toStatus = toStatus;
		this.changedAt = changedAt;
	}

}
