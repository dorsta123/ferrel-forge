// Uploading a track's master audio: browser checks, server byte checks, privacy, access.
import { bucketId, getObjectInfo } from "@ferrel/storage";
import { newCreator } from "../helpers/accounts";
import { makeWav, minimalMp3 } from "../helpers/audio";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

const STORAGE = process.env.S3_ENDPOINT ?? "http://localhost:9000";

test("a creator uploads, replaces and protects a master file", async ({ open }) => {
  const page = await open();
  const m = main(page);
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000) returning id`;
  const stored = async () => (await sql<{ key: string | null; size: string | null; format: string | null }[]>`
    select audio_key as key, audio_size_bytes as size, audio_format as format from tracks where id = ${trackId}`)[0];

  await page.goto(`/dashboard/tracks/${trackId}`);
  await expect(m.getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();

  await test.step("a non-audio file is refused instantly in the browser", async () => {
    await m.getByLabel("Choose an audio file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
    await expect(m.getByRole("alert")).toContainText("Use a WAV, MP3 or FLAC");
  });

  await test.step("a text file named .wav is caught by the server's byte check and not attached", async () => {
    await m.getByLabel("Choose an audio file").setInputFiles({ name: "fake.wav", mimeType: "audio/wav", buffer: Buffer.from("plain text pretending to be audio") });
    await expect(page.getByText("isn't valid audio")).toBeVisible();
    expect((await stored()).key).toBeNull();
  });

  let firstKey = "";
  await test.step("a real WAV uploads, is verified, and is recorded exactly", async () => {
    const wav = makeWav();
    await m.getByLabel("Choose an audio file").setInputFiles({ name: "midnight-run.wav", mimeType: "audio/wav", buffer: wav });
    await expect(page.getByText("uploaded and verified")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("current-audio")).toHaveText(/WAV · 16\sKB/);
    const s = await stored();
    expect(s.key?.startsWith(`${aliceId}/${trackId}/`)).toBe(true);
    expect([Number(s.size), s.format]).toEqual([wav.length, "wav"]);
    firstKey = s.key!;
  });

  await test.step("the stored master can't be downloaded anonymously", async () => {
    expect((await fetch(`${STORAGE}/${bucketId("masters")}/${firstKey}`)).status).toBe(403);
  });

  await test.step("replacing it with an MP3 attaches the new file and deletes the old one", async () => {
    await m.getByLabel("Replace audio file").setInputFiles({ name: "midnight-run.mp3", mimeType: "audio/mpeg", buffer: minimalMp3() });
    await expect(page.getByTestId("current-audio").filter({ hasText: "MP3" })).toBeVisible({ timeout: 20_000 });
    const s = await stored();
    expect(s.key).not.toBe(firstKey);
    expect(s.key?.endsWith(".mp3")).toBe(true);
    expect(await storageHas(firstKey)).toBe(false);
  });

  await test.step("another creator gets 'not found'", async () => {
    const bob = await open();
    await newCreator(bob, "Bob");
    await bob.goto(`/dashboard/tracks/${trackId}`);
    await expect(bob.getByText(/could not be found/i)).toBeVisible();
    await expect(main(bob).getByRole("heading", { name: "Midnight Run" })).toHaveCount(0);
  });

  await test.step("a signed-out visitor is sent to sign in", async () => {
    const anon = await open();
    await anon.goto(`/dashboard/tracks/${trackId}`);
    await expect(anon).toHaveURL(/\/sign-in$/);
  });

  await test.step("the page fits a phone in the light theme", async () => {
    const phone = await open({ viewport: PHONE, theme: "light", as: page });
    await phone.goto(`/dashboard/tracks/${trackId}`);
    await expect(main(phone).getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();
    expect(await fitsWidth(phone)).toBe(true);
  });
});

/** Whether storage still holds an object (an authenticated check, unlike the anonymous fetch above). */
async function storageHas(key: string): Promise<boolean> {
  return (await getObjectInfo("masters", key)) !== null;
}
