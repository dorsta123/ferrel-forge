# Plan: working rules + CI

**Status:** Approved by the user 2026-10-23 · **PR:** #2 · **Why:** the app was built fast with AI ("vibe coded"); from here on every change goes through a reviewable, automatically checked process.

## Scope
| File | Purpose |
|---|---|
| `docs/WORKFLOW.md` | The working rules in plain English: branch → PR → CI → review → merge; definition of done; extra rules for money features |
| `.github/pull_request_template.md` | Every PR: what, why, plan link, how tested, review, risks |
| `.github/workflows/ci.yml` | GitHub Actions on every PR and on `main`: typecheck, lint, unit, integration, build; e2e as a second job |
| `docs/plans/README.md` + `TEMPLATE.md` | Where plans live; each has acceptance criteria |
| `docs/ARCHITECTURE.md` | One-page diagram of the system (Mermaid, rendered by GitHub) |
| `CLAUDE.md` | Points future sessions to WORKFLOW.md and the plans folder |

Not in scope: changing app code; protecting `main` (a GitHub setting, done after this PR merges, see below).

## Decisions taken
- **E2E runs in CI** on every PR (user's choice), as a separate job, using the Chrome already installed on GitHub's Ubuntu machines.
- CI starts the same Docker services as local development (`docker compose`), so CI and laptops behave alike.
- Branch protection: require a PR and passing checks, **no required approvals**. GitHub doesn't let authors approve their own PR, so the user's merge click is the approval.
- Independent review per PR: `/code-review` (plus `/security-review` for auth, money or uploads), findings summarised in the PR.

## Acceptance criteria
- [ ] Opening a PR pre-fills the template.
- [ ] CI runs on the PR and shows green when everything passes.
- [ ] A deliberately failing test turns CI red (checked on a throwaway branch, then deleted).
- [ ] After `main` is protected, a direct push to `main` is refused and a red PR can't be merged.
- [ ] `docs/ARCHITECTURE.md` shows a rendered diagram on GitHub.
- [ ] CLAUDE.md points to WORKFLOW.md.

## After merge
Protect `main` (Settings → Branches, or via `gh` once signed in): require a pull request and the `checks` and `e2e` status checks.
