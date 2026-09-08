# CSEED Landing Page — Build, Test, Deploy Pipeline

## Context

This document describes the build, test and deploy pipeline for the CSEED landing page. It was
written while the repo was still empty, so it doubles as the design record for how the site and
its pipeline were set up.

The goal is a dynamic landing page where:

1. Changes are made on a branch and opened as a PR.
2. GitHub Actions builds the site and verifies it works.
3. A real preview URL is produced for that PR, backed by a **staging** database.
4. Merging to `main` runs the same checks, then deploys to production on Cloudflare.

The site collects **contact form submissions** (name, email, message) into **Cloudflare D1**,
protected by **Cloudflare Turnstile**.

Deploy target is **Cloudflare Workers with static assets** (not Pages). A single Worker serves
the built Astro site _and_ the `/api/contact` endpoint, so there is one deploy artifact and one
place where routing, headers, and data access live.

### Two constraints that drive the design

- **Preview versions inherit top-level bindings.** A Worker preview version uses the
  `d1_databases` binding declared at the top level of the Wrangler config. If that points at
  production, every PR preview reads and writes production data. Compounding this,
  `wrangler d1 migrations apply` _without_ `--env` silently resolves against the top-level
  binding and reports success — so an unreviewed migration in a PR can land on production.
  Mitigation: bindings are declared **only** inside `env.staging` / `env.production`, never at
  top level, and every wrangler invocation in CI passes an explicit `--env`.
- **D1 free-tier limits are hard-enforced as of 2026-09-01.** Exceeding 5M row reads or 100k row
  writes per day returns errors until midnight UTC. An unprotected public POST endpoint is
  therefore an availability risk, not just a spam nuisance — hence Turnstile from day one.

---

## Architecture

```
   Astro (static)                Worker (worker/index.ts)
   src/pages/*.astro  ──build──> dist/  ──served as──> ASSETS binding
                                                            │
   Browser POST /api/contact ─────────────────────────> fetch handler
                                                            │
                                            ┌───────────────┴──────────────┐
                                    Turnstile siteverify            D1 (DB binding)
                                                                  messages table
```

`run_worker_first: ["/api/*"]` sends API paths to the Worker; everything else is served
straight from static assets without invoking Worker code.

### Environments

|           | Staging                      | Production           |
| --------- | ---------------------------- | -------------------- |
| Worker    | `cseed-landing-page-staging` | `cseed-landing-page` |
| D1        | `cseed-landing-staging`      | `cseed-landing-prod` |
| Trigger   | PR opened/updated            | push to `main`       |
| Turnstile | test key (always passes)     | real key             |

---

## Files to create

```
.github/workflows/ci.yml          PR: lint, typecheck, test, build, staging migrate, preview
.github/workflows/deploy.yml      main: same checks, prod migrate, deploy
migrations/0001_create_messages.sql
worker/index.ts                   API routes + asset fallback
worker/contact.ts                 validation + Turnstile + D1 insert
src/layouts/Base.astro
src/pages/index.astro
src/components/ContactForm.astro
test/apply-migrations.ts          vitest setup: applyD1Migrations()
test/contact.spec.ts              endpoint tests against local D1
astro.config.mjs
wrangler.jsonc
vitest.config.mts
tsconfig.json
package.json
.gitignore                        node_modules, dist, .astro, .wrangler
README.md                         setup + how to read submissions
```

`worker/` sits outside `src/` deliberately — Astro owns `src/`, and mixing the two invites
confusing build behaviour.

---

## Key file contents

### `wrangler.jsonc`

Inheritable keys (`main`, `compatibility_date`, `assets`) sit at top level and are inherited by
each environment. Non-inheritable keys (`d1_databases`, `vars`) are declared **per environment
only** — this is the isolation guarantee.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cseed-landing-page",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-04",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"],
  },
  "env": {
    "staging": {
      "name": "cseed-landing-page-staging",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "cseed-landing-staging",
          "database_id": "<filled in after creation>",
        },
      ],
    },
    "production": {
      "name": "cseed-landing-page",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "cseed-landing-prod",
          "database_id": "<filled in after creation>",
        },
      ],
    },
  },
}
```

### `migrations/0001_create_messages.sql`

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  handled    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
```

D1 migrations are forward-only with no rollback — later migrations must be additive
(`ADD COLUMN`, new tables), never destructive rewrites.

### `worker/index.ts` (shape)

```ts
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TURNSTILE_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
```

### `worker/contact.ts` — order of operations

1. Reject non-`POST`; parse `formData()`.
2. **Honeypot** — a hidden field that real users leave empty; if filled, return 204 and drop.
3. **Validate**: name 1–100 chars, email matches a basic pattern and ≤254 chars, message
   1–5000 chars. Reject oversized bodies before touching D1.
4. **Turnstile**: POST `secret`, `response` (`cf-turnstile-response`), and `remoteip`
   (`CF-Connecting-IP`) to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
   Proceed only on `success: true`. Tokens are single-use — a replay returns
   `timeout-or-duplicate`, which must be treated as failure.
5. **Insert** via prepared statement with bound parameters (never string interpolation):
   `env.DB.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)").bind(...)`.
6. Return JSON `{ ok: true }`, or a 400 with a generic message. Do not echo DB errors to the
   client.

---

## GitHub Actions

Both workflows share the same check sequence: `npm ci` → `lint` → `astro check` (typecheck) →
`vitest` → `astro build`. Deploy steps run only if all of it passes, which is the gate that
makes "test on GitHub, then deploy" real.

### `ci.yml` — pull requests

```yaml
name: CI
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: ci-${{ github.event.number }}
  cancel-in-progress: true
```

Steps: checkout → setup-node 24 (npm cache) → `npm ci` → lint → typecheck → test → build
(with the staging Turnstile site key) → then:

```yaml
- uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: d1 migrations apply DB --env staging --remote

- id: preview
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: versions upload --env staging --preview-alias pr-${{ github.event.number }}
```

Then comment the preview URL on the PR. `--preview-alias` gives a stable, predictable URL per
PR (`pr-42-cseed-landing-page-staging.<subdomain>.workers.dev`) rather than a new
commit-hash URL on every push.

`versions upload` uploads without shifting production traffic — the preview is live and real
but nothing is promoted.

### `deploy.yml` — push to `main`

```yaml
on:
  push:
    branches: [main]
concurrency:
  group: deploy-production
  cancel-in-progress: false # never interrupt a deploy mid-flight
```

Same checks, then `d1 migrations apply DB --env production --remote`, then
`deploy --env production`. Migrations run **before** the deploy so new code never meets an old
schema.

---

## One-time setup (manual, outside the repo)

1. **Create the D1 databases** and paste the returned UUIDs into `wrangler.jsonc`:
   ```
   npx wrangler d1 create cseed-landing-staging
   npx wrangler d1 create cseed-landing-prod
   ```
2. **Create a scoped API token** (dash → My Profile → API Tokens → Custom):
   `Workers Scripts: Edit`, `D1: Edit`, `Account Settings: Read`, scoped to this account only.
3. **Add repo secrets** (Settings → Secrets and variables → Actions):
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. **Create two Turnstile widgets** (staging + production). The **site key is public** and gets
   baked into the HTML at build time — add it as a repo _variable_, not a secret. The **secret
   key** is a Worker secret, set once per environment and never stored in GitHub:
   ```
   npx wrangler secret put TURNSTILE_SECRET --env staging
   npx wrangler secret put TURNSTILE_SECRET --env production
   ```
   For staging, Cloudflare's always-pass test key `1x00000000000000000000AA` avoids needing a
   real challenge in CI.
5. `gh` CLI is not installed on this machine — steps 3 and 4 are dashboard/CLI-by-hand. Not a
   blocker; `npx wrangler` covers the Cloudflare side.

---

## Things to know

- **Fork PRs get no secrets.** If `cseed-org/cseed-landing-page` is public and accepts outside
  contributions, `pull_request` runs from forks cannot access `CLOUDFLARE_API_TOKEN`, so the
  preview step will fail. The CI job guards the deploy steps with
  `if: github.event.pull_request.head.repo.full_name == github.repository` so checks still run
  on fork PRs while preview deploys are skipped. Do **not** switch to `pull_request_target` to
  work around this — it runs untrusted code with access to secrets.
- **Reading submissions back.** There is no admin UI in this plan:
  ```
  npx wrangler d1 execute cseed-landing-prod --env production --remote \
    --command "SELECT id, name, email, created_at FROM messages ORDER BY created_at DESC LIMIT 20"
  ```
  An authenticated `/admin` route is a reasonable follow-up but is out of scope here.
- **This is personal data.** Names, emails, and free-text messages are PII. Worth deciding early:
  a retention period, who on the team can query production, and whether the page needs a short
  privacy note near the form.
- **Local dev uses a local D1** (`npx wrangler dev`) — a SQLite file under `.wrangler/`, not the
  remote database. `--remote` is what distinguishes the two; `.wrangler/` is gitignored.
- **`compatibility_date` is pinned** to `2026-09-04` and should be bumped deliberately, not
  drifted.

---

## Verification

**Local, before anything is pushed:**

1. `npm install`
2. `npx wrangler d1 migrations apply DB --env staging --local` — applies schema to local D1.
3. `npm run dev` — Astro dev server for iterating on the page.
4. `npm run build && npx wrangler dev --env staging` — serves the built site _and_ the Worker
   together; this is the only local mode that exercises the real routing.
5. Submit the form at `http://localhost:8787`. Confirm the row landed:
   ```
   npx wrangler d1 execute cseed-landing-staging --env staging --local \
     --command "SELECT * FROM messages"
   ```
6. `npm test` — vitest via `@cloudflare/vitest-pool-workers`, running inside workerd against an
   isolated D1. `test/apply-migrations.ts` calls `applyD1Migrations()` in setup so tests run
   against the real schema. Cases: valid submission inserts one row; missing/invalid Turnstile
   token returns 400 and inserts nothing; honeypot filled inserts nothing; oversized message
   rejected; `GET /api/contact` returns 405.

**End-to-end, proving the pipeline:** 7. Push a branch, open a PR. Confirm: checks run, the PR gets a preview URL comment, the
preview site loads, and a form submission on it appears in **`cseed-landing-staging`** —
and _not_ in `cseed-landing-prod`. This is the isolation check; verify it explicitly by
querying both databases. 8. Deliberately break a test and push. Confirm CI goes red **and** no preview or deploy runs. 9. Merge to `main`. Confirm production migrations apply, the Worker deploys, and the live site
accepts a submission into `cseed-landing-prod`.

---

## Sources

- [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Per-branch preview deployments changelog](https://developers.cloudflare.com/changelog/post/2025-07-23-workers-preview-urls/)
- [GitHub Actions for Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [D1 environments](https://developers.cloudflare.com/d1/configuration/environments/)
- [D1 free tier enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Your PR Preview Is Talking to Your Production Database](https://medium.com/front-end-weekly/your-pr-preview-is-talking-to-your-production-database-ff7954be7896)
