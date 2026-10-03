package com.jatin.jobassistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.jatin.jobassistant.dto.LoginRequest;
import com.jatin.jobassistant.dto.LoginResponse;
import com.jatin.jobassistant.dto.RegisterRequest;
import com.jatin.jobassistant.dto.UserResponse;
import com.jatin.jobassistant.entity.User;
import com.jatin.jobassistant.repository.UserRepository;
import com.jatin.jobassistant.security.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	// The real encoder (lowest strength so the tests stay fast), so hashing is really tested
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

	@Mock
	private UserRepository userRepository;

	@Mock
	private JwtService jwtService;

	private AuthService authService;

	@BeforeEach
	void setUp() {
		authService = new AuthService(userRepository, passwordEncoder, jwtService);
	}

	@Test
	void registerStoresABcryptHashAndNeverThePlainPassword() {
		when(userRepository.existsByEmail("jatin@example.com")).thenReturn(false);
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
			User saved = invocation.getArgument(0);
			saved.setId(1L);
			saved.setCreatedAt(Instant.now());
			return saved;
		});

		UserResponse response = authService.register(new RegisterRequest("jatin@example.com", "secret-password"));

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.email()).isEqualTo("jatin@example.com");
		ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
		verify(userRepository).save(saved.capture());
		String hash = saved.getValue().getPasswordHash();
		assertThat(hash).isNotEqualTo("secret-password").startsWith("$2");
		assertThat(passwordEncoder.matches("secret-password", hash)).isTrue();
	}

	@Test
	void registerStoresTheEmailInLowerCaseWithoutSpaces() {
		when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		UserResponse response = authService.register(new RegisterRequest("  Jatin@Example.COM ", "secret-password"));

		assertThat(response.email()).isEqualTo("jatin@example.com");
		verify(userRepository).existsByEmail("jatin@example.com");
	}

	@Test
	void registerThrowsWhenEmailIsAlreadyUsed() {
		when(userRepository.existsByEmail("jatin@example.com")).thenReturn(true);

		assertThatThrownBy(() -> authService.register(new RegisterRequest("jatin@example.com", "secret-password")))
			.isInstanceOf(EmailAlreadyUsedException.class);
		verify(userRepository, never()).save(any());
	}

	@Test
	void registerThrowsWhenTheDatabaseRejectsADuplicateEmail() {
		when(userRepository.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

		assertThatThrownBy(() -> authService.register(new RegisterRequest("jatin@example.com", "secret-password")))
			.isInstanceOf(EmailAlreadyUsedException.class);
	}

	@Test
	void loginReturnsATokenForTheRightPassword() {
		when(userRepository.findByEmail("jatin@example.com")).thenReturn(Optional.of(user("secret-password")));
		when(jwtService.generateToken(1L, "jatin@example.com")).thenReturn("the.jwt.token");
		when(jwtService.getExpiration()).thenReturn(Duration.ofHours(24));

		LoginResponse response = authService.login(new LoginRequest(" Jatin@example.com", "secret-password"));

		assertThat(response.token()).isEqualTo("the.jwt.token");
		assertThat(response.tokenType()).isEqualTo("Bearer");
		assertThat(response.expiresInSeconds()).isEqualTo(86400);
	}

	@Test
	void loginThrowsForTheWrongPassword() {
		when(userRepository.findByEmail("jatin@example.com")).thenReturn(Optional.of(user("secret-password")));

		assertThatThrownBy(() -> authService.login(new LoginRequest("jatin@example.com", "wrong-password")))
			.isInstanceOf(InvalidCredentialsException.class)
			.hasMessage("Email or password is incorrect");
		verifyNoInteractions(jwtService);
	}

	@Test
	void loginThrowsTheSameErrorForAnUnknownEmail() {
		when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "secret-password")))
			.isInstanceOf(InvalidCredentialsException.class)
			.hasMessage("Email or password is incorrect");
		verifyNoInteractions(jwtService);
	}

	@Test
	void requestObjectsDoNotPrintThePassword() {
		assertThat(new RegisterRequest("jatin@example.com", "secret-password").toString())
			.doesNotContain("secret-password");
		assertThat(new LoginRequest("jatin@example.com", "secret-password").toString())
			.doesNotContain("secret-password");
	}

	private User user(String password) {
		User user = new User();
		user.setId(1L);
		user.setEmail("jatin@example.com");
		user.setPasswordHash(passwordEncoder.encode(password));
		return user;
	}

}
