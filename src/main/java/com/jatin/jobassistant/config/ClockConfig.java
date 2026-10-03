package com.jatin.jobassistant.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

	// "Now" comes from this clock, so tests can set the date they need
	@Bean
	public Clock clock() {
		return Clock.systemUTC();
	}

}
