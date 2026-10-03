package com.jatin.jobassistant.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.Resume;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

}
