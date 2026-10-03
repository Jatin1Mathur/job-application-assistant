package com.jatin.jobassistant.dto;

import com.jatin.jobassistant.entity.ApplicationStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(@NotNull(message = "status is required") ApplicationStatus status) {

}
