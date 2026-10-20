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
| [007](007-one-license-type.md) | One license type per track (for now) | Accepted |
| [008](008-generated-cover-art.md) | Generated cover art (no uploads yet) | Accepted |
| [009](009-slug-rules.md) | Slug rules: creator slugs fixed for now, track slugs lock on publish | Accepted |
| [010](010-validate-users-in-auth-hooks.md) | Validate user data in Better Auth hooks | Accepted |
| [011](011-ember-forge-design.md) | Ember Forge visual design, dark default + toggle | Accepted |
| [012](012-direct-browser-uploads.md) | Browser uploads straight to storage via signed URLs | Accepted |
| [013](013-feature-modules.md) | Feature modules: pure rules, a service, thin actions | Accepted |
| [014](014-release-lifecycle.md) | Release lifecycle: draft → published → archived, URL and sale locks | Accepted |
| [015](015-public-catalog.md) | Public catalog: published lists, archived pages stay reachable, always fresh, streamed 404s | Accepted |

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
