# cseed website

The public site for **cseed**: a static [Astro](https://astro.build) build of the **cseed Design
System** project on claude.ai/design (`3791785c-c2a3-433c-a867-ce4c93168d27`). Every page is a direct
port of one of that project's `ui_kits/`, with the same sections, copy, colors, type, and spacing.

| Route          | Source ui_kit              | What's on it                                                        |
| -------------- | -------------------------- | ------------------------------------------------------------------- |
| `/`            | `ui_kits/landing-page`     | Photo hero, programs collage, community band, partners, footer      |
| `/about-us/`   | `ui_kits/about-us`         | Stats, "build things you imagine.", meet-the-team wall               |
| `/buildspace/` | `ui_kits/buildspace`       | Animated "join cohort 6." space scene, tracks, past projects         |
| `/join/`       | `ui_kits/join`             | Become-a-member intro, 3-step application, database-backed names wall |
| `/saturdays/`  | `ui_kits/saturdays`        | Live countdown to next Saturday 1pm, FAQ                             |

Real assets so far: the hero photo, the partner logos (`public/images/sponsors/`) and the team
headshots (`public/images/team/`, listed in `src/data/community.ts`). Everything else that needs a
photo (programs collage, community band, projects) is still a placeholder sized exactly where the real
image goes. Past projects use placeholder data. The join page's member wall uses a protected names-only Cloudflare export.

## Launching the site

```bash
npm install
npm run dev
```

Then open **http://localhost:4321**. All five pages are linked from the nav and footer.

| Command            | What it does                                            |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload at `localhost:4321`            |
| `npm run build`     | Production build into `dist/`                             |
| `npm run preview`   | Serve the built `dist/` locally, to check the real output |
| `npm run check`     | Typecheck `.astro` and `.ts` files                        |

The join form sends JSON directly to a separate Cloudflare Worker, which stores membership
records in Cloudflare D1. The frontend remains static Astro. See
[backend setup and migrations](backend/README.md) for the one-time Cloudflare setup,
push-triggered schema deployment, request limits, and API contract. Set
both frontend settings before building (see `.env.example` and the setup below).
No submitted membership records are written to this repository.

## How it's built

The source design is authored on a **fixed 2083px canvas**, not a fluid layout. To reproduce it
exactly, each page lives inside one `.canvas` element that's scaled as a single unit with CSS
`zoom: min(1, viewportWidth / 2083)` (see the script in `src/layouts/BaseLayout.astro`). That's the
same approach the source prototypes use.

There's no client-side framework. Pages are static Astro markup with scoped styles; hover states are
plain CSS. The interactive bits the source implements in React are small vanilla-JS scripts:

- `BaseLayout.astro`: canvas zoom, scroll-in reveals, the landing page's nav fading in after the hero,
  smooth in-page anchor scrolling
- `join.astro`: the stepped application, custom dropdowns, chips, and adding you to the members wall
- `saturdays.astro`: the countdown timer
- `about-us.astro` / `buildspace.astro`: the cursor-following "linkedin ↗" and track-note tooltips

## Where things go

```
src/
├── components/
│   ├── core/          Arrow, BodyText, ProgramImage, Reveal, Rule, SectionHeading,
│   │                  SponsorLogo, TextLink, Wordmark (the design system's core set)
│   ├── navigation/    NavBar, DropdownNav
│   ├── sections/      Hero, MissionPrompt, SponsorStrip
│   ├── landing/       ProgramsCollage, CommunityBand, Polaroid, Footer (Footer is shared by every page)
│   ├── buildspace/    TrackIcon (the five cohort-06 track marks)
│   └── join/          Field, SelectField, FormBlock
├── data/
│   └── community.ts   Team, stats, and the seeded members list
├── layouts/
│   ├── BaseLayout.astro   <head>, global styles, shared page script
│   └── PageLayout.astro   Fixed nav + footer shell used by every page except `/`
├── pages/             index, about-us, buildspace, join, saturdays -- one file per route
└── styles/
    ├── global.css     Reset, placeholders, shared type classes, reveal animations
    └── tokens/        colors, typography, layout, motion, fonts -- ported 1:1 from the design system
```

## Deploying

For each repository created from this template, open **Settings > Secrets and
variables > Actions > New repository secret** and add:

- `PUBLIC_MEMBERSHIP_API_URL`: your deployed Worker URL ending in `/api/membership`.
- `PUBLIC_TURNSTILE_SITE_KEY`: your Cloudflare Turnstile widget's public site key.
- `MEMBER_NAMES_EXPORT_URL`: the Worker HTTPS URL ending in `/internal/member-names`.
- `MEMBER_NAMES_EXPORT_TOKEN`: the same random secret stored on the Worker.
- `CLOUDFLARE_API_TOKEN`: scoped to your account with Cloudflare Pages Edit
  (and the existing Workers/D1 permissions if sharing the backend deployment token).
- `CLOUDFLARE_ACCOUNT_ID`: the account owning your Pages project.

Add repository **variable** `CLOUDFLARE_PAGES_PROJECT` with the existing Pages
project name, and set its production branch to `main`.

The **Build frontend** workflow fetches only display names during the Astro build,
uploads `frontend-dist`, and publishes `dist/` to Cloudflare Pages. It runs on
frontend pushes to `main`, after signups via the Worker, manually, and hourly for
recovery. Missing settings or failed exports block deployment. Only the two
`PUBLIC_` settings are visible in browser code; export credentials stay build-only.

For a Git-integrated Cloudflare Pages project, disable automatic production and
preview builds in Pages settings so its separate build pipeline cannot overwrite
the GitHub-produced deployment. Wrangler can deploy to an existing Git-integrated
project. See [Cloudflare's CI upload guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
After changing a secret, rerun **Build frontend**. See the
[backend member-wall setup](backend/README.md#automatic-public-member-wall) for
the Worker secrets, migration, and retry behavior.

For local development, copy `.env.example` to the ignored `.env` file and fill in
your values. Keep `TURNSTILE_SECRET_KEY` separately in Cloudflare Worker secrets;
it must never enter the frontend build.

`npm run build` produces a fully static `dist/` folder that any static host can serve (Cloudflare
Pages, Netlify, Vercel, GitHub Pages).
