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
- **Roles are network-wide, not city-scoped.** Today a `researcher` or `admin` user applies to the whole network rather than to a single city. In the last review we agreed this should change (see §4) — it's a known limitation to keep in mind when working on auth or the admin dashboard.

## 4. Recommended first steps

1. **Get oriented.** Get access from the FDND maintainer, run the app locally, and click through it end-to-end (city picker → public pages → admin dashboard). Use `DEV_SHOW_LOGIN_CODE=true` to log in without a working mail setup. Then read [`SERVICES.md`](./SERVICES.md) — `cityService`, `directusService`, and `authService` are the spine of the app.
2. **Build out tests.** Coverage of the server services (auth, city scoping, API filtering, exports) is the main quality gap — start here once you're oriented.
3. **Make users city-scoped + add a superadmin role.** A good first feature with real architectural value, discussed in our last review:
   - `researcher` and `admin` users should be tied to a **specific city**, not the whole network — an admin in one city shouldn't manage another's data.
   - Add a new **`superadmin`** role that *does* span all cities. It should be held by exactly one person — **Bas Mijling** (the product owner).
   - This touches the `apa_users` model (a city link + the new role), the admin dashboard guards, and the `[city]/admin` route checks.

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

### Project layout (orientation)
- `src/routes/[city]/` — all user-facing pages, the admin dashboard, the API, and downloads.
- `src/lib/server/services/` — the backend backbone (documented in [`SERVICES.md`](./SERVICES.md)).
- `docs/conventions/` — the FDND coding conventions this project follows.
- CI: `.github/workflows/node.js.yml` runs lint/build/test on push & PR to `main`/`dev`.
