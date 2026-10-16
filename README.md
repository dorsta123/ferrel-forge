# ferrel-forge

A non-commercial licensed music marketplace with dynamic, supply-and-demand pricing.

## Getting started

Requires Node 22+, pnpm, and Docker Desktop.

```sh
pnpm install
cp .env.example .env
pnpm db:up        # start Postgres, Redis, RustFS
pnpm db:migrate   # create tables
pnpm dev          # http://localhost:3000
```

See [CLAUDE.md](CLAUDE.md) for architecture and commands.
