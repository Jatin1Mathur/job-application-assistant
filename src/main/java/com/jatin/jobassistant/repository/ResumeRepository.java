package com.jatin.jobassistant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.Resume;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

	// Finds the resume only if it belongs to this user
	Optional<Resume> findByIdAndUserId(Long id, Long userId);

}
