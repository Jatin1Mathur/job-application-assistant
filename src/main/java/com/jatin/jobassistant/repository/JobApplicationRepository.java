package com.jatin.jobassistant.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

	// Finds the application only if it belongs to this user
	Optional<JobApplication> findByIdAndUserId(Long id, Long userId);

	Page<JobApplication> findByUserId(Long userId, Pageable pageable);

	Page<JobApplication> findByUserIdAndStatus(Long userId, ApplicationStatus status, Pageable pageable);

}
