# cseed website

The public site for **cseed**: a static [Astro](https://astro.build) build of the **cseed Design
System** project on claude.ai/design (`3791785c-c2a3-433c-a867-ce4c93168d27`). Every page is a direct
port of one of that project's `ui_kits/`, with the same sections, copy, colors, type, and spacing.

| Route          | Source ui_kit              | What's on it                                                        |
| -------------- | -------------------------- | ------------------------------------------------------------------- |
| `/`            | `ui_kits/landing-page`     | Photo hero, programs collage, community band, partners, footer      |
| `/about-us/`   | `ui_kits/about-us`         | Stats, "build things you imagine.", meet-the-team wall               |
| `/buildspace/` | `ui_kits/buildspace`       | Animated "join cohort 6." space scene, tracks, past projects         |
| `/join/`       | `ui_kits/join`             | Become-a-member intro, 3-step application, 1,040-name members wall   |
| `/saturdays/`  | `ui_kits/saturdays`        | Live countdown to next Saturday 1pm, FAQ                             |

Real assets so far: the hero photo, the partner logos (`public/images/sponsors/`) and the team
headshots (`public/images/team/`, listed in `src/data/community.ts`). Everything else that needs a
photo (programs collage, community band, projects) is still a placeholder sized exactly where the real
image goes. Past projects and the 1,040-name members wall are the design's own placeholder data.

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
`PUBLIC_MEMBERSHIP_API_URL` before building the frontend (see `.env.example`).
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

`npm run build` produces a fully static `dist/` folder that any static host can serve (Cloudflare
Pages, Netlify, Vercel, GitHub Pages).
