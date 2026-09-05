# Server Services — Technical Documentation

> Technical reference for the core server-side services that make up the backend spine of the app. Everything documented here lives under `src/lib/server/` and is **server-only** — never import these into client code (the `$lib/server` alias is enforced by SvelteKit).
>
> All persistent state lives in **Directus**; these services are the only thing that talks to it. They are written as classes with **static methods** (no instances) and stateless apart from the in-memory rate limiter.
>
> Covered here: `DirectusService`, `CityService`, `AuthService`, `SessionManager`, `LoginCodeManager`.
>
> _Last updated: 2026-06-10._

---

## How the services relate

```
                       hooks.server.js
                             │ (reads session on every request)
                             ▼
        ┌──────────────► AuthService ◄────────── login/logout page actions
        │                    │
        │      ┌─────────────┼───────────────┐
        │      ▼             ▼               ▼
   SessionManager   LoginCodeManager   resendService (email)
        │      │             │
        └──────┴─────────────┴────────────┐
                                          ▼
   CityService ───────────────────► DirectusService ──HTTP──► Directus REST API
   (route loads, public API)            (the ONLY Directus client)
```

- **`DirectusService`** is the lowest layer: a thin REST wrapper. Everything else calls it.
- **`CityService`** is a read-oriented data layer for city-scoped content (points, measurements, tubes).
- **`AuthService`** orchestrates the passwordless login flow, delegating to `LoginCodeManager` (codes) and `SessionManager` (sessions). Resend and Netlify DNS setup is documented in [`HANDOVER.md`](./HANDOVER.md#resend-and-netlify-dns).
- **`SessionManager`** and **`LoginCodeManager`** each own one Directus collection and its lifecycle rules.

---

## Authentication model (read this first)

There are **two independent identity systems** — keep them separate:

|           | Admin / researcher login                                            | Public API keys                                           |
| --------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| Who       | Internal users in `apa_users`                                       | External data consumers in `apa_api_clients`              |
| Mechanism | Passwordless **email login codes** → server-side **session cookie** | Long-lived **API key** sent as `x-api-key`                |
| Owned by  | `AuthService` + `LoginCodeManager` + `SessionManager`               | `requireApiKey.js` + `DirectusService` API-client helpers |

**This document covers the first system.** The API-key path is only touched where `DirectusService` exposes helpers for it.

The login flow end-to-end:

```
1. requestLoginCode(email)
   AuthService → finds apa_user → LoginCodeManager.createCode (hashed, 10-min TTL)
              → emails the plaintext code via Resend

2. verifyLoginCode(email, code, cookies)
   AuthService → LoginCodeManager.verifyCode (single-use, max 5 attempts)
              → SessionManager.createSession (8-hour sliding TTL)
              → sets httpOnly `session_id` cookie

3. every subsequent request
   hooks.server.js → AuthService.getSessionFromCookies → SessionManager.getSession
                   → populates event.locals.user
```

---

## DirectusService

**File:** `src/lib/server/services/directusService.js`

The single gateway to the Directus REST API. Every other service and route goes through it; there is no Directus SDK. It wraps `fetch`, handles auth headers and JSON, and exposes generic CRUD plus a handful of domain-specific helpers for users and API clients.

### Request handling

- **`#request(path, { method, body, token })`** _(private)_ — performs the `fetch` against `${DIRECTUS_URL}${path}`.
  - Adds `Authorization: Bearer <token>` only when a non-empty token is passed.
  - Serializes `body` to JSON and sets `Content-Type` when a body is present.
  - On a non-2xx response, **throws** `Error("Directus request failed (<status>): <body>")`.
  - Returns `null` for `204 No Content`; otherwise parses and returns the JSON (or `null` for an empty body).

### Authentication

- **`getServerToken()`** — returns the trimmed `DIRECTUS_ADMIN_TOKEN` from the environment (`$env/dynamic/private`). **Throws** if it is missing. This is the token used for all server-to-server (admin-privileged) calls.

> **Token convention:** Calls that must be authorized pass `{ token: DirectusService.getServerToken() }`. Calls intended for **public/unauthenticated** reads (e.g. resolving a city for the public map) pass **no token** and rely on the Directus PUBLIC role's read permissions.

### Generic CRUD

All collection methods take an optional `options.token`.

| Method                                                      | HTTP                     | Returns                                                                     |
| ----------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `getContent(collection, queryOrOptions?, options?)`         | `GET /items/<c>?<query>` | the `data` **array** (always an array, `[]` if absent)                      |
| `getContentWithMeta(collection, queryOrOptions?, options?)` | `GET`                    | `{ data: [], meta }` — use when you need `meta.filter_count` for pagination |
| `postContent(collection, body, options?)`                   | `POST`                   | raw Directus response (`{ data }`)                                          |
| `updateContent(collection, id, body, options?)`             | `PATCH /items/<c>/<id>`  | raw response                                                                |
| `deleteContent(collection, id, options?)`                   | `DELETE /items/<c>/<id>` | `null`                                                                      |

`getContent` / `getContentWithMeta` accept **either** a query string (`'filter[x][_eq]=1&limit=10'`) **or** an options object as the second argument — a small overload so callers that only need a token can skip the empty-string query.

### Domain helpers

Built on top of the generic CRUD for the two identity collections:

**Users (`apa_users`)**

- `getUsers(queryOrOptions?, options?)` — list users; supports a `roleName` shorthand that appends a role filter.
- `createUser({ email, role = 'researcher', active = true }, options?)` — passwordless: creating a user simply **authorizes an email** for login-code sign-in. Stores both `email` and a lowercased `email_lower` (the lookup key). Throws if email is empty.
- `deleteUser(id, options?)`.
- `getApaUserByEmailLower(emailLower, options?)` — the primary login lookup (single row or `null`).

**API clients (`apa_api_clients`)** — supports the public API-key self-service flow:

- `getApiKeyByEmailLower(emailLower, options?)`.
- `upsertApiKeyRequest({ email, emailLower, verifyCodeHash, verifyExpiresAt }, options?)` — (re)requesting **resets** verification and clears any previously issued key (`verified: false`, `api_key_hash: null`). Updates the existing row or creates a new one.
- `issueApiKey({ id, apiKeyHash }, options?)` — marks the client `verified: true`, stores the key **hash**, and clears the verification code/expiry.

### Notes & gotchas

- `DIRECTUS_URL` is imported from `src/lib/server/directus.js`, which re-exports it from `src/lib/constants.js` (hardcoded, **not** an env var — the CSP config needs it at load time).
- Errors are thrown, not swallowed — callers (page loads, API endpoints) are responsible for catching and translating to HTTP responses.
- Email is always normalized to `email_lower` for lookups so casing never causes a miss.

---

## CityService

**File:** `src/lib/server/services/cityService.js`

The read-oriented data layer for **city-scoped content**. It enforces the multi-city model: every query is filtered by city so a page can never render another city's (or empty) data. All functions take an optional `{ token }` and default to public (tokenless) reads unless a caller passes one.

### Functions

- **`resolveCity(slug, options?)`** → `city row | null`
  Looks up `apa_cities` by `slug` (trimmed, lowercased, `limit=1`). Returns `null` for empty/unknown slugs. Called once per request in `src/routes/[city]/+layout.server.js`, which throws `404` when it returns `null`. **No token** is passed, so the PUBLIC Directus role must have read access on `apa_cities`.

- **`listCities(options?)`** → `city[]`
  Active cities (`filter[active][_eq]=true`), sorted by `name`. Powers the `/` city picker.

- **`getCityData(cityId, { token, includeMeasurements = true, pointsQuery, measurementsQuery })`** → `{ points, measurements }`
  Fetches a city's `apa_sampling_points` (forced `filter[city][_eq]=<cityId>`, `limit=-1` unless overridden), then optionally the measurements for **only those points** via `filter[sampling_point][_in]=<point ids>`. This is the core of the city model: **measurements have no `city` field** — they inherit it through their sampling point. Returns early with `measurements: []` if measurements are excluded or there are no points.

- **`getCityTubes(cityId, { token, query })`** → `tube[]`
  A city's `apa_tubes`, filtered by `city`. Tubes are a **per-city inventory**, so the admin tube dropdown only offers the current city's tubes.

### Design rationale

- City scoping is applied by **forcing** the `filter[city][_eq]` (and `limit`) onto whatever query the caller supplies via `URLSearchParams` — callers can add sorting/extra filters, but cannot accidentally drop the city scope.
- Because every query is city-scoped, `point_number` and tube `code` only need to be unique **per city**, not globally.

---

## AuthService

**File:** `src/lib/server/services/authService.js`

Orchestrates passwordless authentication for `apa_users`. It owns the cookie and ties together `LoginCodeManager` (one-time codes), `SessionManager` (sessions), and Resend (email). It holds no state of its own.

### Constants & dev switch

- `SESSION_COOKIE = 'session_id'`, httpOnly, `secure` outside dev, `sameSite: 'lax'`, `maxAge` derived from `SessionManager.ttlMs`.
- **`devExposeLoginCode()`** — returns `true` only when `dev === true` **and** `DEV_SHOW_LOGIN_CODE === 'true'`. Double-gated so the code can never leak in production even if the flag is left set. When on, the login code is returned in the response so you can sign in without working email.

### Methods

- **`requestLoginCode(email)`** → `{ success, expiresAt?, emailLower?, devCode?, error? }`
  1. Normalizes the email; rejects if empty.
  2. Looks up the `apa_user` by `email_lower`; rejects if not found or `active === false`.
  3. `LoginCodeManager.createCode(user.id)` → emails the plaintext code via `#sendLoginCodeEmail`.
  4. If email fails **and** dev code-exposure is on, it logs and continues (returns `devCode`) instead of failing; otherwise the error propagates.

- **`verifyLoginCode(email, code, cookies)`** → `{ success, session?, error? }`
  1. Validates inputs; re-checks the user exists and is active (returns a generic "Invalid or expired code" to avoid leaking which step failed).
  2. `LoginCodeManager.verifyCode(user.id, code)` — rejects on failure.
  3. `SessionManager.createSession(user.id)` → sets the session cookie.
  4. Updates `last_login_at` **fire-and-forget** (errors logged, not awaited into the response).

- **`getSessionFromCookies(cookies)`** → `session | null`
  Reads `session_id`, calls `SessionManager.getSession(token, { touch: true })`. If the session is gone/expired, **deletes the cookie** and returns `null`; otherwise re-sets the cookie (sliding expiry) and returns the session. Called from `hooks.server.js` on every request.

- **`logout(cookies)`** — deletes the session row (if any) and clears the cookie.

### Private helpers

- `#normalizeEmail` — `{ email, emailLower }` or `null`.
- `#setSessionCookie` / `#sendLoginCodeEmail` (throws if `FROM_EMAIL` missing; sends via Resend) / `#updateLoginTimestamp`.

### Security notes

- Error messages are intentionally **generic** on the verify path so an attacker can't distinguish "no such user" from "wrong code".
- The plaintext login code is **only** ever sent by email (or surfaced in dev via the gated flag) — only the hash is stored.

---

## SessionManager

**File:** `src/lib/server/services/sessionManager.js`
**Collection:** `apa_sessions`

Owns server-side session lifecycle. Sessions are opaque random tokens stored in Directus; the cookie holds only the token.

- **TTL:** `SESSION_TTL_MS = 8 hours`, **sliding** — refreshed on every authenticated request. Exposed via the static getter **`ttlMs`** (used by `AuthService` to set the cookie `maxAge`).
- **Token:** `crypto.randomBytes(32).toString('hex')` (64 hex chars).
- **Field expansion:** `getSession` fetches the session row **and** its related `apa_user` in a single request via a `fields=` expression (`user.id`, `user.email`, `user.role`, `user.active`, …), avoiding a second round-trip.

### Methods

- **`createSession(userId)`** → `{ token, expiresAt }`
  Generates a token, inserts a row (`token`, `user`, `last_seen_at`, `expires_at`) using the **server token**. Throws if `userId` is empty.

- **`getSession(sessionToken, { touch = true })`** → `{ token, user } | null`
  Looks up by token. Returns `null` (and **deletes** the row) if expired. **Revokes immediately** if the related user is `active === false` — a deactivated user is logged out mid-session; a reactivated user just logs in again. When `touch` is set, slides `expires_at`/`last_seen_at` forward. The returned `user` is normalized (see below).

- **`deleteSession(sessionToken)`** — best-effort delete by token (looks up the id, then deletes).

### `normalizeUser(user)`

Maps the raw expanded `apa_users` row to the shape exposed on `event.locals.user`: `{ id, email, emailLower, role, active, lastLoginAt }`. This is the canonical user shape the rest of the app sees — keep it stable.

---

## LoginCodeManager

**File:** `src/lib/server/services/loginCodeManager.js`
**Collection:** `apa_login_codes`

Owns one-time login codes: generation, hashing, verification, and anti-brute-force rules.

- **TTL:** `CODE_TTL_MS = 10 minutes` (getter `ttlMs`).
- **Attempts:** `MAX_ATTEMPTS = 5`.
- **Hashing:** codes are hashed with **bcryptjs** (`generateCode` returns `{ plain, hash }`); only the hash is stored. Verification uses `compare`.

### Methods

- **`createCode(userId)`** → `{ code, expiresAt }`
  Generates a code, stores `{ user, code_hash, expires_at }`. Returns the **plaintext** code (for emailing only) plus ISO expiry. Throws if `userId` is empty.

- **`verifyCode(userId, code)`** → `{ ok, error? }`
  1. Fetches the **newest unused, unexpired** code for the user (`used_at` null, `expires_at` in future, `sort=-date_created`, `limit=1`).
  2. If attempts already `>= MAX_ATTEMPTS`, **burns** the code (`used_at = now`) and rejects.
  3. `bcrypt.compare` the submitted code:
     - **Wrong:** increment `attempts`; burn the code once the cap is reached; reject with a generic message.
     - **Correct:** mark `used_at = now` (**single-use**, replay-proof) and return `{ ok: true }`.

### Design rationale

- **Single-use + attempt cap + short TTL** together defend against replay and brute force. The "burn on cap" ensures a guessed-at code can't be retried even within its TTL window.
- Always operates on the **latest** code, so requesting a new code effectively supersedes older outstanding ones.

---

## Cross-cutting conventions

- **Static-class services, no instances.** Call `ServiceName.method(...)`.
- **Errors throw; callers translate.** Services raise `Error`; route loads / endpoints catch and map to HTTP status. Don't swallow errors inside services.
- **Email is the identity key**, always matched on `email_lower`.
- **Server token vs. public read.** Privileged operations pass `{ token: DirectusService.getServerToken() }`; genuinely public reads pass no token and depend on the Directus PUBLIC role.
- **Secrets in, hashes out.** Login codes and API keys exist in plaintext only in transit (email/response); Directus stores only bcrypt/SHA hashes.

## Where these are used

| Service            | Primary callers                                                     |
| ------------------ | ------------------------------------------------------------------- |
| `DirectusService`  | every other service + all API route handlers                        |
| `CityService`      | `[city]/+layout.server.js`, page loads, public API, admin endpoints |
| `AuthService`      | `hooks.server.js`, `[city]/admin/login` & `logout` actions          |
| `SessionManager`   | `AuthService`, `hooks.server.js` (indirectly)                       |
| `LoginCodeManager` | `AuthService`                                                       |
