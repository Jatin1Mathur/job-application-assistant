package com.jatin.jobassistant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.JobApplication;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

	// Finds the application only if it belongs to this user
	Optional<JobApplication> findByIdAndUserId(Long id, Long userId);

	Page<JobApplication> findByUserId(Long userId, Pageable pageable);

	Page<JobApplication> findByUserIdAndStatus(Long userId, ApplicationStatus status, Pageable pageable);

	// How many applications this user has in each status
	@Query("select a.status as status, count(a) as total from JobApplication a where a.userId = :userId group by a.status")
	List<StatusCount> countByStatus(Long userId);

	// Used when the demo account is reset. The database deletes the analyses of these applications with them
	void deleteByUserId(Long userId);

}
