# cseed landing page

The public marketing site for **cseed**, a student-run community that helps builders turn ideas into
impact. A single static [Astro](https://astro.build) page, built to match the `cseed Design System`
(claude.ai/design project `3791785c-c2a3-433c-a867-ce4c93168d27`, `ui_kits/landing-page`) exactly: a
full-bleed photo hero, a Playfair Display / Poppins / Ubuntu / Anonymous Pro editorial type system,
hairline rules, no cards or shadows, and a polaroid-style photo collage introducing the three
programs (**buildspace**, **buildher**, **saturdays**).

No production photography or sponsor logo files were supplied with the design, so every photo plate
and sponsor lockup renders as a plain placeholder (see `.ph` in `src/styles/global.css`, and
`SponsorLogo.astro`) sized exactly where the real asset would go.

## Launching the landing page

```bash
npm install
npm run dev
```

Then open **http://localhost:4321**.

| Command            | What it does                                            |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload at `localhost:4321`            |
| `npm run build`     | Production build into `dist/`                             |
| `npm run preview`   | Serve the built `dist/` locally, to check the real output |
| `npm run check`     | Typecheck `.astro` and `.ts` files                        |
| `npm run lint`      | Prettier in check mode                                    |
| `npm run format`    | Prettier, writing changes                                 |

There is no backend, API, or environment variable to configure.

## How the page is built

The source design is authored as a **fixed 2083px canvas** (a direct export of the Figma file behind
it), not a fluid responsive layout — every component uses the design's literal pixel positions and
sizes. To reproduce that faithfully, the whole page is wrapped in one `.canvas` element that gets
scaled as a single unit via CSS `zoom: min(1, viewportWidth / 2083)`, computed in an inline script in
`BaseLayout.astro`. That's also why the nav bar is `position: fixed` and only fades in once you've
scrolled roughly halfway down the hero — same behavior as the source prototype.

Everything else is static markup with scoped `<style>` blocks — **no client-side framework**. The
handful of interactive behaviors from the source (scroll-triggered fade-ups, the nav's fixed/hidden
state, in-page anchor scrolling) are handled by one small vanilla-JS script in `BaseLayout.astro`;
hover states (link underlines, arrow nudges, dropdown reveal) are plain CSS `:hover`.

## Where things go

```
.
├── public/
│   ├── favicon.svg
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── core/            Arrow, BodyText, ProgramImage, Reveal, Rule,
│   │   │                    SectionHeading, SponsorLogo, TextLink, Wordmark
│   │   ├── navigation/       NavBar, DropdownNav
│   │   ├── sections/         Hero, MissionPrompt, SponsorStrip
│   │   └── landing/          ProgramsCollage, CommunityBand, Footer, Polaroid
│   │                         (page-specific compositions, same split as the source ui_kit)
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro  <head>, global stylesheet, the shared zoom/reveal/nav script
│   │
│   ├── pages/
│   │   └── index.astro       The landing page itself -- one route: `/`
│   │
│   └── styles/
│       ├── global.css        Reset, placeholder-image utility, reveal/rule animation classes
│       └── tokens/            colors.css, typography.css, layout.css, motion.css, fonts.css --
│                              ported 1:1 from the design system
│
├── astro.config.mjs
└── dist/                      Build output. Generated -- do not edit or commit.
```

## Design source

This is a direct build of `ui_kits/landing-page/index.html` (and its `LandingPage.jsx`,
`ProgramsCollage.jsx`, `CommunityBand.jsx`, `Footer.jsx`) from the **cseed Design System** project on
claude.ai/design. Same sections, same copy, same colors, same type scale, same layout tokens. The
`Lede.jsx` file in that ui_kit is loaded but never rendered by the actual page and was not ported here
for the same reason.

## Deploying

`npm run build` produces a fully static `dist/` folder that can be served by any static host
(Cloudflare Pages, Netlify, Vercel, GitHub Pages, etc.) -- there's nothing else to provision.
