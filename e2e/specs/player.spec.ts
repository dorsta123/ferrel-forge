// A visitor plays a release's 15-second preview; the master is never requested (phase 4 slice 10).
// A real 15 s WAV stands in for the preview MP3 (no FFmpeg in this test job); browsers play by content type.
import { randomUUID } from "node:crypto";
import { bucketId, createUploadUrl, deleteObject } from "@ferrel/storage";
import { newCreator } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("a visitor plays the preview, never the master; with previews off there's no player", async ({ open }) => {
  const page = await open();
  const alice = await newCreator(page, "Alice");
  const aliceId = await userIdByEmail(alice.email);
  const [creator] = await sql<{ slug: string }[]>`select slug from creator_profiles where user_id = ${aliceId}`;
  const waveform = Array.from({ length: 200 }, (_, i) => (i * 37) % 1000);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents, status, published_at,
                        audio_key, audio_size_bytes, audio_format, audio_status, duration_ms, waveform)
    values (${aliceId}, 'Midnight Run', 'midnight-run', 'electronic', 1000, 'published', now(),
            ${`${aliceId}/x/a.wav`}, 10, 'wav', 'ready', 222000, ${waveform}) returning id`;
  const previewKey = `${trackId}/${randomUUID()}.mp3`;
  const wav = makeWav(15);
  const url = await createUploadUrl({ bucket: "previews", key: previewKey, contentType: "audio/wav", contentLength: wav.length });
  expect((await fetch(url, { method: "PUT", body: new Uint8Array(wav), headers: { "content-type": "audio/wav" } })).status).toBe(200);
  await sql`update tracks set preview_key = ${previewKey} where id = ${trackId}`;

  // Watch every request the visitor's browser makes.
  const visitor = await open();
  const requested: string[] = [];
  visitor.on("request", (r) => requested.push(r.url()));
  const m = main(visitor);
  await visitor.goto(`/creators/${creator.slug}/midnight-run`);
  await visitor.waitForLoadState("networkidle");

  await test.step("the preview isn't downloaded until play is pressed", async () => {
    await expect(m.getByRole("button", { name: "Play preview" })).toBeVisible();
    expect(requested.some((u) => u.includes(previewKey))).toBe(false);
  });

  await test.step("pressing play plays it: time advances and the button becomes Pause", async () => {
    await m.getByRole("button", { name: "Play preview" }).click();
    await expect(m.getByRole("button", { name: "Pause preview" })).toBeVisible();
    await expect(m.getByTestId("player-time")).not.toHaveText(/^0:00 \//, { timeout: 10_000 });
    await m.getByRole("button", { name: "Pause preview" }).click();
    await expect(m.getByRole("button", { name: "Play preview" })).toBeVisible();
  });

  await test.step("only the preview was requested, never anything from the masters bucket", async () => {
    expect(requested.some((u) => u.includes(previewKey))).toBe(true);
    expect(requested.some((u) => u.includes(`/${bucketId("masters")}/`))).toBe(false);
  });

  await test.step("with previews switched off there's no player", async () => {
    await sql`update tracks set preview_enabled = false, preview_key = null where id = ${trackId}`;
    await deleteObject("previews", previewKey); // as switching off does
    await visitor.reload();
    await expect(m.getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();
    await expect(m.getByRole("button", { name: "Play preview" })).toHaveCount(0);
  });
});
