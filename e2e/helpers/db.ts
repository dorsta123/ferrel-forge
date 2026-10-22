// Direct database access for setting up scenarios (e.g. simulating a sale)
// and cleaning up. Queries are parameterized tagged templates.
import "./env";
import postgres from "postgres";
import { deleteObject } from "@ferrel/storage";

const connect = () => postgres(process.env.DATABASE_URL!, { max: 2, onnotice: () => {} });

/** Shared connection for tests (one per Playwright worker process). */
export const sql = connect();

/** Every test account matches this, so cleanup can never touch a real account. */
export const TEST_EMAIL_LIKE = "e2e.%@example.com";

export async function userIdByEmail(email: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  if (!row) throw new Error(`No user ${email}`);
  return row.id;
}

/**
 * Remove all test accounts, their tracks, and the audio those tracks point to.
 * Uses its own short-lived connection (global setup and teardown share a process).
 */
export async function purgeTestAccounts(): Promise<void> {
  const db = connect();
  try {
    const files = await db<{ key: string }[]>`
      select t.audio_key as key from tracks t join users u on u.id = t.creator_id
      where u.email like ${TEST_EMAIL_LIKE} and t.audio_key is not null`;
    for (const { key } of files) await deleteObject("masters", key);
    await db`delete from tracks where creator_id in (select id from users where email like ${TEST_EMAIL_LIKE})`;
    await db`delete from users where email like ${TEST_EMAIL_LIKE}`;
  } finally {
    await db.end();
  }
}
