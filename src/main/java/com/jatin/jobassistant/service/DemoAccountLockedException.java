package com.jatin.jobassistant.service;

public class DemoAccountLockedException extends RuntimeException {

	public DemoAccountLockedException() {
		super("The demo account is shared, so its name cannot be changed. Create your own account to set a name");
	}

}
