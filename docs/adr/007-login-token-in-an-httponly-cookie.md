# ADR 007: The login token in an httpOnly cookie, with CSRF protection

**Status:** accepted. Replaces the part of [ADR 003](003-jwt-authentication.md) about where the browser keeps the token.

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

The login is a signed token (JWT). Until now the frontend kept it in `localStorage` and sent it in the `Authorization` header. That is simple, but everything in `localStorage` can be read by any JavaScript that runs in the page. If a script were ever injected (through a bug of mine or through a library), it could read the token, send it somewhere, and use the account from another machine for up to 24 hours. This was listed as a known limitation.

## Decision

I decided that the browser no longer gets to see the token.

- `POST /api/auth/login` puts the token into a cookie with the flags **httpOnly** (JavaScript cannot read it), **SameSite=Strict** (the browser does not send it with requests coming from another website) and **Path=/api**. The answer body only says who is logged in.
- The `Secure` flag (HTTPS only) is a setting, `AUTH_COOKIE_SECURE`. It is off by default, because the local setup runs on plain `http://localhost`, and has to be switched on wherever the app is served over HTTPS.
- Because the browser now attaches the login by itself, the backend needs **CSRF protection**: a request that changes something and carries the login cookie must send a CSRF token in the header `X-XSRF-TOKEN`. The backend hands that token out in a second cookie that the page may read (`XSRF-TOKEN`). Another website cannot read that cookie, so it cannot send the header.
- **API clients** (Postman, scripts) keep the old way: `POST /api/auth/token` returns the token in the body, and they send it in the `Authorization` header. Requests with that header need no CSRF token, because a browser never adds that header on its own.
- Logging out is a request to the backend (`POST /api/auth/logout`), because the page cannot delete a cookie it cannot see.

## Alternatives

- **Keep the token in `localStorage`.** No CSRF problem and less code, but the token is readable by any script in the page.
- **Keep the token only in memory.** Not readable from storage, but lost on every reload, so the user would have to log in again each time, or a refresh-token cookie would be needed anyway.
- **Server-side sessions.** Also a cookie, and sessions can be revoked. But it would make the backend stateful and replace the token design instead of fixing its weak point.
- **Rely on SameSite alone, without a CSRF token.** `SameSite=Strict` already blocks the common attacks. I decided on both, because SameSite depends on the browser and the two protections cover each other.
- **Return the token in the login body as well**, so one endpoint serves browsers and API clients. Then the page would hold the token at login time after all. Two endpoints keep the browser path clean.

## Consequences

- A script injected into the page can no longer read or copy the token. It could still send requests while the page is open, so this limits the damage; it does not make such a bug harmless.
- The frontend cannot ask "do I have a token?". It keeps only the email in `localStorage` as a hint and asks the backend once per page load whether the cookie is still valid.
- Every changing request from the browser needs the CSRF header. `api.ts` adds it in one place.
- One subtle point that the tests caught: Spring Security skips the CSRF check for requests that carry a bearer token. If the cookie were treated as a bearer token before that check, cookie requests would have been exempt too. The cookie is therefore turned into a bearer token only after the CSRF check has run. There is a test for exactly this.
- A token cannot be revoked. Logging out deletes the cookie in that browser only.
- The Postman collection logs in at `/api/auth/token`.
- More to test: 15 new web layer tests and a new Playwright file cover the cookie flags, the CSRF check, logging out, the rate limits, and the API client path.
