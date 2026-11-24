// Phase 5 part 2, step A: an active licensee downloads the full-quality master; nobody else can.
import { readFile } from "node:fs/promises";
import { createUploadUrl, newMasterKey } from "@ferrel/storage";
import { newCreator, signUp, testEmail } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test } from "../helpers/fixtures";
import { main } from "../helpers/page";

test("the licensee downloads the master; others and ended licenses get nothing", async ({ open }) => {
  const artistPage = await open();
  const artist = await newCreator(artistPage, "Alice");
  const artistId = await userIdByEmail(artist.email);
  const [{ id: trackId }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre) values (${artistId}, 'Midnight Run', 'midnight-run', 'electronic') returning id`;
  const wav = makeWav(1);
  const key = newMasterKey(artistId, trackId, "wav");
  const url = await createUploadUrl({ bucket: "masters", key, contentType: "audio/wav", contentLength: wav.length });
  expect((await fetch(url, { method: "PUT", body: new Uint8Array(wav), headers: { "content-type": "audio/wav" } })).status).toBe(200);
  await sql`update tracks set audio_key = ${key}, audio_size_bytes = ${wav.length}, audio_format = 'wav', audio_status = 'ready',
            duration_ms = 1000, status = 'published', published_at = now() where id = ${trackId}`;

  const page = await open();
  const buyerEmail = testEmail("buyer");
  await signUp(page, { name: "Brand Buyer", email: buyerEmail });
  const buyerId = await userIdByEmail(buyerEmail);
  // A license locks a split (phase 5 part 3): 100% the lead artist's, as licensing creates.
  const [{ id: splitVersionId }] = await sql<{ id: string }[]>`insert into split_versions (track_id, version) values (${trackId}, 1) returning id`;
  await sql`insert into split_shares (split_version_id, position, name, role, basis_points, is_lead, user_id, status, responded_at)
            values (${splitVersionId}, 0, 'Alice Music', 'producer', 10000, true, ${artistId}, 'accepted', now())`;
  const insertLicense = (startsAt: string) => sql<{ id: string }[]>`
    insert into licenses (track_id, licensee_id, platforms, cities, term_days, starts_at, ends_at, rate_micros, quote, terms_version, split_version_id)
    values (${trackId}, ${buyerId}, '{tiktok}', '{london}', 30, ${startsAt}::timestamptz, ${startsAt}::timestamptz + interval '30 days',
            500000, '{}', '2026-11-13', ${splitVersionId}) returning id`;
  const [{ id: activeId }] = await insertLicense(new Date().toISOString());
  const [{ id: endedId }] = await insertLicense("2020-01-01T00:00:00Z");
  const m = main(page);

  await test.step("only the active license offers the download, and it saves the real file", async () => {
    await page.goto("/licenses");
    await expect(m.getByTestId("license-card")).toHaveCount(2);
    await expect(m.getByRole("link", { name: "Download master" })).toHaveCount(1);
    const [download] = await Promise.all([page.waitForEvent("download"), m.getByRole("link", { name: "Download master" }).click()]);
    expect(download.suggestedFilename()).toBe("midnight-run.wav");
    expect(await readFile(await download.path())).toEqual(wav);
  });

  await test.step("the page never shows where the master is stored", async () => {
    expect(await page.content()).not.toContain(key);
  });

  await test.step("an ended license, or someone else's, gets no link", async () => {
    expect((await page.request.get(`/licenses/${endedId}/master`, { maxRedirects: 0 })).status()).toBe(404);
    expect((await artistPage.request.get(`/licenses/${activeId}/master`, { maxRedirects: 0 })).status()).toBe(404);
  });

  await test.step("signed out, the link sends you to sign in", async () => {
    const visitor = await open();
    const res = await visitor.request.get(`/licenses/${activeId}/master`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toContain("/sign-in?next=%2Flicenses");
  });
});
