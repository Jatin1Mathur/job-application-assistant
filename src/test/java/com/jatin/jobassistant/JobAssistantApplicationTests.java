package com.jatin.jobassistant;

import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		// The real values come from .env; the tests bring their own, so they need no .env file
		"jwt.secret=test-secret-that-is-at-least-32-characters-long", "spring.datasource.password=unused-the-container-sets-it" })
@Import(TestcontainersConfig.class)
class JobAssistantApplicationTests {

	@Test
	void contextLoads() {
	}

}
