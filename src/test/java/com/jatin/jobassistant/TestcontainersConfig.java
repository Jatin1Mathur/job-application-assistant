package com.jatin.jobassistant;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

// The integration tests get their own PostgreSQL and Redis: Testcontainers starts both in throwaway Docker
// containers before the tests and removes them afterwards. The tests therefore never touch the development
// database, and they need nothing running beforehand except Docker itself.
//
// @ServiceConnection tells Spring Boot to connect to these containers instead of the addresses in application.yml.
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

	// The same image as docker-compose.yml, so the migrations run against the same database version
	@Bean
	@ServiceConnection
	PostgreSQLContainer postgres() {
		return new PostgreSQLContainer(DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"));
	}

	@Bean
	@ServiceConnection(name = "redis")
	GenericContainer<?> redis() {
		return new GenericContainer<>(DockerImageName.parse("redis:7")).withExposedPorts(6379);
	}

}
