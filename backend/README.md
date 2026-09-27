# Membership API

The Astro app stays in the repository root (`src/`, `public/`). This independent
Worker package owns the API, D1 schema, security limits, and future processing.
Neither package imports the other's code or dependencies.

## One-time setup

1. Run `npm ci` in this directory, then `npx wrangler login` and
   `npx wrangler d1 create cseed-membership` in your Cloudflare account.
2. Set the returned database UUID in `wrangler.jsonc`. Set `ALLOWED_ORIGINS`
   to the exact frontend origin, with no trailing slash (comma-separated if needed).
   Add `http://localhost:4321` only when testing the frontend against a test deployment.
3. Add GitHub Actions secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit and
   D1 Edit permissions scoped to your account) and `CLOUDFLARE_ACCOUNT_ID`.
4. Merge to `main`. The workflow tests the backend, applies unapplied SQL migrations
   to **remote Cloudflare D1**, then deploys the Worker. You can also run
   `npm run deploy` manually from this directory. Update the workflow branch if
   your production branch is different. Feature branch pushes do not deploy.
5. Set `PUBLIC_MEMBERSHIP_API_URL` in the frontend host's build environment to
   `https://cseed-membership-api.YOUR-SUBDOMAIN.workers.dev/api/membership`, then
   rebuild the Astro site. `.env.example` is the local frontend template.
6. Create a Cloudflare Turnstile widget restricted to the frontend hostnames.
   Set `PUBLIC_TURNSTILE_SITE_KEY` in the frontend build environment. From this
   directory, run `npx wrangler secret put TURNSTILE_SECRET_KEY` to store the
   matching secret on the Worker, then rebuild the frontend. Never put the secret
   in a `PUBLIC_` variable or Git. Missing configuration blocks submissions.
   Use a separate widget and Worker for staging. If your host has a CSP, allow
   `https://challenges.cloudflare.com` in `script-src` and `frame-src`.

Only schema SQL and application code belong in Git. The deployment workflow never
exports, downloads, or commits submitted records. Requests go directly from the
browser to Cloudflare; D1 stores the records. The Worker does not log request bodies
or database errors and exposes no read endpoint. No browser local/session storage
is used. Keep real submissions out of fixtures, logs, screenshots, and SQL files.
Database files, Wrangler state, local secrets, and `backend/exports/` are ignored.

## Schema and JSON contract

`People` contains `person_id`, `uw_email`, `first_name`, `last_name`,
`preferred_name`, `major`, `grad_year`, `pronouns`, `demographics`, `cs_email`,
`join_date`, `campus`, `agreed_to_membership_agreement`, and
`has_been_cseed_officer`. SQL uses snake_case for your requested column names.
The two booleans are SQLite INTEGER columns constrained to 0/1. Agreement comes
from the form's existing `code_of_conduct` checkbox and must be true to submit.
Officer history defaults to false and cannot be set through the public intake API;
it can be maintained by administrators in D1. The initial migration creates both
flags with false defaults.
Email domains are enforced by the API and database insert/update triggers:
`uw_email` must end in exactly `@uw.edu`, `cs_email` in exactly
`@cs.washington.edu` (case-insensitive). Inactive email fields may remain null.

`People.personal_email` is nullable and is not collected or populated by the join
form. `Graduation_email_submissions` stores responses for a future form sent to
selected graduating members: `submission_id`, `person_id` (foreign key to People),
`personal_email`, and `submitted_at` (UTC). Multiple submissions per person can
be retained as history. That future form/API will own recipient selection,
access verification, and updating `People.personal_email`; those features are
not implemented here. Personal emails are not restricted to UW domains.
`cs_email` holds the form's CSE email. The existing major-dependent email choice
is preserved, so the inactive email column is null. `grad_year` is TEXT to retain
the selected term/year. Accepted terms are Winter, Spring, Summer, and Autumn,
from the current UTC year through five years ahead. Rebuild the static frontend
each year to refresh its graduation options.

`Membership_submissions` retains validated, normalized answers, including the
why/referral/additional answers and consent fields, linked to People. Raw requests,
Turnstile tokens, and honeypot values are never saved. Both rows save in one
atomic D1 batch. `join_date` and `received_at` are server UTC timestamps.
The browser generates a UUID v4 `submission_id`; this also identifies the person
for this intake. Retrying the same ID is a no-op; it does not update a prior row.
Separate submissions from the same email are not deduplicated at this stage.

POST `/api/membership` requires `submission_id` (UUID v4), `first_name`,
`last_name`, `major`, `grad_year`, `why`, boolean-true `code_of_conduct`,
`turnstile_token`, and the school email selected by major. CSE majors use
`cs_email`; other majors use `uw_email`, with the inactive email empty/null.
Optional fields are `preferred_name`, `pronouns`, `demographics`, `campus`,
`more`, `heard_about` (listed referral choices), `heard_other` (required only
for the other referral choice), boolean `photo_consent`, and empty `website`
(honeypot). Unknown fields, including personal email and officer history, reject
the entire request. Verification checks success, action `membership`, and the
hostname matching the allowed request origin before any database write.
Success is HTTP 201 `{ "ok": true }`. The frontend only displays success then.

`src/cleaning.js` normalizes Unicode to NFC, trims text, collapses whitespace,
and preserves line breaks in additional notes. Emails are lowercased.
`src/appropriateness.js` enforces field types, required answers, accepted values,
and maximum lengths: names 100, pronouns 80, major/demographics 160, emails 254
(local part 64), why 1000, referral details 200, and notes 3000 characters.
Campus is Seattle, Bothell, or Tacoma. Majors/demographics retain custom answers.
Markup delimiters and unsafe control characters are rejected; punctuation,
non-Latin names, and ordinary prose are preserved. This is structural plain-text
validation, not a profanity or semantic moderation service. Future displays
must still escape output, and email domains do not prove account ownership.

## Abuse controls

The configurable templates in `wrangler.jsonc` enforce 5 requests per minute per
IP and 100 total per minute **per Cloudflare location**, before reaching D1.
Cloudflare rate limiting is approximate, not a strict global quota. Tune for
campus networks where many members may share an IP. The endpoint also enforces
a streamed 16 KiB body cap, JSON-only POSTs, an exact origin allowlist, parameterized
SQL, and a `SUBMISSIONS_ENABLED` kill switch. Missing limiter bindings fail closed.
Origin checks are browser protections; scripts can spoof an Origin header.
Turnstile is mandatory, with an eight-second Siteverify timeout and no fail-open
fallback. The frontend refreshes tokens after requests and handles expiration and
loading errors. A retry keeps the same submission UUID and answers but carries a
fresh token, since Turnstile tokens are single-use. A hidden honeypot provides an
additional cheap check. No system guarantees zero spam; email ownership checks
and optional WAF policies remain separate future protections.

## Schema changes and verification

`migrations/0001_membership.sql` is the consolidated initial schema, including all
three tables, membership flags, email-domain triggers, and the graduation index.
This pre-launch baseline is for a fresh database; it does not upgrade databases
that already recorded the earlier migration files. No remote data was changed
when consolidating these files.

Add a new numbered SQL file under `migrations/`; never rewrite a migration already
applied in production. Keep migrations compatible with the currently deployed
Worker because migrations run first. A failed deploy after a successful migration
does not roll the schema back. D1 tracks which migrations have already run.

`npm test` uses synthetic data and an in-memory SQLite database only.
`npm run deploy:check` validates Worker bundling without deploying. Do not submit
real member information through local database emulators. To test against D1,
use a separate Cloudflare test database/Worker, never the production database.

References: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
and [Workers rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
