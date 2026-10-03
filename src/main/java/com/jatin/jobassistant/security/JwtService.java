package com.jatin.jobassistant.security;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

// Creates the signed login token (JWT). Checking tokens on incoming requests is done by Spring Security
@Service
public class JwtService {

	private final JwtEncoder jwtEncoder;

	private final Duration expiration;

	public JwtService(JwtEncoder jwtEncoder, @Value("${jwt.expiration}") Duration expiration) {
		this.jwtEncoder = jwtEncoder;
		this.expiration = expiration;
	}

	public String generateToken(Long userId, String email) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(String.valueOf(userId)) // who the token belongs to
			.claim("email", email)
			.issuedAt(now)
			.expiresAt(now.plus(expiration))
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public Duration getExpiration() {
		return expiration;
	}

}
