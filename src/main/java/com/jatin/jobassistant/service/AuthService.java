package com.jatin.jobassistant.service;

import com.jatin.jobassistant.dto.SessionResponse;
import java.time.Duration;
import com.jatin.jobassistant.dto.AccountResponse;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.jatin.jobassistant.dto.LoginRequest;
import com.jatin.jobassistant.dto.LoginResponse;
import com.jatin.jobassistant.dto.RegisterRequest;
import com.jatin.jobassistant.dto.UserResponse;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.UserRepository;
import com.jatin.jobassistant.security.JwtService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final UserRepository userRepository;

	private final PasswordEncoder passwordEncoder;

	private final JwtService jwtService;

	public UserResponse register(RegisterRequest request) {
		String email = normalize(request.email());
		if (userRepository.existsByEmail(email)) {
			throw new EmailAlreadyUsedException();
		}

		User user = new User();
		user.setEmail(email);
		user.setName(cleanName(request.name()));
		// Only the BCrypt hash is stored, never the password itself
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		try {
			return UserResponse.from(userRepository.save(user));
		}
		catch (DataIntegrityViolationException ex) {
			// Two registrations with the same email at the same moment: the database's unique rule stops the second
			throw new EmailAlreadyUsedException();
		}
	}

	public LoginResponse login(LoginRequest request) {
		User user = userRepository.findByEmail(normalize(request.email()))
			.orElseThrow(InvalidCredentialsException::new);
		// The demo account has no password anyone knows. It is entered with demoLogin(), never with a password
		if (user.isDemo() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new InvalidCredentialsException();
		}
		return tokenFor(user);
	}

	public AccountResponse account(Long userId) {
		return AccountResponse.from(userRepository.findById(userId).orElseThrow(InvalidCredentialsException::new));
	}

	// Sets or removes the name shown in the greeting. The shared demo account keeps its sample name.
	public AccountResponse updateName(Long userId, String name) {
		User user = userRepository.findById(userId).orElseThrow(InvalidCredentialsException::new);
		if (user.isDemo()) {
			throw new DemoAccountLockedException();
		}
		user.setName(cleanName(name));
		return AccountResponse.from(userRepository.save(user));
	}

	private String cleanName(String name) {
		return name == null || name.isBlank() ? null : name.strip();
	}

	// What a login from the browser needs: the token for the cookie, and who is now logged in
	public record Session(String token, Duration lifetime, SessionResponse details) {
	}

	public Session loginSession(LoginRequest request) {
		User user = userRepository.findByEmail(normalize(request.email())).orElseThrow(InvalidCredentialsException::new);
		if (user.isDemo() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new InvalidCredentialsException();
		}
		return sessionFor(user);
	}

	public Session demoSession() {
		return sessionFor(userRepository.findByDemoTrue().orElseThrow(DemoUnavailableException::new));
	}

	private Session sessionFor(User user) {
		Duration lifetime = jwtService.getExpiration();
		return new Session(jwtService.generateToken(user.getId(), user.getEmail()), lifetime,
				new SessionResponse(user.getEmail(), user.getName(), user.isDemo(), lifetime.toSeconds()));
	}

	private LoginResponse tokenFor(User user) {
		return new LoginResponse(jwtService.generateToken(user.getId(), user.getEmail()), "Bearer",
				jwtService.getExpiration().toSeconds());
	}

	// "Jatin@Mail.com " and "jatin@mail.com" are the same account
	private String normalize(String email) {
		return email.strip().toLowerCase(Locale.ROOT);
	}

}
