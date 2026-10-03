package com.jatin.jobassistant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jatin.jobassistant.entity.StatusHistory;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {

	// Oldest first: the order in which it happened
	List<StatusHistory> findByApplicationIdOrderByChangedAtAscIdAsc(Long applicationId);

	// Every status change of every application of this user
	@Query("""
			select h from StatusHistory h
			where h.applicationId in (select a.id from JobApplication a where a.userId = :userId)
			order by h.changedAt, h.id
			""")
	List<StatusHistory> findByUserId(Long userId);

}
