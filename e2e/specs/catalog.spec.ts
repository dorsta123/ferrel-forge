// Public pages for anyone: homepage releases, Explore, creator and release pages, not-found rules.
import { newCreator, testEmail, testSlug } from "../helpers/accounts";
import { sql, userIdByEmail } from "../helpers/db";
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

const BOT = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
/** Must equal EXPLORE_PAGE_SIZE in apps/web/src/features/catalog/params.ts. */
const PAGE_SIZE = 24;
const SECRET_FOLDER = "secret-folder";

type Release = { title: string; slug: string; genre: string; price?: number; minutesAgo?: number; status?: string; bpm?: number; key?: string; description?: string; durationMs?: number };

async function addRelease(creatorId: string, r: Release, audioKey = `${creatorId}/x/${r.slug}.wav`) {
  const draft = r.status === "draft";
  const [{ id }] = await sql<{ id: string }[]>`
    insert into tracks (creator_id, title, slug, genre, base_price_cents, status, published_at,
                        audio_key, audio_size_bytes, audio_format, bpm, musical_key, description, duration_ms)
    values (${creatorId}, ${r.title}, ${r.slug}, ${r.genre}, ${r.price ?? 1250}, ${r.status ?? "published"},
            ${draft ? null : new Date(Date.now() - (r.minutesAgo ?? 0) * 60_000)},
            ${draft ? null : audioKey}, ${draft ? null : 10}, ${draft ? null : "wav"}, ${r.bpm ?? null}, ${r.key ?? null}, ${r.description ?? null}, ${r.durationMs ?? null})
    returning id`;
  return id;
}

test("anyone can browse published releases, and only those", async ({ open }) => {
  // ---- Setup: Alice (signed up through the UI, so she can use her editor) and Bob (database only).
  const owner = await open();
  const alice = await newCreator(owner, "Alice", { bio: "Late-night synth records." });
  const aliceId = await userIdByEmail(alice.email);
  const liveId = await addRelease(
    aliceId,
    { title: "Midnight Run", slug: "midnight-run", genre: "electronic", minutesAgo: 1, bpm: 124, key: "Am", description: "A late drive through neon.", durationMs: 222_000 },
    `${aliceId}/${SECRET_FOLDER}/master.wav`,
  );
  await addRelease(aliceId, { title: "Quiet Song", slug: "quiet-song", genre: "lo-fi", minutesAgo: 2 });
  await addRelease(aliceId, { title: "Golden Hour", slug: "golden-hour", genre: "pop", status: "draft" });
  await addRelease(aliceId, { title: "Old Tape", slug: "old-tape", genre: "ambient", status: "archived", minutesAgo: 500 });
  const bobSlug = testSlug("bob");
  const [{ id: bobId }] = await sql<{ id: string }[]>`insert into users (id, name, email) values (gen_random_uuid(), 'Bob', ${testEmail("bob")}) returning id`;
  await sql`insert into creator_profiles (user_id, artist_name, slug) values (${bobId}, 'Bob Beats', ${bobSlug})`;
  // Enough for a second Explore page, in one insert.
  const bobTracks = Array.from({ length: PAGE_SIZE + 2 }, (_, i) => ({
    creator_id: bobId, title: `Bob Track ${String(i).padStart(2, "0")}`, slug: `bob-track-${i}`, genre: "rock",
    base_price_cents: 1250, status: "published", published_at: new Date(Date.now() - (60 + i) * 60_000),
    audio_key: `${bobId}/x/bob-track-${i}.wav`, audio_size_bytes: 10, audio_format: "wav",
  }));
  await sql`insert into tracks ${sql(bobTracks)}`;
  // Counted from the database, so real releases already there don't break the test.
  const count = async (genre?: string) =>
    Number((await sql`select count(*) from tracks where status = 'published' and (${genre ?? null}::track_genre is null or genre = ${genre ?? null})`)[0].count);
  const published = await count();
  const lofi = await count("lo-fi");

  const page = await open({ allow: [/status of 404/] });
  const m = main(page);
  const cards = m.getByTestId("release-card");

  await test.step("the homepage shows the 4 newest releases, never drafts or archived", async () => {
    await page.goto("/");
    const latest = m.getByRole("list", { name: "Latest releases" }).getByTestId("release-card").locator("h3");
    await expect(latest).toHaveCount(4);
    await expect(latest.nth(0)).toHaveText("Midnight Run");
    await expect(latest.nth(1)).toHaveText("Quiet Song");
  });

  await test.step(`Explore lists everything published, ${PAGE_SIZE} per page`, async () => {
    const pages = Math.ceil(published / PAGE_SIZE);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Explore" }).click();
    await page.waitForURL("/explore");
    await expect(m.getByText(`${published} releases`)).toBeVisible();
    await expect(cards).toHaveCount(PAGE_SIZE);
    await m.getByRole("link", { name: "Older" }).click();
    await page.waitForURL("**/explore?page=2");
    await expect(m.getByText(`Page 2 of ${pages}`)).toBeVisible();
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, published - PAGE_SIZE));
    await m.getByRole("link", { name: "Newer" }).click();
    await page.waitForURL("/explore");
  });

  await test.step("genre filter, bad filter values and out-of-range pages", async () => {
    await m.getByRole("navigation", { name: "Filter by genre" }).getByRole("link", { name: "Lo-fi" }).click();
    await page.waitForURL("**/explore?genre=lo-fi");
    await expect(m.getByText(`${lofi} release${lofi === 1 ? "" : "s"} in Lo-fi`)).toBeVisible();
    await expect(cards.filter({ hasText: "Quiet Song" })).toHaveCount(1);
    for (const card of await cards.all()) await expect(card).toContainText("Lo-fi");
    await expect(m.getByRole("link", { name: "Lo-fi" })).toHaveAttribute("aria-current", "page");
    await page.goto("/explore?genre=polka&page=abc");
    await expect(cards).toHaveCount(PAGE_SIZE);
    await page.goto("/explore?page=50");
    await expect(m.getByText("This page is empty")).toBeVisible();
    await expect(m.getByRole("link", { name: "Back to the first page" })).toHaveCount(1);
  });

  await test.step("a release page shows details and 'Licensing opens soon', but no price", async () => {
    await page.goto("/explore");
    await cards.filter({ hasText: "Midnight Run" }).click();
    await page.waitForURL(`**/creators/${alice.slug}/midnight-run`);
    await expect(m.getByRole("heading", { name: "Midnight Run", level: 1 })).toBeVisible();
    await expect(m.getByTestId("license-panel")).toContainText("License this track for your ads");
    await expect(m.getByRole("button", { name: "Licensing opens soon" })).toBeDisabled();
    for (const text of ["124", "A minor", "3:42", "A late drive through neon."]) await expect(m).toContainText(text);
    // The artist's rate ($12.50) is private until pricing is decided; nothing about copies either.
    await expect(m).not.toContainText("$12.50");
    await expect(m).not.toContainText(/copies|of \d+ left|sold out/i);
    await expect(page).toHaveTitle("Midnight Run by Alice Music · ferrel-forge");
    const html = await page.content();
    expect(html).not.toContain(SECRET_FOLDER);
    expect(html).not.toContain(`${liveId}/`);
  });

  await test.step("the creator page shows the bio and only published releases", async () => {
    await m.getByRole("link", { name: "Alice Music" }).first().click();
    await page.waitForURL(`**/creators/${alice.slug}`);
    await expect(m.getByRole("heading", { name: "Alice Music", level: 1 })).toBeVisible();
    await expect(cards.locator("h3")).toHaveText(["Midnight Run", "Quiet Song"]);
    await expect(m.getByText("Late-night synth records.")).toHaveCount(1);
    await expect(page).toHaveTitle("Alice Music · ferrel-forge");
  });

  await test.step("archived pages still open, marked as no longer for sale", async () => {
    await page.goto(`/creators/${alice.slug}/old-tape`);
    await expect(m.getByText("No longer for sale")).toBeVisible();
    await expect(m.getByRole("button", { name: /Licensing/ })).toHaveCount(0);
  });

  await test.step("drafts, mismatched and malformed URLs are not found; crawlers get a real 404", async () => {
    for (const path of [`/creators/${alice.slug}/golden-hour`, `/creators/${bobSlug}/midnight-run`, "/creators/nobody-at-all-here", "/creators/NOT..VALID/x"]) {
      await page.goto(path);
      await expect(page.getByText(/could not be found/i).first()).toBeVisible();
      await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
      expect((await fetch(new URL(path, page.url()), { headers: { "user-agent": BOT } })).status, path).toBe(404);
    }
    const real = await fetch(new URL(`/creators/${alice.slug}/midnight-run`, page.url())).then((r) => r.text());
    expect(real).not.toContain('content="noindex"');
  });

  await test.step("the owner's editor links to the public page", async () => {
    await owner.goto(`/dashboard/tracks/${liveId}`);
    await main(owner).getByRole("link", { name: /view public page/ }).click();
    await owner.waitForURL(`**/creators/${alice.slug}/midnight-run`);
  });

  await test.step("public pages fit a phone in the light theme", async () => {
    const phone = await open({ viewport: PHONE, theme: "light" });
    for (const [path, ready] of [["/explore", "release-card"], [`/creators/${alice.slug}/midnight-run`, "license-panel"], [`/creators/${alice.slug}`, "release-card"], ["/", "release-card"]]) {
      await phone.goto(path);
      await expect(main(phone).getByTestId(ready).first()).toBeVisible();
      expect(await fitsWidth(phone), path).toBe(true);
    }
  });
});
