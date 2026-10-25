# Code map

Where every piece of code lives, how a request travels through it, the methods the code follows, and where to look when something breaks. Links open the real files. For *why* things are built this way, see [decisions/](decisions/); for the big-picture diagram, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. The whole thing in 30 seconds

```
Your browser
    │  pages, forms, buttons
    ▼
apps/web  (Next.js) ────────────── the website AND its server code, in one app
    │  reads/writes data              │  issues upload links
    ▼                                  ▼
Postgres (database)             RustFS (file storage: audio)
                                       ▲
                                       │  browser uploads audio straight here
apps/worker ── background jobs (phase 4 makes it do real work) ── Redis (job queue)

packages/  ── shared code used by web and worker: db, storage, pricing, audio
e2e/       ── browser tests
docs/      ── what, why, how we work
```

The four "services" (Postgres, Redis, RustFS and the web app) run on your machine. The first three run in Docker (`pnpm db:up`); the web app runs with `pnpm dev`.

---

## 2. The methodology, in plain English

The code follows a handful of well-known methods. Knowing them tells you where to look.

### 2.1 Monorepo
One repository holds several projects that share code. The tools are **pnpm** (installs packages) and **Turborepo** (runs `test`, `lint` and friends across all projects at once).
- `apps/` hold things you *run*: the website and the worker.
- `packages/` hold shared code they import: the database, storage and pricing.

### 2.2 Feature modules ("vertical slices")
Instead of grouping files by *type* (all forms together, all database code together), each **feature** gets one folder holding everything it needs. To fix "releases", you open [`apps/web/src/features/releases/`](../apps/web/src/features/releases/) and everything is there ([decision 013](decisions/013-feature-modules.md)).

Inside a feature folder, every file has one job, and they always stack the same way:

```
   browser                                   server
┌─────────────┐   ┌───────────┐   ┌──────────────┐   ┌────────────┐   ┌──────────┐
│ *.tsx       │ → │ use-*.ts  │ → │ actions.ts   │ → │ service.ts │ → │ Postgres │
│ the UI      │   │ UI state  │   │ "use server" │   │ the logic  │   │ / storage│
└─────────────┘   └───────────┘   │ who are you? │   │ is it      │   └──────────┘
        ▲                         └──────────────┘   │ allowed?   │
        └──────── rules.ts (pure checks, used on both sides) ─────┘
```

| File | Job | Rule of thumb |
|---|---|---|
| `rules.ts` | Pure validation ("is this a valid title?") | No database, no network. The same code runs in the browser (instant feedback) and on the server (the real check). |
| `types.ts` | Shapes of data passed around | Types only |
| `service.ts` | The real logic, given a logged-in user id | Checks ownership and rules; talks to the database; no Next.js code |
| `actions.ts` | **Server Actions**: functions the browser can call | Reads the session cookie, cleans the input, calls the service. Kept thin. |
| `queries.ts` | Read-only database queries | Selects only the columns needed |
| `use-*.ts` | React hooks holding a form's or button's state | Browser only |
| `*.tsx` | Components (what you see) | |
| `*.test.ts` | Unit tests for the file with the same name | |

### 2.3 Server first
Pages are **Server Components**: they run on the server, read the database directly and send finished HTML. Only interactive bits (forms, buttons, menus) are **Client Components**, marked `"use client"` at the top of the file. *If a file has `"use client"`, it runs in the browser and can never be trusted with secrets.*

### 2.4 Functional core, imperative shell
Decisions ("may this release be published?", "what's the rate?") are **pure functions**: same input, same output, no database. Examples: [`status.ts`](../apps/web/src/features/releases/status.ts), [`rules.ts`](../apps/web/src/features/releases/rules.ts), [`packages/pricing`](../packages/pricing/src/index.ts). The outer layer (actions, services, queries) does the I/O. Pure code is easy to test and to reason about.

### 2.5 Defence in depth
Every important rule is checked **three times**:
1. **The browser**, for instant feedback. *Convenience only*, because anyone can bypass it.
2. **The server (service)**, the real check. It also re-checks inside the database update itself, so two requests racing each other can't both win.
3. **The database (check constraints)**, the last line. Bad data simply can't be saved ([`schema/tracks.ts`](../packages/db/src/schema/tracks.ts)).

### 2.6 The test pyramid
Many fast unit tests at the bottom, fewer slow browser tests at the top ([decision 020](decisions/020-test-layout.md)):

| Layer | Command | Where | Checks |
|---|---|---|---|
| Unit | `pnpm test` | `*.test.ts` next to the code | Pure rules |
| Integration | `pnpm test:integration` | [`apps/web/tests/integration/`](../apps/web/tests/integration/) | Services and queries with *forged* input, database rules, storage security |
| End to end | `pnpm e2e` | [`e2e/specs/`](../e2e/specs/) | Real Chrome clicking through journeys |

### 2.7 How changes are made
Plan → branch → small commits → pull request → CI → review → you merge ([WORKFLOW.md](WORKFLOW.md)).

---

## 3. Folder map

```
apps/web/src/
├── app/                    URL → page (Next.js "App Router": folder names are URLs)
│   ├── layout.tsx            wraps every page: header, footer, theme
│   ├── page.tsx              /                     homepage
│   ├── globals.css           colours, fonts, theme ("Ember Forge")
│   ├── (auth)/               /sign-in, /sign-up    ("(auth)" groups them without adding to the URL)
│   ├── become-creator/       /become-creator       form + its own server action
│   ├── dashboard/            /dashboard            creator dashboard
│   │   └── tracks/new, [id]  /dashboard/tracks/…   create / edit a release
│   ├── explore/              /explore              public catalogue
│   ├── creators/[slug]/      /creators/dingo       creator page
│   │   └── [track]/          /creators/dingo/abcd  release page
│   └── api/auth/[...all]/    /api/auth/*           login endpoints (Better Auth)
├── features/               the logic, one folder per feature (section 2.2)
│   ├── releases/             create, edit, publish/unpublish/archive/delete
│   ├── audio-upload/         uploading the master audio file
│   ├── creator-tracks/       the dashboard's release list, filters, stats
│   ├── catalog/              everything public: Explore, creator & release pages
│   └── tracks/               shared: "get my track" (ownership check), "who's the creator"
├── components/             reusable UI pieces
│   ├── ui/                   basic building blocks (button, input, menu…) from shadcn/ui
│   ├── track/                track card + generated cover art
│   ├── home/                 homepage example campaign
│   ├── auth/                 sign-in / sign-up forms
│   └── site-header, site-footer, user-menu, theme-toggle, avatar, form-field
└── lib/                    small helpers used everywhere
    ├── auth.ts               login setup (server) + user validation
    ├── auth-client.ts        login helpers (browser)
    ├── session.ts            getCurrentUser(): who is logged in?
    ├── pg-error.ts           reading database error codes
    └── format-*.ts           numbers, bytes, durations

apps/worker/src/            background jobs (BullMQ on Redis); only a "ping" today
packages/db/                database: tables, constants, migrations
├── src/schema/             one file per area: auth.ts, creators.ts, tracks.ts
├── src/constants/          genres, keys, limits: shared by DB, server and browser
└── drizzle/                migrations: numbered SQL files, applied in order
packages/storage/           file storage: upload links, file checks, buckets
packages/pricing/           pure rate engine (placeholder until phase 8)
packages/audio/             FFmpeg: pinned + SHA-256-verified binary (pnpm audio:fetch → .cache/ffmpeg),
                            runFfmpeg() + localInput(file, format) (safe runner), analyzeAudio() (exact length + waveform);
                            used by the worker. Server/worker only (FERREL_FFMPEG_DIR overrides the cache path)
e2e/                        browser tests: specs/ (tests), helpers/ (shared setup)
docs/                       product, roadmap, workflow, plans, decisions, this map
.github/                    CI workflow and PR template
```

---

## 4. Every page and the code behind it

| URL | Page file | Logic lives in | Who can see it |
|---|---|---|---|
| `/` | [app/page.tsx](../apps/web/src/app/page.tsx) | [features/catalog/latest-releases.tsx](../apps/web/src/features/catalog/latest-releases.tsx), [components/home/](../apps/web/src/components/home/) | Everyone |
| `/sign-up`, `/sign-in` | [app/(auth)/](../apps/web/src/app/(auth)/) | [components/auth/](../apps/web/src/components/auth/), [lib/auth.ts](../apps/web/src/lib/auth.ts) | Signed-out visitors |
| `/become-creator` | [app/become-creator/page.tsx](../apps/web/src/app/become-creator/page.tsx) | [its actions.ts](../apps/web/src/app/become-creator/actions.ts), [lib/creator-profile.ts](../apps/web/src/lib/creator-profile.ts) | Signed-in non-creators |
| `/dashboard` | [app/dashboard/page.tsx](../apps/web/src/app/dashboard/page.tsx) | [features/creator-tracks/](../apps/web/src/features/creator-tracks/) | The creator |
| `/dashboard/tracks/new` | [app/dashboard/tracks/new/page.tsx](../apps/web/src/app/dashboard/tracks/new/page.tsx) | [features/releases/](../apps/web/src/features/releases/) | Creators |
| `/dashboard/tracks/<id>` | [app/dashboard/tracks/[id]/page.tsx](../apps/web/src/app/dashboard/tracks/[id]/page.tsx) | [features/releases/](../apps/web/src/features/releases/), [features/audio-upload/](../apps/web/src/features/audio-upload/) | The track's owner only |
| `/explore` | [app/explore/page.tsx](../apps/web/src/app/explore/page.tsx) | [features/catalog/](../apps/web/src/features/catalog/) | Everyone |
| `/creators/<slug>` | [app/creators/[slug]/page.tsx](../apps/web/src/app/creators/[slug]/page.tsx) | [features/catalog/queries.ts](../apps/web/src/features/catalog/queries.ts) | Everyone |
| `/creators/<slug>/<track>` | [app/creators/[slug]/[track]/page.tsx](../apps/web/src/app/creators/[slug]/[track]/page.tsx) | [features/catalog/](../apps/web/src/features/catalog/) | Everyone (published or archived only) |

---

## 5. Three journeys traced through the code

### 5.1 A visitor opens a release page
1. The browser asks for `/creators/dingo/abcd`.
2. [app/creators/[slug]/[track]/page.tsx](../apps/web/src/app/creators/[slug]/[track]/page.tsx) runs **on the server**.
3. [catalog/params.ts](../apps/web/src/features/catalog/params.ts) checks that `dingo` and `abcd` *look like* valid slugs. If not, it shows "not found" without touching the database.
4. [catalog/queries.ts](../apps/web/src/features/catalog/queries.ts) → `getPublicTrack` selects only public columns, and only published or archived tracks. The private rate and the audio location are never selected.
5. The page renders the cover ([track-cover.tsx](../apps/web/src/components/track/track-cover.tsx)) and the licensing box ([license-panel.tsx](../apps/web/src/features/catalog/license-panel.tsx)), and sends HTML to the browser.

### 5.2 A creator edits and saves a release
1. [release-form.tsx](../apps/web/src/features/releases/release-form.tsx) (browser) holds the typed values via [use-release-form.ts](../apps/web/src/features/releases/use-release-form.ts) and shows the live preview card.
2. **Save** calls `updateRelease` in [releases/actions.ts](../apps/web/src/features/releases/actions.ts). That runs on the server, though the browser calls it like a function.
3. The action reads the session ([tracks/current-creator.ts](../apps/web/src/features/tracks/current-creator.ts) → [lib/session.ts](../apps/web/src/lib/session.ts)) and rebuilds the input ([form-values.ts](../apps/web/src/features/releases/form-values.ts)).
4. [releases/service.ts](../apps/web/src/features/releases/service.ts):
   - loads the track **only if it belongs to this creator** ([tracks/track-access.ts](../apps/web/src/features/tracks/track-access.ts));
   - applies the locks from [status.ts](../apps/web/src/features/releases/status.ts);
   - validates with [rules.ts](../apps/web/src/features/releases/rules.ts);
   - updates the database with the same conditions in the `WHERE` clause.
5. If anything is wrong, errors come back and appear next to the fields. On success, the page refreshes.

### 5.3 A creator uploads audio
1. [audio-upload-field.tsx](../apps/web/src/features/audio-upload/audio-upload-field.tsx) → [use-audio-upload.ts](../apps/web/src/features/audio-upload/use-audio-upload.ts) checks the file name and size instantly ([audio-upload/rules.ts](../apps/web/src/features/audio-upload/rules.ts)).
2. **The browser asks for an upload link.** `requestAudioUpload` → [audio-upload/service.ts](../apps/web/src/features/audio-upload/service.ts) checks ownership and the file, then returns a **5-minute signed link** locked to the exact size and type ([storage/upload-url.ts](../packages/storage/src/upload-url.ts)).
3. The browser uploads the file **straight to storage**, with a progress bar. The file never passes through our server.
4. **The browser asks the server to confirm.** `confirmAudioUpload` → the service reads the file's first bytes ([storage/audio-signature.ts](../packages/storage/src/audio-signature.ts)):
   - a fake file is deleted;
   - a real one is attached to the track, and any older file is deleted.

---

## 6. The data

| Table | What's in it | Defined in |
|---|---|---|
| `users`, `sessions`, `accounts`, `verifications` | Logins (managed by Better Auth) | [schema/auth.ts](../packages/db/src/schema/auth.ts) |
| `creator_profiles` | Artist name, URL slug, bio. *Having a row = being a creator.* | [schema/creators.ts](../packages/db/src/schema/creators.ts) |
| `tracks` | Title, slug, genre, BPM, key, status, the private base rate, audio file location, length, audio processing results (status, error, preview file and start, preview on/off, waveform — [decision 025](decisions/025-audio-result-columns.md)) | [schema/tracks.ts](../packages/db/src/schema/tracks.ts) |

- **Limits** (title length, BPM range…) live once in [constants/tracks.ts](../packages/db/src/constants/tracks.ts) and are used by the database, the server *and* the browser.
- **Changing a table:**
  1. edit the schema file;
  2. `pnpm db:generate` writes a numbered SQL file into [drizzle/](../packages/db/drizzle/);
  3. `pnpm db:migrate` applies it.
- **Audio files** live in two storage buckets: `masters` (private, the full files) and `previews` (public, from phase 4).

---

## 7. Debugging: where to look

### 7.1 Your tools
| Tool | How | Shows you |
|---|---|---|
| **Dev server terminal** | the window running `pnpm dev` | Server errors, every request (`GET /explore 200`), every server action called (`ƒ updateRelease(...)`) |
| **Browser DevTools** | F12 → Console / Network | Browser errors, failed requests, what the page sent |
| **Drizzle Studio** | `pnpm db:studio` | Browse and edit database tables like a spreadsheet |
| **RustFS console** | http://localhost:9001 (login `ferrel` / `ferrelsecret`) | The files in storage |
| **Test report** | `pnpm --filter @ferrel/e2e run report` | Which browser step failed, with screenshot and trace |
| **One test only** | `pnpm --filter @ferrel/e2e exec playwright test specs/releases.spec.ts` | Re-run just the failing journey |

### 7.2 Symptom → first place to look
| Symptom | Look at |
|---|---|
| Page won't load at all / "fetch failed" | Is Docker running? `docker compose ps` → `pnpm db:up` |
| A page shows "not found" when it shouldn't | That page's query (section 4), then [tracks/track-access.ts](../apps/web/src/features/tracks/track-access.ts) for owner pages |
| A form refuses a value | That feature's `rules.ts`; the exact message tells you which check |
| A button is greyed out (Publish…) | [releases/status.ts](../apps/web/src/features/releases/status.ts): the reason text appears under the buttons |
| "This release changed in the meantime" | The `WHERE` conditions in [releases/service.ts](../apps/web/src/features/releases/service.ts) didn't match; reload and retry |
| Upload fails | Browser Network tab (the PUT to `localhost:9000`); use `localhost:3000`, **not** `127.0.0.1`; [audio-upload/service.ts](../apps/web/src/features/audio-upload/service.ts) |
| Sign-in / sign-up error | [components/auth/auth-errors.ts](../apps/web/src/components/auth/auth-errors.ts) maps error codes to messages; server side in [lib/auth.ts](../apps/web/src/lib/auth.ts) |
| Database "violates check constraint …" | The constraint name says which rule: see [schema/tracks.ts](../packages/db/src/schema/tracks.ts) |
| "FFmpeg isn't installed" / FFMPEG_MISSING | Run `pnpm audio:fetch` (downloads the pinned build into `.cache/ffmpeg`); see [packages/audio](../packages/audio/src/) |
| FFMPEG_TAMPERED | The file in `.cache/ffmpeg` doesn't match its pinned SHA-256: delete the folder and run `pnpm audio:fetch` |
| Styles look broken or old | Stop the dev server, delete `apps/web/.next/dev`, start again |
| Strange errors right after `pnpm install` | Restart the dev server (a stale one once produced false errors) |
| A test fails in CI but not locally | Open the PR's "Checks" tab; e2e failures attach a Playwright report |

### 7.3 Debugging habit
1. **Read the exact error** in the terminal or the browser console.
2. **Find the layer** using section 2.2: is it the UI, the action, the service or the database?
3. **Reproduce it in a test.** If a test can show the bug, the fix is proven and stays fixed.

---

## 8. Glossary
| Word | Meaning here |
|---|---|
| **Slug** | The readable part of a URL: `midnight-run` in `/creators/dingo/midnight-run` |
| **Server Action** | A server function the browser can call like a normal function (`"use server"`) |
| **Server / Client Component** | UI code that runs on the server (default) or in the browser (`"use client"`) |
| **Suspense** | A placeholder shown while part of a page waits for data |
| **Migration** | A numbered SQL file that changes the database's structure, applied once and in order |
| **Signed URL** | A short-lived link that allows exactly one upload and nothing else |
| **Bucket** | A top-level folder in file storage (`masters`, `previews`) |
| **Queue / worker** | A to-do list in Redis, and the separate program that works through it |
| **Basis points** | Hundredths of a percent: 10,000 = 100%. Used for exact contributor splits. |
| **CI** | Automatic checks GitHub runs on every pull request |
