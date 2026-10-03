package com.jatin.jobassistant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// The uploaded PDF of one resume. Its own table, so that listing resumes never loads the files
@Entity
@Table(name = "resume_file")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ResumeFile {

	@Id
	@Column(name = "resume_id")
	private Long resumeId;

	@Column(nullable = false)
	private byte[] data;

}
