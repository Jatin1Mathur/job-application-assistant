package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SkillCatalogTest {

	private final SkillCatalog catalog = new SkillCatalog();

	@Test
	void findsTheSkillsThatAreWrittenInAText() {
		assertThat(catalog.detect("Built REST APIs with Java and Spring Boot, stored data in PostgreSQL, shipped with docker."))
			.containsExactly("Java", "Spring Boot", "REST APIs", "PostgreSQL", "Docker");
	}

	@Test
	void aSkillInsideALongerWordIsNotFound() {
		// "Java" is not in "JavaScript", "Go" is not in "Google"
		assertThat(catalog.detect("JavaScript developer who used Google Cloud")).containsExactly("JavaScript", "Google Cloud");
	}

	@Test
	void theLongerNameWinsOverItsShortPart() {
		assertThat(catalog.detect("Spring Boot services and Apache Spark jobs")).containsExactly("Spring Boot", "Apache Spark");
	}

	@Test
	void ordinaryWordsOnlyCountWhenWrittenAsANameAndGoIsNeverGuessed() {
		assertThat(catalog.detect("I express ideas clearly, I am swift, and I go to meetups.")).isEmpty();
		assertThat(catalog.detect("Backend with Express and Swift")).containsExactly("Swift", "Express");
	}

	@Test
	void specialCharactersInNamesWork() {
		assertThat(catalog.detect("C++, C# and .NET, also Node.js and CI/CD")).containsExactlyInAnyOrder("C++", "C#", ".NET",
				"Node.js", "CI/CD");
	}

	@Test
	void emptyTextHasNoSkills() {
		assertThat(catalog.detect(null)).isEmpty();
		assertThat(catalog.detect("   ")).isEmpty();
	}

	@Test
	void everySkillHasACategoryAndUnknownSkillsAreOther() {
		assertThat(catalog.categoryOf("docker")).isEqualTo("Cloud and DevOps");
		assertThat(catalog.categoryOf(" Spring Boot ")).isEqualTo("Frameworks");
		assertThat(catalog.categoryOf("PostgreSQL")).isEqualTo("Databases");
		assertThat(catalog.categoryOf("Go")).isEqualTo("Languages");
		assertThat(catalog.categoryOf("Team leadership")).isEqualTo(SkillCatalog.OTHER);
		assertThat(catalog.categoryOf(null)).isEqualTo(SkillCatalog.OTHER);
		assertThat(catalog.categories()).last().isEqualTo(SkillCatalog.OTHER);
	}

}
