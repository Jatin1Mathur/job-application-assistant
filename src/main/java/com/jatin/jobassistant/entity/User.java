package com.jatin.jobassistant.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String email;

	// Optional. Used for the greeting on the dashboard
	@Column(length = 100)
	private String name;

	// BCrypt hash of the password. The plain password is never stored
	@Column(nullable = false, length = 100)
	private String passwordHash;

	// True only for the shared demo account. The database refuses to delete that row or to change its password
	@Column(nullable = false, updatable = false)
	private boolean demo;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

}
