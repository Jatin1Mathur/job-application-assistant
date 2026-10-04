package com.jatin.jobassistant.security;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

// Builds the cookie that carries the login token in the browser.
//
// httpOnly:  JavaScript in the page cannot read it, so a script injected into the page cannot steal the token
// SameSite:  "Strict" means the browser does not send it with requests that come from another website
// secure:    only sent over HTTPS. Off by default, because the local setup uses plain http://localhost
// path /api: only sent to the API, not with requests for pictures or scripts
@Component
public class AuthCookies {

	public static final String NAME = "job_assistant_token";

	private final boolean secure;

	public AuthCookies(@Value("${auth.cookie.secure:false}") boolean secure) {
		this.secure = secure;
	}

	// The cookie lives exactly as long as the token inside it
	public ResponseCookie login(String token, Duration lifetime) {
		return base(token).maxAge(lifetime).build();
	}

	// An empty cookie that expires at once: this is how a cookie is deleted
	public ResponseCookie logout() {
		return base("").maxAge(Duration.ZERO).build();
	}

	private ResponseCookie.ResponseCookieBuilder base(String value) {
		return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Strict").path("/api");
	}

}
