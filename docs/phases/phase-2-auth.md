# Phase 2 — Auth ✅

**Done:** 2026-10-19 · **Commit:** `f1733a0` (merged `ae9e496`)

## Goal
People can create accounts and log in; any user can become a creator; creators get a dashboard buyers can't open.

## Steps
1. ✅ Install Better Auth ([decision 003](../decisions/003-better-auth.md))
2. ✅ Tables: `users`, `sessions`, `accounts`, `verifications`, `creator_profiles` (plural names, uuid ids)
3. ✅ Connect Better Auth (`/api/auth/[...all]`, server + client helpers)
4. ✅ Sign-up / sign-in / sign-out pages + session-aware header (shadcn/ui)
5. ✅ Become a creator: artist name, slug (suggested, unchangeable for now), bio
6. ✅ Creators-only `/dashboard`
7. ✅ Browser tests (33 checks)
8. ✅ Commit, push, merge

## Key rules
- A user is a creator **iff** they have a `creator_profiles` row ([decision 005](../decisions/005-creator-as-profile-row.md)).
- Authorization happens on the server, next to the data (pages + Server Actions read the session cookie themselves).
- Creator slug: 3–30 chars, `a-z0-9` and single dashes, unique, reserved words blocked ([decision 009](../decisions/009-slug-rules.md)).

## Learned
- Shadcn's Base UI flavor has no `asChild`; Turbopack's dev cache can serve stale CSS.
- After a Server Action changes header data, `revalidatePath("/", "layout")` before `redirect()`.
- A brand-new npm release (`cn` 0.5.0, 3 days old) was pinned back to 0.4.0 as a precaution.
