package com.jatin.jobassistant.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.jatin.jobassistant.entity.MatchAnalysis;

public interface MatchAnalysisRepository extends JpaRepository<MatchAnalysis, Long> {

	Optional<MatchAnalysis> findByApplicationId(Long applicationId);

	// One query for a whole page of applications
	List<MatchAnalysis> findByApplicationIdIn(Collection<Long> applicationIds);

	// All analyses of the applications that belong to this user
	@Query("""
			select m from MatchAnalysis m
			where m.applicationId in (select a.id from JobApplication a where a.userId = :userId)
			""")
	List<MatchAnalysis> findByUserId(Long userId);

}
