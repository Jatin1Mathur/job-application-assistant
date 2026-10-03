package com.jatin.jobassistant.service;

public class DemoUnavailableException extends RuntimeException {

	public DemoUnavailableException() {
		super("The demo account is not available right now. You can create your own account instead");
	}

}
