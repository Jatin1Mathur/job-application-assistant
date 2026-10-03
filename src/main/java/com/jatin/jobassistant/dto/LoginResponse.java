package com.jatin.jobassistant.dto;

// The client sends the token back on every request: "Authorization: Bearer <token>"
public record LoginResponse(String token, String tokenType, long expiresInSeconds) {

}
