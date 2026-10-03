package com.jatin.jobassistant.dto;

import java.time.Instant;

import com.jatin.jobassistant.entity.ApplicationStatus;
import com.jatin.jobassistant.entity.StatusHistory;

// One entry of the status timeline. fromStatus is null for the first entry (the application was created)
public record StatusChangeResponse(ApplicationStatus fromStatus, ApplicationStatus toStatus, Instant changedAt) {

	public static StatusChangeResponse from(StatusHistory change) {
		return new StatusChangeResponse(change.getFromStatus(), change.getToStatus(), change.getChangedAt());
	}

}
