package com.jatin.jobassistant.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;

class JwtServiceTest {

	private static final String SECRET = "test-secret-that-is-at-least-32-characters-long";

	private final SecurityConfig config = new SecurityConfig();

	private final SecretKey key = config.jwtSecretKey(SECRET);

	private final JwtDecoder decoder = config.jwtDecoder(key);

	@Test
	void tokenCarriesTheUserIdAndEmailAndCanBeVerified() {
		JwtService jwtService = new JwtService(config.jwtEncoder(key), Duration.ofHours(1));

		Jwt jwt = decoder.decode(jwtService.generateToken(42L, "jatin@example.com"));

		assertThat(CurrentUser.id(jwt)).isEqualTo(42L);
		assertThat(jwt.getClaimAsString("email")).isEqualTo("jatin@example.com");
		assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofHours(1));
	}

	@Test
	void changedTokenIsRejected() {
		JwtService jwtService = new JwtService(config.jwtEncoder(key), Duration.ofHours(1));
		String token = jwtService.generateToken(42L, "jatin@example.com");
		// Swap the payload (middle part) for one that claims to be user 1, keeping the old signature
		String[] parts = token.split("\\.");
		String forgedPayload = java.util.Base64.getUrlEncoder()
			.withoutPadding()
			.encodeToString("{\"sub\":\"1\"}".getBytes());

		assertThatThrownBy(() -> decoder.decode(parts[0] + "." + forgedPayload + "." + parts[2]))
			.isInstanceOf(JwtException.class);
	}

	@Test
	void tokenSignedWithAnotherSecretIsRejected() {
		SecretKey otherKey = config.jwtSecretKey("a-completely-different-secret-of-32-chars!");
		JwtService attacker = new JwtService(config.jwtEncoder(otherKey), Duration.ofHours(1));

		assertThatThrownBy(() -> decoder.decode(attacker.generateToken(42L, "jatin@example.com")))
			.isInstanceOf(JwtException.class);
	}

	@Test
	void expiredTokenIsRejected() {
		// Issued an hour ago, expired two minutes ago (the decoder allows one minute of clock difference)
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject("42")
			.issuedAt(now.minus(Duration.ofHours(1)))
			.expiresAt(now.minus(Duration.ofMinutes(2)))
			.build();
		String expired = config.jwtEncoder(key)
			.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
			.getTokenValue();

		assertThatThrownBy(() -> decoder.decode(expired)).isInstanceOf(JwtException.class)
			.hasMessageContaining("expired");
	}

	@Test
	void secretShorterThan32CharactersIsRefused() {
		assertThatThrownBy(() -> config.jwtSecretKey("too-short")).isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("at least 32 characters");
	}

}
