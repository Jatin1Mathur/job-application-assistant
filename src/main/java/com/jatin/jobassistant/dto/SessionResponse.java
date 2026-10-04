package com.jatin.jobassistant.dto;

// The answer to a login from the browser. The token itself is not in it: it travels in an httpOnly cookie that
// the page cannot read.
public record SessionResponse(String email, String name, boolean demo, long expiresInSeconds) {
}
