package com.jatin.jobassistant.service;

public class EmailAlreadyUsedException extends RuntimeException {

	public EmailAlreadyUsedException() {
		super("An account with this email already exists");
	}

}
