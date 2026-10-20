# ferrel-forge

A non-commercial music licensing marketplace for advertisers: license a track for Instagram, TikTok or YouTube ads and pay monthly for the exposure it actually gets, at a rate set by a pricing model. Ad platforms and market data are simulated; payments run in Stripe test mode. See [docs/PRODUCT.md](docs/PRODUCT.md).

## Getting started

Requires Node 22+, pnpm, and Docker Desktop.

```sh
pnpm install
cp .env.example .env
pnpm db:up        # start Postgres, Redis, RustFS
pnpm db:migrate   # create tables
pnpm storage:setup  # create storage buckets
pnpm dev          # http://localhost:3000
```

See [CLAUDE.md](CLAUDE.md) for architecture and commands, and [docs/](docs/README.md) for the roadmap, phase plans, decision records and security notes.
