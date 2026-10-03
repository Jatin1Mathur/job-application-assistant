package com.jatin.jobassistant.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jatin.jobassistant.dto.AccountResponse;
import com.jatin.jobassistant.dto.UpdateAccountRequest;
import com.jatin.jobassistant.security.CurrentUser;
import com.jatin.jobassistant.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// The logged-in user's own account: email and the optional name
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

	private final AuthService authService;

	@GetMapping
	public AccountResponse get(@AuthenticationPrincipal Jwt jwt) {
		return authService.account(CurrentUser.id(jwt));
	}

	@PatchMapping
	public AccountResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateAccountRequest request) {
		return authService.updateName(CurrentUser.id(jwt), request.name());
	}

}
