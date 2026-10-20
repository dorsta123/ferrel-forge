# ferrel-forge docs

The project's memory: what we're building, where we are, and why things are the way they are.

| File | Read it when |
|---|---|
| [PRODUCT.md](PRODUCT.md) | First — what we are building, for whom, the 7 agreed stages, open product questions |
| [ROADMAP.md](ROADMAP.md) | Starting any work — current phase, what's done, what's next |
| [phases/](phases/) | Working on a phase — its plan, step checklist, and what was learned |
| [decisions/](decisions/) | Wondering "why is it built this way?" — one record per decision |
| [security.md](security.md) | Touching auth, uploads, money, or deployment |

## How these docs stay current

- After every completed step: tick it in the phase file and update `ROADMAP.md`.
- Every non-obvious choice (library, data rule, trade-off) gets a decision record in `decisions/`, numbered in order. Never edit an old decision to reverse it — add a new one that supersedes it.
- Security findings and their status live in `security.md`.

`CLAUDE.md` (repo root) holds the *how* — commands, architecture, gotchas. These docs hold the *what* and *why*.
