# ADR 003: Login with JWT

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

Resumes and applications are personal, so every row has to belong to one user and the API has to know who is asking. The frontend is a single-page app that calls a JSON API, and the same API should be usable from Postman.

## Decision

I decided on stateless authentication with a JSON Web Token.

- Login returns a token signed with HS256 that is valid for 24 hours. Its subject is the user id.
- The client sends it on every request as `Authorization: Bearer <token>`.
- Spring Security's OAuth2 resource server checks the signature and the expiry. There is no session on the server.
- Passwords are stored as BCrypt hashes.
- The signing secret comes from the environment (`JWT_SECRET`) and must be at least 32 characters, or the application refuses to start.

## Alternatives

- **Server-side sessions with a cookie.** Easy to revoke and no token handling in the frontend, but it needs CSRF protection and session storage, and it is less convenient for Postman and for a possible second client.
- **An external identity provider (OAuth login with Google or GitHub, or Keycloak).** No passwords to store, but a large dependency for a project that should start with one command and no accounts elsewhere.
- **An asymmetric key (RS256) instead of a shared secret.** Needed when other services verify the token. Here only this backend signs and verifies, so one secret is enough.

## Consequences

- The backend is stateless: any request can be checked without a database lookup for a session.
- Every service method takes the user id from the token and loads rows with it. A row of another user is answered with 404, not 403, so ids cannot be probed.
- The login error is the same for an unknown email and a wrong password.
- Limits I accept for now: a token cannot be revoked before it expires, and there are no refresh tokens (after 24 hours the user logs in again).

## Update

When this was decided, the frontend kept the token in `localStorage` and sent it in a header, so no cookies were used and CSRF protection was off. That part was replaced by [ADR 007](007-login-token-in-an-httponly-cookie.md): the browser now gets the token in an httpOnly cookie, with CSRF protection. The token itself, its signature and its lifetime are unchanged.
