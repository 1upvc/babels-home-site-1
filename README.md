# Babels

[babels.dev](https://babels.dev) — AI detection engineering solutions and news for cyber defense practitioners.

---

## Stack

| | |
|---|---|
| Framework | [Gatsby 5](https://www.gatsbyjs.com/) |
| UI | React 18, SCSS (HTML5 UP Dimension theme) |
| Content | MDX articles (`gatsby-plugin-mdx`) |
| Hosting | [Netlify](https://www.netlify.com/) |
| Node | ≥ 20 |

**Key dependencies**

| Package | Purpose |
|---|---|
| `gatsby-plugin-mdx` | MDX article rendering |
| `gatsby-plugin-feed` | RSS feed (`/rss.xml`) |
| `gatsby-plugin-image` / `-sharp` | Image processing |
| `gatsby-plugin-manifest` | PWA manifest |
| `gatsby-plugin-offline` | Service worker / offline support |
| `gatsby-plugin-sitemap` | Auto-generated sitemap |
| `gatsby-plugin-sass` | SCSS compilation (Dart Sass) |
| `gatsby-plugin-netlify` | Netlify headers + redirects |
| `gatsby-plugin-gdpr-cookies` | Cookie consent + analytics |
| `rss-parser`, `@extractus/article-extractor` | Article curation pipeline (scripts) |

---

## Local development

```bash
npm install
npm run develop          # starts at http://localhost:8000
npm run build            # production build
```

---

## Articles

Content lives in `content/articles/` as `.mdx` files with frontmatter. Each file
is either a **curated** summary (links to an original source) or an **original**
post. Publishing = commit an `.mdx` file → Netlify rebuild.

**Curation pipeline** — pull, summarize, and draft articles from sources:

```bash
npm run articles:fetch                 # from feeds + urls
npm run articles:fetch -- --dry-run    # preview, no writes
npm run articles:fetch -- --url <URL>  # one-off article
```

- Sources: RSS feeds in `scripts/feeds.json`, ad-hoc URLs in `scripts/urls.txt`.
- Generated files are written with `draft: true` — review, then flip to
  `draft: false` and commit. Drafts preview in `develop` but are excluded from
  the production build.
- Only items within a **14-day freshness window** are ingested.

**Freshness window** — curated items older than 14 days drop off the `/articles`
listing and the RSS/JSON feeds, but their individual pages persist (evergreen).
Original posts never expire. A daily Netlify scheduled function
(`netlify/functions/scheduled-rebuild.mjs`) re-prunes the window; it needs a
`BUILD_HOOK_URL` env var (a Netlify build hook).

**Filters** — the `/articles` page has client-side Topic and Source filters and a
Relevance / Most recent / Oldest sort.

**Feeds** — `/rss.xml` and `/feed.json`. Subscribe UI is a Buttondown embed
(`src/components/Subscribe.js` — set your Buttondown handle there).

---

## Key files

| File | Purpose |
|---|---|
| `gatsby-config.js` | Site metadata, plugins, RSS feed, analytics IDs |
| `gatsby-node.js` | Article pages, JSON feed, schema, draft/freshness logic |
| `netlify.toml` | Build config, Node version, security headers (CSP) |
| `src/pages/index.js` | Homepage (modal layout: About / GitHub / Articles / Contact) |
| `src/components/Main.js` | Homepage modal content + contact form |
| `src/templates/articles-index.js` | `/articles` listing + filters |
| `src/templates/article.js` | Individual article page (SEO: canonical + JSON-LD) |
| `src/components/Subscribe.js` | Buttondown subscribe form |
| `content/articles/` | Article MDX content |
| `scripts/fetch-articles.mjs` | Curation pipeline |
| `src/assets/scss/` | Theme styles |

---

## Content updates

**Buttondown handle** — set `BUTTONDOWN_USERNAME` in `src/components/Subscribe.js`.

**Social links** — edit `src/components/Main.js`; replace the `href="#"` icon links.

**Analytics IDs** — edit `gatsby-config.js`, fill in the `trackingId` fields under
`gatsby-plugin-gdpr-cookies`.

**Images** — replace files in `static/assets/` (e.g. `bg-austin.jpg`).

---

## Deployment

Deploys automatically via Netlify on push to `master`. For the freshness window,
set a `BUILD_HOOK_URL` env var in Netlify (Site config → Build hooks) so the daily
scheduled rebuild can run.

---

## License

Copyright &copy; 2026 Arjun G. Raman. All rights reserved. See [LICENSE](./LICENSE).
