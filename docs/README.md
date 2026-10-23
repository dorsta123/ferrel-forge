# ferrel-forge docs

The project's memory: what we're building, where we are, how we work, and why things are the way they are.

| File | Read it when |
|---|---|
| [PRODUCT.md](PRODUCT.md) | First: what we are building, for whom, the stages, open product questions |
| [ROADMAP.md](ROADMAP.md) | Starting any work: current phase, what's done, what's next |
| [WORKFLOW.md](WORKFLOW.md) | Before changing anything: plan → branch → PR → CI → review → merge, and the definition of done |
| [CODEMAP.md](CODEMAP.md) | Finding code or debugging: where every file lives, how requests flow, the methods used, symptom → where to look |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Understanding the system: one diagram of what talks to what, where data and money live |
| [plans/](plans/) | Starting a piece of work: its approved plan and acceptance criteria |
| [phases/](phases/) | Working on a phase: step checklist and what was learned |
| [decisions/](decisions/) | Wondering "why is it built this way?": one record per decision |
| [performance.md](performance.md) | Asking "how much traffic can it take?": load-test results and what scaling would need |
| [security.md](security.md) | Touching auth, uploads, money, or deployment |

## How these docs stay current

- Before work: a plan in `plans/`, approved by the user.
- After every completed step: tick it in the phase file and update `ROADMAP.md`. Update `ARCHITECTURE.md` when the system's shape changes.
- Every non-obvious choice (library, data rule, trade-off) gets a decision record in `decisions/`, numbered in order. Never edit an old decision to reverse it; add a new one that supersedes it.
- Security findings and their status live in `security.md`.

`CLAUDE.md` (repo root) holds the *how*: commands, architecture, gotchas. These docs hold the *what* and *why*.
