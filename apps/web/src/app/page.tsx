import { Suspense } from "react";
import { connection } from "next/server";
import { quotePrice } from "@ferrel/pricing";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">ferrel-forge</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Licensed music marketplace with dynamic pricing.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-medium">Pricing engine check</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Base $10.00, 50 of 100 copies left →{" "}
          <strong>${(quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 50 }) / 100).toFixed(2)}</strong>
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-medium">Tracks in database</h2>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <TrackList />
        </Suspense>
      </section>
    </main>
  );
}

async function TrackList() {
  await connection();
  const result = await loadTracks();

  if ("error" in result) {
    return (
      <p className="text-sm text-red-600">
        Database unavailable — run <code>pnpm db:up</code> and <code>pnpm db:migrate</code>.
        <br />
        <span className="text-zinc-500">{result.error}</span>
      </p>
    );
  }
  if (result.rows.length === 0) {
    return <p className="text-sm text-zinc-500">Connected. No tracks yet.</p>;
  }
  return (
    <ul className="list-disc pl-5 text-sm">
      {result.rows.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}

async function loadTracks() {
  try {
    const { db, tracks } = await import("@ferrel/db");
    return { rows: await db.select().from(tracks).limit(20) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
