# cseed — community website template

**A multi-page Astro site for communities, programs, and the people building them.**

The source behind [cseed.co](https://cseed.co), with reusable page layouts, shared design tokens, animated program pages, and a membership application backed by Cloudflare Workers and D1.

[Explore the site](https://cseed.co) · [Get started](#get-started) · [Customize](#make-it-yours) · [Project structure](#project-structure) · [License](#license-and-content-rights)

> **Template code: MIT. Website content: rights reserved.**
> You can reuse and adapt the code. Replace the website copy, photographs, logos, and branding before publishing your own site; these are excluded from the MIT license, including content embedded in source files. See [LICENSE](LICENSE) and [CONTENT-NOTICE.md](CONTENT-NOTICE.md).

## Inside the project

| Layer      | What is included                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Frontend   | Astro 7, TypeScript, scoped CSS, and vanilla JavaScript interactions                                     |
| Design     | Shared typography, color, layout, and motion tokens; reusable navigation, footer, and section components |
| Pages      | Home, about, three program pages, membership application, code of conduct, and license pages             |
| Membership | Multi-step form, Turnstile verification, Cloudflare Worker API, D1 storage, and a names-only member wall |
| Discovery  | Page metadata, structured data, sitemap, crawler files, and SEO checks                                   |
| Hosting    | Static `dist/` output, Cloudflare configuration, and GitHub Actions checks                               |

### Pages

| Route               | What you will find                                           |
| ------------------- | ------------------------------------------------------------ |
| `/`                 | Photo hero, program collage, community section, and partners |
| `/about-us/`        | Mission, community stats, and team                           |
| `/buildspace/`      | Cohort program, tracks, and projects                         |
| `/buildher/`        | Pond-themed program page, community, and mentorship          |
| `/saturdays/`       | Weekly build sessions, live countdown, and FAQ               |
| `/join/`            | Membership application and member wall                       |
| `/code-of-conduct/` | Community expectations, also shown in the application        |
| `/mit-license/`     | The MIT license for the template code                        |
| `/content-notice/`  | Content and brand rights (all rights reserved)               |

The last three pages render their repository files at build time: `src/data/code-of-conduct.md`, [`LICENSE`](LICENSE), and [`CONTENT-NOTICE.md`](CONTENT-NOTICE.md). Edit the file and the page follows on the next build. Plain-text copies of the two license files are also served at `/license.txt` and `/content-notice.txt`.

## Get started

Use **Node.js 22.12.0 or newer** and npm. Clone this repository, or clone your own fork:

```bash
git clone https://github.com/cseed-org/cseed-landing-page.git
cd cseed-landing-page
npm ci
npm run dev
```

Open **http://localhost:4321**. You can explore the frontend without backend credentials; the member wall is empty in development when both export settings are unset.

To connect the application, copy [`.env.example`](.env.example) to `.env` and configure your own membership API and Turnstile widget. The two `PUBLIC_` values are included in browser code. The member export URL and token are build-only settings. Backend setup is documented in [backend/README.md](backend/README.md).

**Production builds require member export configuration.** As shipped, `/join/` and `/about-us/` fetch member names during `npm run build`, so both `MEMBER_NAMES_EXPORT_URL` and `MEMBER_NAMES_EXPORT_TOKEN` must be configured. For a standalone template without membership, remove or replace the member-name loading and its display in both `src/pages/join.astro` and `src/pages/about-us.astro`, and replace the join form before building.

### Commands

Run frontend commands from the repository root:

| Command                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Start the local development server                    |
| `npm run check`        | Check Astro and TypeScript source                     |
| `npm run build`        | Generate the static site in `dist/`                   |
| `npm run preview`      | Preview the completed production build                |
| `npm run check:seo`    | Verify the running site at `http://localhost:4321`    |
| `npm run check:mobile` | Check the running site's layout on phones and tablets |
| `npm run lint`         | Check formatting with Prettier                        |
| `npm run format`       | Format the project with Prettier                      |

For SEO and mobile checks, keep the development server running in another terminal. See [docs/seo.md](docs/seo.md) for the checks and deployment checklist.

#### Mobile check

`npm run check:mobile` opens every page in the three browser engines: WebKit (every iOS browser), Chromium (Android Chrome, Samsung Internet, and in-app browsers), and Firefox. It uses 11 phone sizes in portrait, 6 in landscape, 4 tablets, and 2 desktops. Every phone, either way up, must get the 780px mobile canvas, scaled to the screen before the first paint, with no text clipped, overlapping, or scrolling sideways. It also renders with text 30% larger (Android's font size setting), with forced dark mode (Samsung Internet), and on a slow repeat visit.

Install the browsers once with `npx playwright install chromium webkit firefox`. The full run takes about 20 minutes; add `-- --quick` for a representative subset in about 3 minutes. Other options:

- `-- <origin>` checks another address, such as `https://cseed.co`.
- `-- --only about-us` limits the run to page views whose id contains the text.
- `-- --shots` keeps a screenshot of every view.

Failures are re-run one at a time before they count, because a busy machine can hold back the reveal-on-scroll animations. The report and screenshots of failures are written to `.mobile-check/`.

The backend is a separate npm package. To run its tests:

```bash
cd backend
npm ci
npm test
```

## Project structure

```text
.
├── src/
│   ├── components/
│   │   ├── core/          Typography, links, images, reveals, SEO, and wordmark
│   │   ├── navigation/    Shared navigation
│   │   ├── sections/      Hero, mission, and sponsor sections
│   │   ├── landing/       Program collage, community band, and shared footer
│   │   ├── buildspace/    Program track icons
│   │   ├── buildher/      Pond and lilypad visuals
│   │   └── join/          Form fields and blocks
│   ├── data/              Community data, metadata, member loader, and conduct text
│   ├── layouts/           Base document and shared page shell
│   ├── pages/             Page routes, sitemap, llms.txt, and license notices
│   └── styles/            Global styles and design tokens
├── public/                Photos, logos, icons, and other static assets
├── backend/               Membership Worker, D1 migrations, and tests
├── docs/                  SEO and email-forwarding guides
├── scripts/               Site verification scripts
├── .github/workflows/     Frontend checks and membership API deployment
├── astro.config.mjs       Site URL and static build configuration
└── wrangler.jsonc         Static-site Cloudflare Worker configuration
```

## Make it yours

1. **Replace the content and identity.** Update copy in `src/pages/`, `src/components/`, and `src/data/`; replace photographs and brand assets in `public/`. Include team/member information, program details, the code of conduct, social links, and form options in your review. Embedded text and logos are also reserved content.
2. **Set your domain and metadata.** Update `astro.config.mjs`, `src/data/seo.ts`, and the default metadata in `src/layouts/BaseLayout.astro`. Replace favicons, sharing images, and web manifest details in `public/`; review crawler files and the SEO guide for cseed-specific values.
3. **Adjust the visual system.** Start with `src/styles/tokens/` for colors, typography, spacing, and motion. Then edit the shared components and individual page styles.
4. **Connect your own services.** Configure your API, Turnstile widget, D1 database, allowed origins, and deployment settings, or remove the membership integration if you do not need it.
5. **Update the footer and preserve the code license.** Use your own content copyright notice in `src/components/landing/Footer.astro`. Retain the MIT copyright and permission notice with reused code; a visible attribution footer is not required by MIT.

### How layouts work

Pages use static Astro markup, scoped CSS, and small browser scripts for interactions such as reveals, countdowns, tooltips, and the application form. There is no client-side UI framework.

The design uses a **2083px desktop canvas** scaled through `BaseLayout.astro`. Pages using the `responsive` prop switch to a **780px canvas on phones** (screens below 900px wide, and phones held sideways) and scale to fill the viewport. The scale is set by a small inline script in the page head, so it is in place before the first paint. The mobile media query is defined in `src/styles/tokens/layout.css`, and every component's mobile block repeats it verbatim. Layout tokens live in the same file. Check both narrow and wide screens when changing section dimensions, and check phones in landscape.

## Deployment

After replacing the reserved content and configuring or removing the membership integration:

```bash
npm run check
npm run build
npm run preview
```

Upload the generated `dist/` directory to a static host. The included Cloudflare setup uses one Worker for static assets and a separate Worker with D1 for membership. The member wall is rendered at build time; the backend triggers a daily rebuild at 7 a.m. Pacific, including daylight saving changes.

For Cloudflare, follow [backend setup and deployment](backend/README.md#one-time-setup). Replace the cseed Worker names, database binding, domain/origin settings, and account-specific configuration with your own before enabling deployments. The included GitHub workflows check the frontend and deploy the membership API; the site itself uses Cloudflare Workers Builds.

## License and content rights

The template source code is available under the **[MIT License](LICENSE)**. You may use, modify, and distribute the code, including for commercial projects, subject to the license terms.

**Website copy, photographs, logos, and brand assets are excluded**, even when embedded in source files. Their respective owners retain their rights; the MIT license does not grant permission to reuse them. Third-party materials, including fonts and dependencies, remain subject to their own terms. See **[CONTENT-NOTICE.md](CONTENT-NOTICE.md)** for the scope and content locations.

The repository contains the cseed site content so its implementation can be inspected. A public repository is not permission to republish that content. Replace it with your own material or obtain permission from the relevant rights holder.
