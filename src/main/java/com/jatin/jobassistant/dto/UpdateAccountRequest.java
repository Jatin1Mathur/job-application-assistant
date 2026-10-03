package com.jatin.jobassistant.dto;

import jakarta.validation.constraints.Size;

// null or empty removes the name
public record UpdateAccountRequest(@Size(max = 100, message = "name must be at most 100 characters") String name) {
}
