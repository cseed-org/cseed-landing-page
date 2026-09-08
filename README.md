# CSEED Landing Page

A static [Astro](https://astro.build) site: a landing page, an events section driven by
Markdown files, and a contact form. It builds to `dist/`, which is served by a Cloudflare
Worker — see [`docs/deploy-pipeline.md`](docs/deploy-pipeline.md) for that side of things.

Most of the content here is **placeholder copy**, marked as such where it appears. It is
meant to be replaced, not shipped.

## Quick start

```bash
npm install
cp .env.example .env      # optional; only needed for the Turnstile widget
npm run dev               # http://localhost:4321
```

## Scripts

| Command           | What it does                                                  |
| ----------------- | ------------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload at `localhost:4321`                |
| `npm run build`   | Production build into `dist/`                                 |
| `npm run preview` | Serve the built `dist/` locally, to check the real output     |
| `npm run check`   | Typecheck `.astro` and `.ts` files (this is what CI gates on) |
| `npm run sync`    | Regenerate content collection types after editing the schema  |
| `npm run lint`    | Prettier in check mode                                        |
| `npm run format`  | Prettier, writing changes                                     |

## Where things go

```
.
├── public/                     Served as-is at the site root. Never processed.
│   ├── favicon.svg
│   ├── og-default.png          Social preview image
│   └── robots.txt
│
├── src/
│   ├── assets/                 Images that Astro should optimize.
│   │   └── event-graphics/     One graphic per event
│   │
│   ├── components/             Reusable chunks of markup. Not routes.
│   │   ├── ContactForm.astro
│   │   ├── EventCard.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   └── Section.astro
│   │
│   ├── content/                Markdown content, validated against a schema.
│   │   └── event-graphics/     One .md file per event
│   │
│   ├── layouts/                Page shells that wrap content via a slot.
│   │   └── BaseLayout.astro    head, header, footer — used by every page
│   │
│   ├── lib/                    Plain TypeScript helpers. No markup.
│   │   └── datetime.ts
│   │
│   ├── pages/                  Every file here becomes a URL. This is the router.
│   │   ├── index.astro         -> /
│   │   ├── about.astro         -> /about/
│   │   ├── privacy.astro       -> /privacy/
│   │   ├── 404.astro           -> shown for unmatched paths
│   │   └── events/
│   │       ├── index.astro     -> /events/
│   │       └── [id].astro      -> /events/<id>/  (one page per event)
│   │
│   ├── styles/                 Global CSS only.
│   │   └── global.css          Design tokens, reset, element defaults
│   │
│   ├── content.config.ts       The schema for src/content/. Start here.
│   └── env.d.ts                Types for env vars and third-party globals
│
├── docs/                       Design notes and runbooks. Not part of the build.
├── astro.config.mjs
└── dist/                       Build output. Generated — do not edit or commit.
```

### The rules behind that layout

**`src/pages/` is the router.** A file's path _is_ its URL. Nothing else in `src/` creates
a route, so anything that is not a page belongs somewhere else. Square brackets mark a
dynamic segment: `[id].astro` builds one page per event, and `getStaticPaths()` in that
file is what supplies the list.

**`src/assets/` vs `public/` — this is the one that trips people up.**

- `src/assets/` is for images you _reference from code or frontmatter_. Astro compresses
  them, converts them to WebP, generates a responsive `srcset`, and adds a content hash to
  the filename so they can be cached forever. The event graphics went from ~60kB PNGs to
  3–14kB WebP in the last build.
- `public/` is copied to the output byte-for-byte, with no processing and no hashing. Use
  it only for files that need a fixed, predictable URL: `favicon.svg`, `robots.txt`, social
  preview images, domain verification files.

If you are unsure, use `src/assets/`.

**`src/components/` vs `src/layouts/`.** Both are `.astro` files, and the split is
convention rather than something Astro enforces. Layouts render the page shell and expose a
slot; a page uses exactly one. Components are the pieces that go inside it, and a page uses
as many as it likes.

**Styles.** `src/styles/global.css` holds design tokens (colors, type scale, spacing) plus
element defaults, and is imported once by `BaseLayout.astro`. Everything else lives in a
scoped `style` block inside the component it belongs to, so it cannot leak. Recoloring the
whole site means editing the `--brand` tokens at the top of `global.css` and nothing else.

**`src/content/` is data, not pages.** The Markdown files there do not become routes on
their own. `src/pages/events/[id].astro` reads them and generates the pages.

## Adding an event

1. Drop the graphic into `src/assets/event-graphics/`. Roughly 16:9, at least 1200px wide.
2. Create `src/content/event-graphics/<url-slug>.md`. The filename becomes the URL.
3. Fill in the frontmatter:

   ```markdown
   ---
   title: Spring Volunteer Fair
   date: 2027-04-08T12:00:00-07:00
   location: Red Square
   summary: One or two sentences. Shown on cards and used as the page description.
   graphic: ../../assets/event-graphics/spring-volunteer-fair.png
   graphicAlt: Describe the image for screen readers
   tags:
     - volunteering
   featured: false
   rsvpUrl: https://example.edu/rsvp/spring-fair # optional
   draft: false
   ---

   Markdown below the frontmatter becomes the body of the event page.
   ```

4. That is it — the events index, the detail page, and the home page all pick it up.

A few things that will bite otherwise:

- **`date` needs its UTC offset** (`-07:00` for PDT, `-08:00` for PST). Without one it is
  read as UTC and displays several hours off. Times are rendered in
  `America/Los_Angeles` regardless of where the build runs, which matters because CI
  builds in UTC.
- **`graphic` is a path relative to the Markdown file**, not to the project root. Astro
  resolves and optimizes it at build time, and the build fails loudly if it is missing.
- **`draft: true`** shows the entry in `npm run dev` but keeps it out of `npm run build`.
- After editing `src/content.config.ts`, run `npm run sync` (or restart the dev server) to
  regenerate the types.

## Environment variables

Only one, and it is not a secret:

```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

The `PUBLIC_` prefix means Astro compiles the value into the HTML, which is correct for a
Turnstile **site** key — it is public by design. The matching **secret** key is never in
this repo; it is a Worker secret. See `.env.example` and `docs/deploy-pipeline.md`.

With the variable unset the form still renders and submits; it just shows a note where the
spam challenge would go.

## Not built yet

The contact form posts to `/api/contact`, which does not exist in this repo. Submitting it
today returns a 404 and the form shows its error state. That endpoint is a Cloudflare
Worker, and `docs/deploy-pipeline.md` already specifies it in full, along with the D1
schema, Turnstile verification, and the GitHub Actions workflows. Still outstanding from
that plan:

- `worker/index.ts` and `worker/contact.ts`
- `wrangler.jsonc`
- `migrations/0001_create_messages.sql`
- `test/` and `vitest.config.mts`
- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`

`npm run build` produces exactly the `dist/` those pieces expect to serve, so the Astro side
is ready for them.

Two loose ends to close before launch, both consistent with the deploy doc: `site` in
`astro.config.mjs` and the `Sitemap:` line in `public/robots.txt` still point at the
placeholder `cseed.example.edu`, and `src/pages/privacy.astro` needs real answers on data
retention instead of the TODO it currently carries.
