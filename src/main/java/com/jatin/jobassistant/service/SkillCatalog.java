package com.jatin.jobassistant.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

// A fixed list of well-known skills, sorted into categories. It is used for two things:
// finding skills in the text of a resume, and grouping the skills of the analyses by category.
// A skill that is not in the list belongs to "Other". Nothing here is guessed by the AI.
@Component
public class SkillCatalog {

	public static final String OTHER = "Other";

	private static final Map<String, List<String>> CATEGORIES = new LinkedHashMap<>();
	static {
		CATEGORIES.put("Languages", List.of("Java", "Python", "JavaScript", "TypeScript", "Kotlin", "Swift", "C#", "C++",
				"Go", "Rust", "PHP", "Ruby", "Scala", "SQL", "HTML", "CSS", "Bash"));
		CATEGORIES.put("Frameworks", List.of("Spring Boot", "Spring", "React", "Angular", "Vue", "Next.js", "Node.js",
				"Express", "Django", "Flask", "FastAPI", "Hibernate", "JPA", "SwiftUI", ".NET", "Tailwind CSS", "JUnit",
				"GraphQL", "REST APIs"));
		CATEGORIES.put("Databases", List.of("PostgreSQL", "MySQL", "MongoDB", "Redis", "Oracle", "SQLite",
				"Elasticsearch", "Flyway"));
		CATEGORIES.put("Cloud and DevOps", List.of("Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Terraform",
				"Jenkins", "GitHub Actions", "CI/CD", "Linux", "Nginx", "Ansible"));
		CATEGORIES.put("Data and AI", List.of("Apache Spark", "Spark", "Apache Airflow", "Airflow", "Kafka", "Pandas",
				"NumPy", "TensorFlow", "PyTorch", "Machine Learning", "Tableau", "Power BI"));
		CATEGORIES.put("Tools and practices", List.of("Git", "Maven", "Gradle", "Xcode", "Jira", "Scrum", "Agile",
				"Unit testing", "Code reviews", "Figma", "Postman", "Maven multi-module builds"));
	}

	// "Go" is also an ordinary word, so it is not looked for in resume text. An analysis that names it is still grouped
	private static final Set<String> TOO_AMBIGUOUS_TO_DETECT = Set.of("Go");

	// These names are also ordinary English words ("express", "swift"). They only count when written with a capital
	private static final Set<String> ORDINARY_WORDS = Set.of("Express", "Spring", "Flask", "Swift", "Rust", "Ruby", "Oracle",
			"Agile", "Scrum", "Spark", "Airflow");

	private record Entry(String skill, String category, Pattern pattern) {
	}

	private final List<Entry> entries = new ArrayList<>();

	private final Map<String, String> categoryBySkill = new LinkedHashMap<>();

	public SkillCatalog() {
		CATEGORIES.forEach((category, skills) -> {
			for (String skill : skills) {
				// The skill must stand alone: "Java" is not found inside "JavaScript", "Go" not inside "Google"
				Pattern pattern = Pattern.compile("(?<![\\p{L}\\p{N}+#.])" + Pattern.quote(skill) + "(?![\\p{L}\\p{N}+#])",
						ORDINARY_WORDS.contains(skill) ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
				entries.add(new Entry(skill, category, pattern));
				categoryBySkill.put(key(skill), category);
			}
		});
	}

	public List<String> categories() {
		List<String> names = new ArrayList<>(CATEGORIES.keySet());
		names.add(OTHER);
		return names;
	}

	// The category of a skill named by an analysis, e.g. "docker" is "Cloud and DevOps"
	public String categoryOf(String skill) {
		return skill == null ? OTHER : categoryBySkill.getOrDefault(key(skill), OTHER);
	}

	// The skills of the catalog that appear in this text, in the order of the catalog
	public List<String> detect(String text) {
		if (text == null || text.isBlank()) {
			return List.of();
		}
		List<String> found = new ArrayList<>();
		for (Entry entry : entries) {
			if (!TOO_AMBIGUOUS_TO_DETECT.contains(entry.skill()) && entry.pattern().matcher(text).find()) {
				found.add(entry.skill());
			}
		}
		// "Spring Boot" already says "Spring", and "Apache Spark" already says "Spark": keep the longer name only
		List<String> lower = found.stream().map(this::key).toList();
		found.removeIf(skill -> lower.stream()
			.anyMatch(other -> other.startsWith(key(skill) + " ") || other.endsWith(" " + key(skill))));
		return found;
	}

	private String key(String skill) {
		return skill.strip().toLowerCase(Locale.ROOT);
	}

}
