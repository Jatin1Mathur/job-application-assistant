package com.jatin.jobassistant;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// Scheduling is needed for the nightly reset of the demo account (DemoAccountService)
@SpringBootApplication
@EnableScheduling
public class JobAssistantApplication {

	public static void main(String[] args) {
		SpringApplication.run(JobAssistantApplication.class, args);
	}

}
