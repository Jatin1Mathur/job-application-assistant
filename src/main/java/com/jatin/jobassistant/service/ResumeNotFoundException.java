package com.jatin.jobassistant.service;

public class ResumeNotFoundException extends RuntimeException {

	public ResumeNotFoundException(Long id) {
		super("Resume with id " + id + " was not found");
	}

}
