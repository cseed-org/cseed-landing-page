# cseed landing page

The public marketing site for **cseed**, a student-run builder/engineer/creative club. A single
static [Astro](https://astro.build) page, built to match the `cseed Design System` exactly: full-bleed
bands, torn-paper section edges, a giant lowercase `cseed*` wordmark, and a handwritten margin note.

No real photography was supplied with the design system, so every photo band and photo card renders
as a brand-colored, diagonally-hatched placeholder (see `.ph-*` classes in
`src/styles/global.css`) instead of a real image. Swap them for real photos when they're ready — the
scrims, radii, and shadows around each one are already sized for a photo.

## Launching the landing page

```bash
npm install
npm run dev
```

Then open **http://localhost:4321**.

| Command           | What it does                                       |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Dev server with hot reload at `localhost:4321`       |
| `npm run build`    | Production build into `dist/`                        |
| `npm run preview`  | Serve the built `dist/` locally, to check real output |
| `npm run check`    | Typecheck `.astro` and `.ts` files                    |
| `npm run lint`     | Prettier in check mode                                |
| `npm run format`   | Prettier, writing changes                             |

There is no backend, API, or environment variable to configure — it's one HTML page, one stylesheet,
and a handful of self-hosted fonts.

## Where things go

```
.
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── fonts/                    Self-hosted Poppins + Cabin TTFs, OFL licenses
│
├── src/
│   ├── components/
│   │   ├── core/                 Wordmark, Button, IconButton, Annotation, StatCapsule
│   │   ├── layout/                TornDivider, SectionHeading
│   │   ├── media/                  PhotoCard, PolaroidStack
│   │   └── navigation/             NavBar, SiteFooter
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro       <head>, global stylesheet import
│   │
│   ├── pages/
│   │   └── index.astro            The landing page itself -- one route: `/`
│   │
│   └── styles/
│       ├── global.css             Reset, base element styles, placeholder-image utilities
│       └── tokens/                colors.css, typography.css, spacing.css, shape.css,
│                                   motion.css, fonts.css -- ported 1:1 from the design system
│
├── astro.config.mjs
└── dist/                          Build output. Generated -- do not edit or commit.
```

Every component under `src/components/` is a plain `.astro` file with its styles scoped in a
`<style>` block at the bottom -- no client-side JavaScript runs on this page. Hover/press states
that the design system implements with React `useState` (buttons, cards, nav links) are done here
with CSS `:hover` / `:active` instead, since the whole page is static.

## Design source

The page is a direct build of the `templates/landing-page/LandingPage.dc.html` template from the
**cseed Design System** (`cseed Design System.zip`): same sections, same copy, same colors, same
type scale, same spacing tokens. The only intentional departure is photography -- placeholders
stand in for the grass-meadow and forest-fog reference photos until real shots are supplied.

## Deploying

`npm run build` produces a fully static `dist/` folder that can be served by any static host
(Cloudflare Pages, Netlify, Vercel, GitHub Pages, etc.) -- there's nothing else to provision.
