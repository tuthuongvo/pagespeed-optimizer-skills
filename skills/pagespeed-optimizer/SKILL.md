---
name: pagespeed-optimizer
description: Measure a URL with PageSpeed Insights / Lighthouse, analyze FCP, LCP, TBT, CLS and Speed Index, then fix the code so Performance, Accessibility, Best Practices and SEO all score >= 90. Works with any stack (Next.js, React, Vue, PHP/Laravel, WordPress, Rails, Django, static HTML...). Use when the user mentions PageSpeed, Lighthouse, Core Web Vitals, site speed, or SEO/accessibility scores.
---

# PageSpeed Optimizer

Loop: **measure → analyze → fix → re-measure** until all 4 scores are >= 90, or until the remaining issues can't be fixed in code.

## Targets

| Metric | Good (green) |
|---|---|
| Performance / Accessibility / Best Practices / SEO | >= 90 |
| FCP | <= 1.8s |
| LCP | <= 2.5s |
| TBT | <= 200ms |
| CLS | <= 0.1 |
| Speed Index | <= 3.4s |

Prioritize mobile, which is scored more strictly than desktop. If mobile passes, desktop usually does too.

## Step 0: Determine the URL and environment

1. Ask for or infer the URL to test. If the site isn't deployed, build for production and run it locally. Never test a dev server; its scores are meaningless.
   - Detect the stack: `package.json` (next/nuxt/vite/astro), `composer.json`, `Gemfile`, `requirements.txt`/`manage.py`, `wp-config.php`, `index.html`.
   - Run the production build: `npm run build && npm start`, `php artisan serve` with `APP_ENV=production`, `bundle exec rails s -e production`, `python -m http.server` for static sites.
2. The PSI API cannot reach `localhost`. Use `--local` (runs Lighthouse with the local Chrome). Use the PSI API for public URLs.
3. Don't submit internal sites or URLs containing sensitive data to PSI without the user's consent.

## Step 1: Measure

The script is `scripts/psi.mjs` inside this skill's directory (the folder containing this `SKILL.md`). Resolve that absolute path first, then run it from the project root:

```bash
# Public URL (set PSI_API_KEY to avoid 429 errors)
node <skill-dir>/scripts/psi.mjs https://example.com --strategy=both
# localhost
node <skill-dir>/scripts/psi.mjs http://localhost:3000 --local --strategy=mobile
```

The script prints the 4 scores, the 5 metrics, the failing audits with the specific resources involved, and the LCP and CLS elements. Full JSON goes to `.pagespeed/` (add it to `.gitignore`). Scores vary by about ±5, so run 2-3 times when comparing before and after.

Without Node: `curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=URL&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo"`.

## Step 2: Analyze

Build a table: failing audit → source file in the repo → fix → risk. Fix in order of impact. Performance weights: TBT 30%, LCP 25%, CLS 25%, FCP 10%, Speed Index 10%.

## Step 3: Fix (stack-agnostic)

Find the relevant template, layout or component in the current stack, then apply:

### LCP / FCP
- Identify the LCP element (the script prints it). If it's an image: don't lazy-load it, add `fetchpriority="high"`, preload it (`<link rel="preload" as="image" imagesrcset imagesizes>`), and use an `<img>` instead of a CSS background.
- Images: serve WebP/AVIF, use `srcset` + `sizes` matching the rendered size, compress, set `width`/`height`.
- Reduce TTFB: caching (CDN, page cache, SSG/ISR instead of per-request SSR), gzip/brotli, HTTP/2+, fix slow DB queries.
- Fonts: `font-display: swap`, self-host, preload the main font, subset, limit weights. `preconnect` to at most 2-3 required third-party origins.
- Remove render-blocking CSS/JS: inline critical CSS, `defer`/`async` scripts, `media` attributes for non-critical CSS, remove unused CSS.

### TBT / Speed Index
- Ship less JS: code-split by route or interaction, drop heavy dependencies (moment, full lodash, unneeded polyfills), tree-shake, target modern browsers.
- Third-party scripts (analytics, chat, ads, tag managers): `defer`, load after `load`/on idle/on interaction, or use facades (YouTube, maps, chat). Remove what isn't needed.
- Split long tasks (> 50ms); defer non-essential work with `requestIdleCallback`/`setTimeout`.
- For SSR/SSG frameworks: prefer static HTML or Server Components, reduce hydration.
- Minify JS/CSS/HTML, enable compression, set long cache headers (`immutable`) on hashed assets.

### CLS
- Give every `<img>`, `<video>` and `<iframe>` `width`/`height` or `aspect-ratio`.
- Reserve space for banners, ads, embeds and cookie notices (`min-height`). Don't insert content above content that's already visible.
- Font-swap shifts: use `size-adjust` or a metrically similar fallback font.
- Animate with `transform`/`opacity`, not `top/left/width/height`.

### Accessibility
- `alt` on images (`alt=""` for decorative ones), labels on inputs, accessible names on icon-only buttons and links (`aria-label`).
- Text contrast >= 4.5:1 (3:1 for large text). Fix color tokens rather than individual instances.
- One `<h1>`, no skipped heading levels, `<main>`/`<nav>`/`<header>`/`<footer>` landmarks, `<html lang>`.
- Valid ARIA roles, no `aria-hidden` on focusable elements, touch targets >= 24x24px, don't disable zoom (`user-scalable=no`).
- Links distinguishable by more than color, `title` on iframes.

### Best Practices
- HTTPS everywhere, no mixed content. Clear console errors (404 assets, JS errors) and deprecated APIs.
- `<!doctype html>` and `<meta charset="utf-8">`. Images displayed at the correct aspect ratio.
- Security headers: CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, COOP/XFO. Try CSP in report-only mode first so it doesn't break the site.
- `target="_blank"` with `rel="noopener noreferrer"`. Update JS libraries with known vulnerabilities.

### SEO
- Unique `<title>` and `<meta name="description">` per page, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- `<link rel="canonical">`, valid `robots.txt`, `sitemap.xml`, no accidental `noindex`, pages return HTTP 200.
- Descriptive link text (not "click here"), `hreflang` for multilingual sites, Open Graph, JSON-LD where relevant.
- Font size >= 12px on mobile, adequately sized tap targets.

## Step 4: Verify

1. Rebuild, rerun the script, compare against the previous run.
2. Run the project's existing tests, lint and typecheck to make sure nothing broke.
3. Repeat until scores are >= 90 or the remaining issues are out of reach for code changes.

## Safety rules

- Make one group of related changes per iteration and note it clearly so it's easy to revert. No out-of-scope refactors.
- Don't remove features (tracking, chat...) without asking. Propose deferred loading first.
- Don't game the score: no serving different pages to the Lighthouse user agent, no hiding content just to lower LCP.
- Infrastructure changes outside the repo (CDN, server compression, headers) go in the report as recommendations; don't make them yourself.
- Don't add heavy dependencies just to optimize. Never commit API keys.

## Report limitations honestly

- Third-party scripts (ads, tag managers), slow hosting TTFB, or images/videos uploaded through a CMS may not be fixable in code. State the cause and recommend a fix.
- Local runs differ from real PSI (network, CPU). Confirm final results with PSI against the production URL.

## Final report format

1. Before/after table: the 4 scores plus FCP, LCP, TBT, CLS, SI (mobile and desktop).
2. Changes, listed by file.
3. Remaining failing audits, why they remain, and what the user needs to do.
