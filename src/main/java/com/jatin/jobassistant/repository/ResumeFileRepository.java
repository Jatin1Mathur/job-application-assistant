package com.jatin.jobassistant.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.ResumeFile;

public interface ResumeFileRepository extends JpaRepository<ResumeFile, Long> {

}
