# 015 — Public catalog: what is visible, always fresh, streamed 404s
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
Step 6 makes releases public: `/explore`, `/creators/<creator>`, `/creators/<creator>/<track>` and "Latest releases" on the homepage. We had to decide what anyone may see, how fresh prices must be, and what a missing page returns.

## Decision
- **Visibility:**
  - Lists (Explore, creator page, homepage) show **published** releases only, newest first by first publish time.
  - A release page also opens for **archived** releases, marked "No longer for sale", so links buyers saved keep working.
  - **Drafts are never public**, not even to their owner on public URLs.
- **Columns:** public queries (`features/catalog/queries.ts`) select display fields only. The audio file location, file size and owner user id never leave the server.
- **URL input:** slugs, genre and page are validated in `features/catalog/params.ts` before any query. Bad values become "not found" or fall back to defaults (all genres, page 1).
- **Freshness:** public pages render on each request (`connection()`), not cached, because every sale changes the price. Caching with tags can come later if load demands it.
- **Paging:** Explore shows 24 per page with Newer/Older links. Creator pages show up to 100 releases.
- **404s:**
  - Pages stream, so once streaming starts the status is already 200. Browsers get the not-found page plus `<meta name="robots" content="noindex">`.
  - `generateMetadata` also calls `notFound()`. Crawlers receive metadata before streaming, so they get a **real 404 status**.

## Alternatives considered
- `generateStaticParams` + `notFound()` before any Suspense, which gives a real 404 for everyone. Rejected: it means building release pages ahead of time, which doesn't fit a catalog that changes with every publish.
- Caching public pages. Rejected: prices would be stale.
- A 404 for archived releases. Rejected: it would break buyers' links.

## Consequences
- Checkout (phase 5) must re-read the price server-side and never trust the price shown on a page.
- If Explore gets slow, add `"use cache"` with tags invalidated on publish and sale.
- Browser tests must use `main:visible`, because Next 16 keeps previously visited pages mounted but hidden.
