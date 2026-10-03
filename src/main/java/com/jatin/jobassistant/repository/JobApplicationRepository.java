package com.jatin.jobassistant.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.JobApplication;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

}
