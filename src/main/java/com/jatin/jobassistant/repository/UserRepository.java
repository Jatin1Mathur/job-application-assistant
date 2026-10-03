package com.jatin.jobassistant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jatin.jobassistant.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	// The shared demo account, if it has been created
	Optional<User> findByDemoTrue();

}
