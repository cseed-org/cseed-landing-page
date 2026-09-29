# Membership API

Cloudflare Worker + D1 behind the `/join/` form and member wall. Two Workers total:

| Worker                 | Config                       | What                                         | Deployed by                   |
| ---------------------- | ---------------------------- | -------------------------------------------- | ----------------------------- |
| `cseed-membership-api` | `backend/wrangler.jsonc`     | API + D1 + daily cron                        | GitHub Actions (push to main) |
| `cseed-site`           | `wrangler.jsonc` (repo root) | Static Astro site (`dist/` as static assets) | Cloudflare Workers Builds     |

- Browser → API `POST /api/membership` → D1 (`People`, `Membership_submissions`)
- Daily (midnight Pacific) → API calls site deploy hook if members changed → site build
  fetches names from `GET /internal/member-names` → deploy
- Independent packages. Frontend (repo root) and backend share no code/deps.

## Layout

```
backend/
├── src/
│   ├── index.js           Router, CORS/origin, rate limits, body cap, D1 writes, daily cron
│   ├── appropriateness.js Field validation (types, required, allowed values, lengths)
│   ├── cleaning.js        Unicode/whitespace normalization
│   ├── turnstile.js       Turnstile Siteverify
│   └── member-wall.js     Names-only export + site deploy hook trigger
├── migrations/            D1 schema (0001 membership, 0002 member wall)
├── test/                  node:test, synthetic data, in-memory SQLite
└── wrangler.jsonc         API Worker config, D1 binding, rate limits, cron
```

## Config reference

Production forms submit to `/api/membership` on the site origin. The root
`wrangler.jsonc` binds `MEMBERSHIP_API` to `cseed-membership-api`; deploy the backend
before the site. The site Worker redirects `www.cseed.co` to `cseed.co` before
loading the form, keeping Turnstile on the canonical hostname. Both origins remain
in the API allowlist for already-open forms. `PUBLIC_MEMBERSHIP_API_URL` now only
overrides the endpoint in local Astro development; it is not needed in production.
Keep the Turnstile site key configured for `cseed.co` (and any development host).

**API Worker vars** (`backend/wrangler.jsonc` → `vars`)

| Name                  | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `ALLOWED_ORIGINS`     | Exact site origin(s), comma-separated, no trailing slash      |
| `SUBMISSIONS_ENABLED` | `"true"` to accept signups. Anything else = kill switch (503) |

Also in `backend/wrangler.jsonc`: `database_id` (D1 UUID), rate limiters, daily cron
`0 7 * * *` (07:00 UTC = midnight PDT / 11pm PST; edit to change refresh time).

**API Worker secrets** (`npx wrangler secret put <NAME>`, run in `backend/`)

| Name                        | What                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `TURNSTILE_SECRET_KEY`      | Turnstile widget secret. Missing → all submissions fail      |
| `MEMBER_NAMES_EXPORT_TOKEN` | Random bearer secret for `/internal/member-names`            |
| `SITE_DEPLOY_HOOK_URL`      | Site Worker deploy hook. Missing → member wall never updates |

**Site build variables**: see [setup step D](#d-cloudflare-dashboard-site-build-variables).
**GitHub Actions secrets**: see [setup step C](#c-github-website-repo-settings--secrets-and-variables--actions).

Public settings may reach browser code. Never prefix secrets with `PUBLIC_`.

## One-time setup

**Where things live:** Cloudflare owns the DB (D1), both Workers, and all secrets.
Your PC stores nothing. It only runs `wrangler`, a CLI that sends commands to your
Cloudflare account. After setup, pushes to `main` deploy automatically. PC not needed.

| Step | Where                | What                                                |
| ---- | -------------------- | --------------------------------------------------- |
| A    | Cloudflare dashboard | API token, Turnstile widget, site Worker + hook     |
| B    | Your PC (`wrangler`) | Create DB + API Worker on Cloudflare, store secrets |
| C    | GitHub website       | Secrets for API auto-deploy                         |
| D    | Cloudflare dashboard | Site build variables, first build                   |

Before starting: root `wrangler.jsonc` must be on `main` (site Worker config).

### A. Cloudflare dashboard (dash.cloudflare.com)

1. Copy **Account ID** (account home → right sidebar) → needed in C
2. **API token**: My Profile → API Tokens → Create → Custom. Account permissions:
   Workers Scripts Edit, D1 Edit → needed in C
3. **Site Worker (Git-integrated, auto-pulls on push)**: Workers & Pages → **Create application**
   → **Import a repository** → Get started → GitHub → pick this repo.
   - Project name: `cseed-site` (must match `name` in root `wrangler.jsonc`)
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (default)
   - Root directory: `/` (default). No branch picker here: uses repo's default branch
   - Build variables: skip for now; added in D (values come from B)
   - Save and Deploy. First build fails until D done. Expected
   - After creation, Settings → Build → **Branch control**:
     - Production branch dropdown: confirm/select `main`
     - Uncheck **Enable Preview Builds** (previews need the same secrets)
   - Repo or `main` missing from lists → GitHub → org `cseed-org` Settings → GitHub Apps →
     Cloudflare Workers and Pages → grant access to this repo (needs org owner)
   - Note site URL: `https://cseed-site.<SUBDOMAIN>.workers.dev`, or add a custom domain
     (Settings → Domains & Routes). Used for Turnstile + `ALLOWED_ORIGINS`
4. **Deploy hook**: site Worker → Settings → Builds → Deploy Hooks. Name `member-wall`, branch
   `main` → Create. Copy URL (used in B). Treat as secret: anyone with it can trigger builds
5. **Turnstile**: Turnstile → Add widget, hostname = site domain (A3). Copy site key + secret key

If site has a CSP: allow `https://challenges.cloudflare.com` in `script-src` + `frame-src`.

### B. Your PC (one time, from `backend/`)

```bash
cd backend
npm ci
npx wrangler login                       # browser login, links CLI to your account
npx wrangler d1 create cseed-membership  # creates DB on Cloudflare, prints database_id
```

Edit `backend/wrangler.jsonc`: paste `database_id`, set `ALLOWED_ORIGINS` to site origin (A3).
Then:

```bash
npm run deploy   # runs migrations on the Cloudflare DB + creates API Worker; prints its URL
npx wrangler secret put TURNSTILE_SECRET_KEY       # paste Turnstile secret (A5)
npx wrangler secret put SITE_DEPLOY_HOOK_URL       # paste deploy hook URL (A4)
npx wrangler secret put MEMBER_NAMES_EXPORT_TOKEN  # paste new random value, keep a copy
```

Random value: `openssl rand -base64 32` (or any ≥32-byte random string).
Commit + push `backend/wrangler.jsonc`.

### C. GitHub website: repo Settings → Secrets and variables → Actions

| Name                    | Value |
| ----------------------- | ----- |
| `CLOUDFLARE_API_TOKEN`  | A2    |
| `CLOUDFLARE_ACCOUNT_ID` | A1    |

Used only to auto-deploy the API Worker + run migrations. Site builds need no GitHub secrets.

### D. Cloudflare dashboard: site build variables

Site Worker → Settings → Build → **Variables and secrets** (build-time, not runtime):

| Name                        | Type   | Value                                         |
| --------------------------- | ------ | --------------------------------------------- |
| `NODE_VERSION`              | text   | `22`                                          |
| `PUBLIC_TURNSTILE_SITE_KEY` | text   | A5 site key                                   |
| `MEMBER_NAMES_EXPORT_URL`   | secret | API Worker URL (B) + `/internal/member-names` |
| `MEMBER_NAMES_EXPORT_TOKEN` | secret | same random value as B                        |

Then Deployments → retry latest build (or push to `main`). Site live.

**After setup:** push to `main` → API redeploys via GitHub Actions, site rebuilds via Workers
Builds. Member wall rebuilds once a day, only if members changed. New migrations run on
Cloudflare's DB via GitHub Actions, not your PC.

Staging: use separate Turnstile widget, Workers, and D1 DB. Never test against production DB.

## Local dev

Backend (`backend/`):

```bash
npm test              # synthetic data, in-memory SQLite
npm run deploy:check  # bundle check, no deploy
```

Frontend (repo root): copy `.env.example` → `.env`, fill both `PUBLIC_` values. Leave
`MEMBER_NAMES_EXPORT_*` unset → empty wall in dev (production builds fail without them).
`TURNSTILE_SECRET_KEY` never goes in `.env`.

No real member data in local emulators, fixtures, logs, or screenshots.

## Deploy pipeline

| What                          | Trigger                                        | Does                                                |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Workers Builds: `cseed-site`  | push to `main`; deploy hook (daily); dashboard | `npm run build` (fetches names) → `wrangler deploy` |
| GitHub: Deploy membership API | push to `main` touching `backend/**`; manual   | `npm ci` → `npm test` → migrate remote D1 → deploy  |
| GitHub: Check frontend        | push to `main` touching frontend; PRs; manual  | `npm run check` only, no deploy                     |

One site build per push, max one per day for the member wall. Missing build variables fail
the build; last good deploy stays live. After changing a build variable, retry latest build.

## Member wall flow

1. Signup saved → D1 trigger bumps `Member_wall_sync.revision` (same on rename/delete in `People`)
2. Daily cron: `revision` > `dispatched_revision`? → API POSTs site deploy hook (empty body,
   no member data). No changes → no build
3. On success, `dispatched_revision` advanced. Failure → retried next day (or manually: site
   Worker → Deployments, or POST the hook URL)
4. Site build calls `/internal/member-names` → escapes names into static HTML
   (`src/data/member-names.mjs`)
5. `wrangler deploy` publishes `dist/`. Failed build → retry from dashboard (no auto-recovery)

Display name = `preferred_name` (else `first_name`) + `last_name`, normalized, deduped, sorted.
Count shown = unique names. Signup user sees own name immediately (browser-side only);
everyone else after next daily build. Code pushes to `main` also rebuild → include new names.

## API

### `POST /api/membership`

JSON only, ≤16 KiB, `Origin` must be in `ALLOWED_ORIGINS`.

| Field                     | Req | Notes                                                                                            |
| ------------------------- | --- | ------------------------------------------------------------------------------------------------ |
| `submission_id`           | ✓   | UUID v4 from browser. Also `person_id`. Retry with same ID = no-op                               |
| `first_name`, `last_name` | ✓   | ≤100                                                                                             |
| `major`                   | ✓   | ≤160, custom allowed                                                                             |
| `grad_year`               | ✓   | `Winter\|Spring\|Summer\|Autumn YYYY`, current UTC year to +5                                    |
| `why`                     | ✓   | ≤1000                                                                                            |
| `code_of_conduct`         | ✓   | must be `true`                                                                                   |
| `turnstile_token`         | ✓   | fresh per request (single-use)                                                                   |
| `cs_email` / `uw_email`   | ✓   | CSE majors → `cs_email` (`@cs.washington.edu`), others → `uw_email` (`@uw.edu`). Other one empty |
| `preferred_name`          |     | ≤100                                                                                             |
| `pronouns`                |     | ≤80                                                                                              |
| `demographics`            |     | ≤160                                                                                             |
| `campus`                  |     | `Seattle`, `Bothell`, `Tacoma`                                                                   |
| `heard_about`             |     | array of listed choices                                                                          |
| `heard_other`             |     | ≤200, required iff `other...` selected                                                           |
| `more`                    |     | ≤3000, line breaks kept                                                                          |
| `photo_consent`           |     | boolean                                                                                          |
| `website`                 |     | honeypot, must be empty                                                                          |

Unknown fields (incl. `personal_email`, officer flag) → reject whole request.
CSE majors: Computer Science, Computer Engineering, Electrical Engineering, Intended CSE.

| Status | When                                                         |
| ------ | ------------------------------------------------------------ |
| 201    | `{ "ok": true }` saved                                       |
| 204    | CORS preflight                                               |
| 400    | validation / bad JSON                                        |
| 403    | origin not allowed, no client IP, Turnstile failed           |
| 404    | unknown route                                                |
| 405    | not POST                                                     |
| 413    | body >16 KiB                                                 |
| 415    | not `application/json`                                       |
| 429    | rate limited (`Retry-After: 60`)                             |
| 503    | `SUBMISSIONS_ENABLED` off, missing config, D1/Turnstile down |

### `GET /internal/member-names`

`Authorization: Bearer <MEMBER_NAMES_EXPORT_TOKEN>`. No CORS (build server only).
Returns `{ "names": [...] }` — SQL selects display name only. 401 bad token, 503 unconfigured/DB error.

## Schema

| Table                          | Purpose                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `People`                       | One row per member. Form fields + `join_date`, `agreed_to_membership_agreement`, `has_been_cseed_officer` (0/1, admin-only), `personal_email` (unused by form) |
| `Membership_submissions`       | Cleaned full answers as `payload_json`, linked to `People`. No raw body/token/honeypot                                                                         |
| `Graduation_email_submissions` | For future grad follow-up form (not implemented). History per person                                                                                           |
| `Member_wall_sync`             | Singleton `revision` / `dispatched_revision` counters. No member data                                                                                          |

- Both signup inserts in one atomic D1 batch. Timestamps server UTC.
- DB triggers enforce `uw_email` → `@uw.edu`, `cs_email` → `@cs.washington.edu` on insert/update.
- Same email submitted twice = two people (no dedup yet).
- `grad_year` options are baked into static frontend → rebuild each year.

## Validation & abuse controls

- Rate limits: 5/min per IP, 100/min per Cloudflare location (approximate). Tune for shared campus IPs
- Missing limiter bindings / Turnstile secret → fail closed
- Turnstile: must pass, action `membership`, hostname = request origin, 8s timeout, no fail-open
- Text: NFC, trimmed, whitespace collapsed; emails lowercased. Rejects `<`, `>`, control/bidi chars
- Structural validation only, not moderation. Escape on any future display
- Origin check is browser-only protection; email domain ≠ proven ownership

## Migrations

- Add new numbered file in `migrations/`. Never edit an applied one
- Migrations run **before** Worker deploy → keep compatible with currently deployed Worker
- Failed deploy after migration does not roll back schema
- `0001_membership.sql` is a fresh-DB baseline; doesn't upgrade DBs that ran older pre-launch files

Docs: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[workflow dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

## Privacy rules

- Only schema + code in Git. Workflows never export/download/commit records
- Worker never logs bodies, IPs, or DB errors
- Export exposes display names only; token grants nothing else
- `CLOUDFLARE_API_TOKEN` has D1 admin rights → secrets for trusted maintainers only
- Ignored: DB files, Wrangler state, local secrets, `backend/exports/`

## Troubleshooting

| Symptom                               | Fix                                                                |
| ------------------------------------- | ------------------------------------------------------------------ |
| 403 "Origin not allowed"              | `ALLOWED_ORIGINS` exact match, no trailing slash, redeploy Worker  |
| 503 on every submit                   | `SUBMISSIONS_ENABLED` = `"true"`? `TURNSTILE_SECRET_KEY` set?      |
| 403 bot verification                  | Site key / secret from same widget? Hostname allowed on widget?    |
| Build fails "Configure MEMBER_NAMES…" | Set both `MEMBER_NAMES_EXPORT_*` in site build variables (D)       |
| Build fails "export failed"           | Token mismatch API Worker vs site build vars, or wrong URL         |
| Wall not updated next day             | `SITE_DEPLOY_HOOK_URL` missing/wrong/deleted; check site build log |
