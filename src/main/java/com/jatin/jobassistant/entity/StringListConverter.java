package com.jatin.jobassistant.entity;

import java.util.List;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

// Stores a list of strings in one text column as a JSON array, e.g. ["Java","Docker"]
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
	};

	@Override
	public String convertToDatabaseColumn(List<String> list) {
		return JSON.writeValueAsString(list == null ? List.of() : list);
	}

	@Override
	public List<String> convertToEntityAttribute(String json) {
		return json == null || json.isBlank() ? List.of() : JSON.readValue(json, STRING_LIST);
	}

}
