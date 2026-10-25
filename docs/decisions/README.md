# Decision records

One file per decision, numbered in order. To reverse a decision, add a new record that supersedes it; don't rewrite history.

| # | Decision | Status |
|---|---|---|
| [001](001-non-commercial-zero-cost.md) | Non-commercial, $0 to run | Accepted |
| [002](002-monorepo-turborepo-pnpm.md) | TypeScript monorepo: pnpm + Turborepo | Accepted |
| [003](003-better-auth.md) | Better Auth for login (not Auth.js) | Accepted |
| [004](004-rustfs-and-s3-protocol.md) | RustFS locally, via the S3 protocol | Accepted |
| [005](005-creator-as-profile-row.md) | "Creator" = has a `creator_profiles` row | Accepted |
| [006](006-money-in-cents-and-pure-pricing.md) | Money in integer cents; pricing engine is pure | Accepted |
| [007](007-one-license-type.md) | One license type per track (for now) | Superseded by 016 |
| [008](008-generated-cover-art.md) | Generated cover art (no uploads yet) | Accepted |
| [009](009-slug-rules.md) | Slug rules: creator slugs fixed for now, track slugs lock on publish | Accepted |
| [010](010-validate-users-in-auth-hooks.md) | Validate user data in Better Auth hooks | Accepted |
| [011](011-ember-forge-design.md) | Ember Forge visual design, dark default + toggle | Accepted |
| [012](012-direct-browser-uploads.md) | Browser uploads straight to storage via signed URLs | Accepted |
| [013](013-feature-modules.md) | Feature modules: pure rules, a service, thin actions | Accepted |
| [014](014-release-lifecycle.md) | Release lifecycle: draft → published → archived, URL and sale locks | Accepted |
| [015](015-public-catalog.md) | Public catalog: published lists, archived pages stay reachable, always fresh, streamed 404s | Accepted |
| [016](016-metered-exposure-licensing.md) | Metered exposure licensing for advertisers: views × seconds watched, rate locked per license, postpaid monthly, read-only | Accepted |
| [017](017-simulated-data.md) | Simulated ad platforms and market data behind real adapter interfaces | Accepted |
| [018](018-pricing-model.md) | Pricing model: city income, demand, culture, capped AI trends; v1 formula then v2 ML | Accepted |
| [019](019-contributor-splits.md) | Contributor splits: basis points, everyone accepts, locked per license, settled automatically as each invoice is paid | Accepted |
| [020](020-test-layout.md) | Three test layers in the repo: unit, integration (DB + storage), end-to-end (Playwright) | Accepted |
| [021](021-phase-3-realignment.md) | Phase 3 realignment: no copies, private placeholder rate, "Licensing opens soon", no sale locks (amends 014, 015) | Accepted |
| [022](022-audio-previews.md) | Audio previews: 15 s, creator-chosen start (default 25%), one mid-preview watermark, optional, listen links, ffmpeg-static | Accepted |
| [023](023-ffmpeg-versions.md) | FFmpeg versions differ by platform (6.1.1 Windows, 7.0.2 Linux); Linux is the reference, tests allow small tolerances | Accepted |

## Template

```md
# NNN — Title
**Status:** Accepted · **Date:** YYYY-MM-DD · **Phase:** N

## Context
What problem or constraint forced a choice.

## Decision
What we chose.

## Alternatives considered
What else, and why not.

## Consequences
What this makes easy, hard, or must be remembered.
```
