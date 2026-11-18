# La Chev 208 — concept redesign (preview)

**Concept preview by ZarSeb Enterprises — not the official La Chev 208 website.**
Every page is `noindex, nofollow`, there is no analytics or tracking, and no DNS or domain is attached.

- Live preview: https://koffeekinggamer.github.io/lachev208-demo/
- Stack: Astro 7 (static), self-hosted fonts, ~3 KB of first-party JS for motion. No frameworks, no trackers.

## Commands

```bash
npm ci
npm run dev          # http://localhost:4321/lachev208-demo/
npm run build        # outputs to dist/
npm run preview      # serves dist/ at http://127.0.0.1:4321/lachev208-demo/
node scripts/qa.mjs http://127.0.0.1:4321/lachev208-demo screens   # layout QA + screenshots (needs Chrome)
```

Deploys: the preview is served by GitHub Pages from the `gh-pages` branch (built `dist/`), published with `npm run deploy:pages`.
An Actions workflow is ready at `ci/github-pages-deploy.yml`; it is parked there because the CLI token lacks the `workflow` scope.
Move it to `.github/workflows/` with a token that has that scope and switch Pages to "GitHub Actions" to deploy on every push.

## Pages (URLs kept from the current site)

| Page | Path |
|---|---|
| Home | `/` |
| Food menu (lunch, dinner, brunch) | `/summerville-la-chev-208-food-menu` |
| Drink menu | `/summerville-la-chev-208-drink-menu` |
| Events (+ specials at `#specials`) | `/summerville-la-chev-208-events` |
| Private parties & catering (`#catering`) | `/summerville-la-chev-208-party` |
| Accessibility | `/accessibility-page-01` |

Aliases (`/menu`, `/-party`, `/catering`, `/about`, `/gift-cards`, `/jobs`, …) are generated as meta-refresh pages for the preview
(`astro.config.mjs → redirects`), each with `noindex, nofollow`. For a real launch on Cloudflare Pages, use `redirects/_redirects` (true 301s);
the full map with notes is `redirects/redirect-map.csv`.

## Content (editable) vs design (locked)

| Content | File(s) | Decap collection |
|---|---|---|
| Menus (349 items) | `src/content/menus/*.json` | Menus |
| Events | `src/content/events/*.md` | Events |
| Specials | `src/content/specials/*.md` | Specials |
| Hours, phone, address, outside links | `src/data/site.json` | Hours, contact & photos → Hours & contact |
| Home gallery photos | `src/content/gallery.json` + `src/assets/photos/` | Hours, contact & photos → Home page photos |

Design tokens, layout, typography and motion live in `src/styles/global.css`, `src/components/` and
`src/scripts/motion.ts`, and are deliberately not exposed in the CMS.

`scripts/import-menu.mjs` was a one-time import from the SpotHopper export (`menu-items.csv`). Don't re-run it
after staff start editing in the CMS — it overwrites the menu files.

## Decap CMS (`/admin`) — not connected yet

`public/admin/config.yml` is set to the GitHub backend for `Koffeekinggamer/lachev208-demo` with **no auth
endpoint**, so nobody can log in. To enable it:

1. Decide which repo is the real source of truth (likely a repo the restaurant or ZarSeb owns, not this preview).
2. Deploy an OAuth proxy (e.g. a small Cloudflare Worker such as `decap-proxy`) and register a GitHub OAuth App
   whose callback URL points at it. Keep the client secret in the Worker's secrets — never in this repo.
3. Set `backend.base_url` (and `auth_endpoint` if needed) in `config.yml`; give editors write access to the repo.
4. Alternative: host on Netlify and switch the backend to `git-gateway` with Netlify Identity.

Local editing works now: `npx decap-server` + `npm run dev`, then open `/lachev208-demo/admin/`.

## Going live (later, only with approval)

Set `site` to `https://lachev208.com`, remove `base`, delete the robots `noindex` meta in `src/layouts/Base.astro`
and the `Disallow: /` in `public/robots.txt`, remove the concept-preview footer line, add analytics only if asked
(the review found GA4 `G-VG24VK2VKT`), copy `redirects/_redirects` into `public/`, and follow §11 of the review for DNS.
