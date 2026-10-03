package com.jatin.jobassistant.service;

public class InvalidAiResponseException extends RuntimeException {

	public InvalidAiResponseException(String message, Throwable cause) {
		super(message, cause);
	}

}
