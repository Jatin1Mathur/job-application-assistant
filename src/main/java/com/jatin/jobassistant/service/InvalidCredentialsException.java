package com.jatin.jobassistant.service;

public class InvalidCredentialsException extends RuntimeException {

	// The same message for "unknown email" and "wrong password", so nobody can test which emails are registered
	public InvalidCredentialsException() {
		super("Email or password is incorrect");
	}

}
