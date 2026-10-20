# Security

Review run 2026-10-19 on the phase 2 codebase (read-only review plus live attack requests against the local API).

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Postgres/Redis/RustFS/dev server listened on all interfaces with public dev passwords (Redis had none) — anyone on the same Wi-Fi could read sessions and log in as anyone | High (local) | ✅ Fixed — bound to `127.0.0.1` |
| 2 | Sign-up API accepted any name (200,000 chars, whitespace-only); `/update-user` too | Medium | ✅ Fixed — server-side 1–60 chars, normalized ([decision 010](decisions/010-validate-users-in-auth-hooks.md)) |
| 3 | Sign-up accepted an unchecked `image` URL (`javascript:` stored) | Medium | ✅ Fixed — `image` always null until avatar uploads exist |
| 4 | No brute-force protection: rate limiting is off outside production, in-memory, keyed on a spoofable `X-Forwarded-For` | Medium (deploy) | ⏳ **Open — must fix before any deployment**: Redis-backed counters, strict sign-in/sign-up limit, host-specific trusted IP header |
| 5 | Homepage showed raw DB errors (SQL text) to visitors | Low | ✅ Fixed — placeholder removed in the redesign |
| 6 | No email verification; sign-up reveals registered emails | Low | 🟢 Accepted — needs an email service |
| 7 | Dependency advisories: `braces` (HIGH, via shadcn CLI), `esbuild` (MODERATE, via drizzle-kit) | Low | ✅ `braces` gone from prod deps; `esbuild` not reachable (drizzle-kit config loading only) |
| 8 | Floating Docker image tags | Low | ✅ Pinned: postgres 17.11, redis 7.4.11, rustfs 1.0.2 |

## Verified fine
CSRF (cross-origin auth requests → 403), session cookie `HttpOnly` + `SameSite=Lax`, scrypt password hashing, server-side authorization, parameterized SQL, React escaping, `.env` never committed.

## Storage (phase 3, step 2)
| Check | Result |
|---|---|
| Anonymous read of a master file / listing previews | 403 |
| Anonymous read of a preview | 200 (intended) |
| Upload from our site with a signed link | ✅ |
| Upload from another origin | Blocked by CORS |
| Tampered path / oversize / expired link | 403 |
| Different content type than signed | 403 **only with `signableHeaders`** — must be used for every upload link |

## Rules that keep it that way
- Authorize on the server next to the data; the header and UI never protect anything.
- Every write path that creates/updates users goes through Better Auth `databaseHooks`.
- Master audio is never public; served later only via short-lived signed URLs.
- Never trust a file's name or declared type — verify size and signature bytes server-side.
