// Test accounts for integration tests: created straight in the database and
// removed afterwards together with their tracks and stored audio.
import { randomUUID } from "node:crypto";
import { creatorProfiles, db, sql, tracks, users } from "@ferrel/db";
import { deleteObject } from "@ferrel/storage";

const run = Date.now().toString(36);

/** Every user this file created, so cleanup works even if setup failed halfway. */
const created: string[] = [];

export type TestUser = { id: string; slug: string | null };

/** Users (optionally with creator profiles). Emails match e2e.*@example.com; slugs are unique per run. */
export async function createUsers(labels: string[], { creators = true } = {}): Promise<TestUser[]> {
  const fresh = labels.map((label) => ({ id: randomUUID(), label: label.toLowerCase() }));
  await db.insert(users).values(fresh.map((u) => ({ id: u.id, name: u.label, email: `e2e.int.${u.label}.${run}@example.com` })));
  created.push(...fresh.map((u) => u.id));
  if (!creators) return fresh.map((u) => ({ id: u.id, slug: null }));
  const withSlugs = fresh.map((u) => ({ ...u, slug: `int-${u.label}-${run}`.slice(0, 30) }));
  await db.insert(creatorProfiles).values(withSlugs.map((u) => ({ userId: u.id, artistName: `Int ${u.label}`, slug: u.slug })));
  return withSlugs.map((u) => ({ id: u.id, slug: u.slug }));
}

/** Remove every user created in this file, with their tracks and any audio those tracks point to. */
export async function removeCreatedUsers(): Promise<void> {
  const ids = created.splice(0);
  if (ids.length === 0) return;
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  const owned = sql`${tracks.creatorId} in (${idList})`;
  const files = await db.select({ key: tracks.audioKey }).from(tracks).where(owned);
  await Promise.all(files.map((f) => (f.key ? deleteObject("masters", f.key) : null)));
  await db.delete(tracks).where(owned);
  await db.delete(users).where(sql`${users.id} in (${idList})`);
}

/** Postgres error code and constraint name from a Drizzle error. */
export function pgError(err: unknown): { code?: string; constraint?: string } {
  const e = (err as { cause?: unknown })?.cause ?? err;
  const { code, constraint_name } = (e ?? {}) as { code?: string; constraint_name?: string };
  return { code, constraint: constraint_name };
}

export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
