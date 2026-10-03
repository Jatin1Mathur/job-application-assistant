package com.jatin.jobassistant.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

	Page<JobApplication> findByStatus(ApplicationStatus status, Pageable pageable);

}
