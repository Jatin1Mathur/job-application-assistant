package com.jatin.jobassistant.service;

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

	// "Try with demo account": logs the visitor in as the shared demo user, without a password
	public LoginResponse demoLogin() {
		User demo = userRepository.findByDemoTrue().orElseThrow(DemoUnavailableException::new);
		return tokenFor(demo);
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
