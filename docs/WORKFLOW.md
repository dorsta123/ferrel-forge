# How we work

This project is built with an AI assistant. These rules keep that safe: the AI writes most of the code, and the **process** makes sure it is right. They apply to every change from 2026-10-23 onward.

## The loop

```
plan (docs/plans/, user approves) → branch → small commits → PR → CI green → independent review → user merges
```

1. **Plan first.** Copy [plans/TEMPLATE.md](plans/TEMPLATE.md). The plan states scope and **acceptance criteria**, and the user approves it before code is written.
2. **One branch per piece of work**, off `main`. One concern per branch: no refactors mixed into features.
3. **Commit per working step**, not per phase. Each commit leaves the tests passing.
4. **Small PRs:** aim for a few hundred lines. Split anything bigger.
5. **Open a PR** using the template: what, why, plan link, how it was tested, review findings, risks, screenshots for UI.
6. **CI must be green**: typecheck, lint, unit, integration and e2e tests, and the build.
7. **Independent review:** run `/code-review` on the PR (and `/security-review` for auth, money, uploads or anything public). Fix or explain every finding in the PR.
8. **The user merges** on GitHub ("Create a merge commit"), and the branch is then deleted. `main` only changes through PRs.

## Definition of done
- [ ] Acceptance criteria in the plan are met, and ticked in the PR.
- [ ] New behaviour has tests at the right layer: rules → unit; anything a forged request could abuse → integration; user journeys → e2e.
- [ ] No test was weakened to make it pass without saying why in the PR.
- [ ] CI is green.
- [ ] Docs updated: phase file, ROADMAP, a decision record for non-obvious choices, ARCHITECTURE if the system's shape changed.
- [ ] No secrets in the diff.

## Extra rules for money (phases 5–7)
Licensing, billing and payouts to contributors move (test-mode) money between many people. For these:
- **A threat model per feature:** who could cheat or make a mistake, and what stops them.
- **Ledger invariants as tests:** money in = money out, contributor shares add up exactly, every action is idempotent (running twice never pays twice).
- **Never trust the browser** for amounts, rates or splits. Re-read and re-check on the server.
- **Review at the deepest level available** before merging.

## Working with the AI
- If the same fix fails twice, stop and rethink the approach. Don't keep patching.
- Ask "how do you know it works?" and expect evidence: test output or screenshots.
- Prefer plain-English explanations. The user should be able to describe how the system works from [ARCHITECTURE.md](ARCHITECTURE.md).
- A fresh session per piece of work keeps the AI from drifting. `CLAUDE.md` and these docs carry the context.
