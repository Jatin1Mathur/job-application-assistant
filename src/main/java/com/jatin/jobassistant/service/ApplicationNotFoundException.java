package com.jatin.jobassistant.service;

public class ApplicationNotFoundException extends RuntimeException {

	public ApplicationNotFoundException(Long id) {
		super("Application with id " + id + " was not found");
	}

}
