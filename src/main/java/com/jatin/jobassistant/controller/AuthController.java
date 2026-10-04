package com.jatin.jobassistant.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.jatin.jobassistant.dto.LoginRequest;
import com.jatin.jobassistant.dto.LoginResponse;
import com.jatin.jobassistant.dto.RegisterRequest;
import com.jatin.jobassistant.dto.SessionResponse;
import com.jatin.jobassistant.dto.UserResponse;
import com.jatin.jobassistant.security.AuthCookies;
import com.jatin.jobassistant.security.RateLimits;
import com.jatin.jobassistant.service.AuthService;
import com.jatin.jobassistant.service.AuthService.Session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	private final AuthCookies authCookies;

	private final RateLimits rateLimits;

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public UserResponse register(@Valid @RequestBody RegisterRequest request) {
		return authService.register(request);
	}

	// Login from the browser. The token is put into an httpOnly cookie; the body only says who is logged in.
	@PostMapping("/login")
	public ResponseEntity<SessionResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		rateLimits.loginAttempt(http.getRemoteAddr(), request.email());
		return withCookie(authService.loginSession(request));
	}

	// Login for API clients such as Postman or scripts, which send the token themselves in the header
	// "Authorization: Bearer <token>". No cookie is set.
	@PostMapping("/token")
	public LoginResponse token(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		rateLimits.loginAttempt(http.getRemoteAddr(), request.email());
		return authService.login(request);
	}

	// "Try with demo account": no email and no password, the visitor is logged in as the shared demo user
	@PostMapping("/demo")
	public ResponseEntity<SessionResponse> demoLogin(HttpServletRequest http) {
		rateLimits.loginAttempt(http.getRemoteAddr(), null);
		return withCookie(authService.demoSession());
	}

	// The page cannot delete an httpOnly cookie itself, so the backend does it
	@PostMapping("/logout")
	public ResponseEntity<Void> logout() {
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, authCookies.logout().toString()).build();
	}

	private ResponseEntity<SessionResponse> withCookie(Session session) {
		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, authCookies.login(session.token(), session.lifetime()).toString())
			.body(session.details());
	}

}
