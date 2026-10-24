# Performance and load testing

## Load test 1: 2026-10-24
**Question:** can the app handle 10,000 simultaneous users?
**Short answer:** not on one server, but it scales out. One server process handles roughly **250 people browsing**. Capacity grows almost linearly with more processes until the database's connection limit; a connection pooler and short-lived page caching would be needed to reach 10,000.

### Setup
- **Code:** phase 3 after the realignment (branch `docs-codemap`), as a **production build** (`next build` + `next start`), not dev mode.
- **Data:** 40 seeded creators and 600 published releases (test accounts, deleted afterwards), plus one real release.
- **Machine:** one laptop (AMD Ryzen 5 5600H, 12 threads, 15 GB RAM, Windows 11). The app, Postgres in Docker **and** the load generator all share it, so every number here is a **lower bound**.
- **Tool:** [autocannon](https://github.com/mcollina/autocannon) 7.15.0, with 15–20 s per run. "Connections" means requests kept in flight non-stop: each simulated client asks again the moment it gets an answer, which is far harsher than a person reading a page.

### Results: one server process
| Page | 10 connections | 50 connections | 200 connections |
|---|---|---|---|
| Homepage | 23 req/s · p50 389 ms | 31 req/s · p50 1.6 s | 23 req/s · p50 6.8 s |
| Explore | 19 req/s · p50 496 ms | 20 req/s · p50 2.4 s | 15 req/s · p50 9.6 s |
| Explore, filtered, page 2 | 14 req/s · p50 528 ms | 19 req/s · p50 2.6 s | 14 req/s · p50 10.2 s |
| Release page | 24 req/s · p50 280 ms | 38 req/s · p50 1.3 s | 30 req/s · p50 6.0 s |
| Signed-in page (session check) | 24 req/s · p50 382 ms | 29 req/s · p50 1.7 s | 26 req/s · p50 6.8 s |
| Mixed browsing (6 public pages) | 21 req/s · p50 424 ms | 26 req/s · p50 1.8 s | 20 req/s · p50 7.0 s |

No errors and no timeouts in any run, even at 200 connections. Pages got **slow** under overload but never **failed**.

### Results: scaling out (mixed browsing, 50 connections per server)
| Server processes | Requests/s | p50 | Peak DB connections |
|---|---|---|---|
| 1 | 23 | 2.1 s | 21 |
| 2 | 38 | 2.6 s | 30 |
| 4 | **67** | 3.1 s | 48 |

### What the numbers mean
- **One server process uses one CPU core.** During load it sat at about 100% of one core while the other 11 were idle. About 25 req/s is that core's limit: each page costs roughly 40 ms of server CPU to render.
- **Adding processes adds capacity:** 2.9× with 4 processes, on a laptop that was also running the load generator.
- **The database wasn't the bottleneck,** but each process holds about 10 database connections and Postgres allows 100. About 9 processes would exhaust it, so **a connection pooler is required** to scale further.
- **Sign-in is rate-limited in production:** 3 attempts per 10 s per address, then `429 Too Many Requests`. That's Better Auth's built-in limiter, and it's why the sign-in run showed thousands of "non-2xx" answers. The limiter is in memory (per process) and trusts a header that can be faked, so [security finding #4](security.md) stays open.

### From requests per second to "simultaneous users"
A person browsing opens about **one page every 10 seconds**, so supported users ≈ requests per second × 10.

| Setup | ≈ simultaneous browsing users |
|---|---|
| 1 process (one core), as measured | ~250 |
| 4 processes on this laptop, as measured | ~670 |
| **10,000 users** needs about 1,000 req/s | about 40 processes at today's per-page cost, plus a pooler |

### What it would take to reach 10,000
In order of impact:
1. **Cache public pages for a few seconds** (`"use cache"` with a short lifetime, or a CDN in front). Explore and release pages are identical for every visitor, so most requests would skip rendering and the database entirely. This is likely the biggest single win; it needs measuring.
2. **Run one process per CPU core, and several servers** behind a load balancer.
3. **A connection pooler** (PgBouncer, or a hosted database's built-in pooler).
4. **Cache the session check briefly** (Better Auth supports cookie caching), so signed-in pages don't query the database every time.
5. **A shared rate limiter** (Redis-backed) with the host's trusted IP header (finding #4).

The last three mean paid hosting at that scale, outside this project's $0 rule ([decision 001](decisions/001-non-commercial-zero-cost.md)). For a free portfolio deployment, the measured capacity of a few hundred browsing users is plenty.

### How to repeat it
1. `pnpm --filter @ferrel/web build`, then start one or more `next start -p <port>` processes.
2. Seed test data with `e2e.*@example.com` accounts (removable by the e2e purge).
3. Run autocannon against the pages above.

The scripts used for this run lived in a session scratchpad. Turning them into a `pnpm loadtest` command is a possible follow-up.
