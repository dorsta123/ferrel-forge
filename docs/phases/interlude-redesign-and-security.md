# Interlude — UI redesign + security fixes ✅

**Done:** 2026-10-20 · **Commits:** `c059e54` (redesign), `4f61378` (security) · merged `f0c2fea`, `42f4455`

## UI redesign — "Ember Forge"
- Dark-first theme with a light/dark toggle; molten amber/ember accent; Bricolage Grotesque headings ([decision 011](../decisions/011-ember-forge-design.md)).
- Landing page with an interactive price chart driven by the real pricing engine (chart colors validated for both themes).
- Split-screen auth pages, account menu, live profile preview, dashboard with honest zero stats.
- 44 browser checks, screenshots of every page in both themes at desktop + phone width.
- Bug found: shadcn's `buttonVariants` concatenated classes instead of merging them — wrapped in `cn`.

## Security fixes
From the review in [security.md](../security.md):
- Services and dev server bound to `127.0.0.1`; Docker images pinned.
- Display names validated server-side for sign-up **and** `/update-user`; `image` forced to null ([decision 010](../decisions/010-validate-users-in-auth-hooks.md)).
- `shadcn` moved to devDependencies.
- Bug found while testing: Better Auth merges hook results over the request, so omitted fields keep attacker values — fields must be overwritten.
