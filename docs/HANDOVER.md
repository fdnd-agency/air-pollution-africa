# Project Handover — Air Pollution Africa

> A short introduction to the project for the next team. For technical depth, see [`SERVICES.md`](./SERVICES.md) (the server-side backbone) and the [`conventions/`](./conventions/) folder. For the visual design and design system, see the [design handover](./DESIGN-HANDOVER.md) from the CMD team.
>
> _Written by the outgoing internship team, 2026-06-10._

**Air Pollution Africa** measures and monitors air quality, starting with **Kumasi, Ghana**, for the client **KNMI**. It shows sampling points on a map, lets the public view and download measurement data, and gives researchers an admin dashboard. Over two sprints we migrated it from a legacy EJS/Node codebase to a **SvelteKit (Svelte 5) + Directus** stack.

| | |
|---|---|
| **Production** | https://airpollutionafrica.agency.fdnd.nl/ |
| **Dev/staging** | https://airpollutionafrica.dev.fdnd.nl/ |
| **Stack** | SvelteKit (Svelte 5, runes) + Directus (data, auth state, email via Resend) |
| **Run locally** | `npm install` → `cp example.env .env` (fill in secrets) → `npm run dev`. See §"Getting started" below. |

---

## 1. Current status

The migration to SvelteKit + Directus is **complete and live** on both the production and dev environments. The app is **multi-city**: every page lives under a `/<city>` URL prefix and is scoped to a city stored in Directus (the first city is Kumasi). The Directus schema work to support this is done — no setup is outstanding to get the app running.

In short: the project is in a **working, deployed state** and ready to be extended, not a half-finished build.

## 2. Main features (working today)

- **Multi-city routing** — a city picker at `/`, all content scoped per city under `/<city>`.
- **Public map & data pages** — sampling points on a Leaflet map plus tabular measurement data.
- **Data downloads** — export as CSV, JSON, and XLSX.
- **Public read API** — `/<city>/api/public/data`, protected by self-service API keys (request → verify by email → receive key).
- **Admin dashboard** — passwordless email-code login; CRUD for sampling points, tubes, measurements, and users.
- **Security baseline** — hashed login codes & API keys, server-side sessions, login rate limiting, and a strict Content-Security-Policy.

## 3. Biggest attention points

- **Thin test coverage.** The Vitest + Playwright harness is wired up and runs in CI, but real coverage of the server services (auth, city scoping, API filtering, exports) is minimal. This is the main quality gap and the most valuable place to invest early.
- **Directus is the source of truth for the schema.** Collections and permissions live in the shared FDND Directus instance, not in the repo — there are no migrations checked in. Coordinate schema changes carefully.
- **Access depends on FDND.** All secrets and hosting (Directus token, Resend key, deploy process) are held by the FDND maintainer — your first need will be to get access from them.
- **Roles are city-scoped.** `researcher` and `admin` users must have an `apa_users.city` relation. The `superadmin` role is global and should only be assigned to trusted maintainers.

## 4. Recommended first steps

1. **Get oriented.** Get access from the FDND maintainer, run the app locally, and click through it end-to-end (city picker → public pages → admin dashboard). Use `DEV_SHOW_LOGIN_CODE=true` to log in without a working mail setup. Then read [`SERVICES.md`](./SERVICES.md) — `cityService`, `directusService`, and `authService` are the spine of the app.
2. **Build out tests.** Coverage of the server services (auth, city scoping, API filtering, exports) is the main quality gap — start here once you're oriented.
3. **Keep city-scoped authorization maintained.** `researcher` and `admin` users are tied to one city, while trusted `superadmin` users span all cities. Keep the Directus schema, existing user assignments, and application checks aligned when adding new admin endpoints.

---

## Getting started

**Prerequisites:** Node.js **22.x**, and access to the FDND Directus instance + the secrets below (request from the FDND maintainer).

```bash
npm install            # also installs Playwright Chromium via postinstall
cp example.env .env    # then fill in the values
npm run dev            # or `npm start` (dev server, opens the browser)
```

To get a Directus admin token: open your Directus user settings (bottom-left) → scroll down → generate a token → **save** the settings (the token only works after saving).

### Environment variables (`.env`)
Read via `$env/dynamic/private`. See `example.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DIRECTUS_ADMIN_TOKEN` | **Yes** | Token for all server-to-server Directus calls. Auth, admin, and exports fail without it. |
| `RESEND_API_KEY` | Yes (prod) | Resend API key for sending email. |
| `FROM_EMAIL` | Yes (prod) | Verified sender address (on the domain configured in Resend). |
| `DEV_SHOW_LOGIN_CODE` | No | **Dev only.** `"true"` returns the login code in the response so you can sign in without email. Hard-gated off in production. |

> `DIRECTUS_URL` is **not** an env var — it's hardcoded in `src/lib/constants.js` (the CSP config needs it at load time). Change it there if the instance ever moves.

### Resend and Netlify DNS

The application sends passwordless login codes and public API-key verification emails through Resend. The sending domain is configured in Resend and its DNS records are managed through Netlify DNS.

#### Resend setup

1. In Resend, open **Domains** and add the sending domain.
2. Use the domain intended for application mail, for example `contact.example.org`.
3. Resend displays the DNS records required for verification. These commonly include DKIM records and may include SPF, return-path, or other domain-authentication records depending on the Resend configuration.
4. Copy the record names, types, values, and TTL exactly as shown by Resend. Do not replace them with generic values from this document.
5. Wait for DNS propagation and verify the domain in Resend.
6. Use a sender address on the verified domain for `FROM_EMAIL`, such as `no-reply@contact.example.org`.

Never document or commit the Resend API key. Store it only in the local ignored `.env` file and in Netlify environment variables.

#### Netlify DNS setup

1. Open the Netlify site and go to **Domain management → DNS**.
2. Add each DNS record shown in Resend to the DNS zone that is authoritative for the sending domain.
3. Check that the record name is entered relative to the domain in Netlify. Avoid accidentally duplicating the domain suffix when Netlify already appends it.
4. Do not remove existing records. In particular, preserve existing website, mail, and other verification records.
5. Return to Resend and use its domain verification check. DNS changes can take time to propagate.

#### Netlify environment variables

Configure these variables in **Site configuration → Environment variables** for every deploy context that needs to send mail:

| Variable | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | Resend API key | Secret; never commit or document the value. |
| `FROM_EMAIL` | Address on the verified Resend domain | Example: `no-reply@contact.example.org`. |

After changing an environment variable, trigger a new deploy. A successful Resend domain verification alone is not enough if the production deploy still has an old sender address or does not have `RESEND_API_KEY` configured.

#### Delivery troubleshooting

- If Resend rejects the request, check the Netlify deploy logs for `RESEND_API_KEY missing in environment.` or `FROM_EMAIL missing in environment.`.
- If the sender domain is not verified, use an address belonging to the verified domain rather than a personal or unrelated domain.
- Check Resend’s email logs for the message status, rejection reason, and recipient address.
- Also check the recipient’s spam or quarantine folder after Resend reports successful delivery.

### Project layout (orientation)
- `src/routes/[city]/` — all user-facing pages, the admin dashboard, the API, and downloads.
- `src/lib/server/services/` — the backend backbone (documented in [`SERVICES.md`](./SERVICES.md)).
- `docs/conventions/` — the FDND coding conventions this project follows.
- CI: `.github/workflows/node.js.yml` runs lint/build/test on push & PR to `main`/`dev`.
