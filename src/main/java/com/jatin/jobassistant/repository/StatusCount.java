package com.jatin.jobassistant.repository;

import com.jatin.jobassistant.entity.ApplicationStatus;

// One row of "how many applications have this status"
public interface StatusCount {

	ApplicationStatus getStatus();

	long getTotal();

}
