// End to end: a creator publishes, a visitor finds it, the creator edits and
// archives it, and the visitor sees each change. Once per theme/device.
import { newCreator } from "../helpers/accounts";
import { makeWav } from "../helpers/audio";
import { sql } from "../helpers/db";
import { DESKTOP, PHONE, expect, test } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

const VARIANTS = [
  { name: "dark desktop", theme: "dark", viewport: DESKTOP },
  { name: "light desktop", theme: "light", viewport: DESKTOP },
  { name: "light phone", theme: "light", viewport: PHONE },
] as const;

for (const variant of VARIANTS) {
  test(`publish, discover, edit, archive (${variant.name})`, async ({ open }) => {
    const creator = await open({ theme: variant.theme, viewport: variant.viewport });
    const visitor = await open({ theme: variant.theme, viewport: variant.viewport });
    const c = main(creator);
    const v = main(visitor);
    const title = `Journey ${variant.name}`;
    const trackSlug = title.toLowerCase().replace(/\s+/g, "-");
    const overflowed: string[] = [];
    const checkWidth = async (page: typeof creator, label: string) => {
      await page.waitForLoadState("networkidle");
      if (!(await fitsWidth(page))) overflowed.push(label);
    };
    let artist = { slug: "" };
    let trackId = "";

    await test.step("the creator signs up, creates, uploads and publishes", async () => {
      artist = await newCreator(creator, "Jo");
      await expect(c.getByText("No releases yet")).toBeVisible();
      await checkWidth(creator, "dashboard (empty)");
      await c.getByRole("link", { name: "Create your first release" }).click();
      await creator.waitForURL("**/dashboard/tracks/new");
      await creator.waitForLoadState("networkidle");
      await c.getByLabel("Title", { exact: true }).fill(title);
      await c.getByLabel("Genre").selectOption("cinematic");
      await c.getByLabel("Base rate", { exact: true }).fill("8");
      await checkWidth(creator, "new release");
      await c.getByRole("button", { name: "Create draft" }).click();
      await creator.waitForURL(/\/dashboard\/tracks\/[0-9a-f-]{36}$/);
      trackId = creator.url().split("/").pop()!;
      await c.getByLabel("Choose an audio file").setInputFiles({ name: "journey.wav", mimeType: "audio/wav", buffer: makeWav() });
      await expect(creator.getByText("uploaded and verified")).toBeVisible({ timeout: 20_000 });
      await expect(c.getByRole("button", { name: "Publish" })).toBeEnabled();
      await c.getByRole("button", { name: "Publish" }).click();
      await expect(c.getByTestId("status-badge")).toHaveText("Published");
      await checkWidth(creator, "editor (published)");
    });

    await test.step("a visitor finds it on the homepage and under its genre", async () => {
      await visitor.goto("/");
      const card = v.getByRole("list", { name: "Latest releases" }).getByTestId("release-card").filter({ hasText: title });
      await expect(card).toBeVisible();
      await checkWidth(visitor, "home");
      await card.click();
      await visitor.waitForURL(`**/creators/${artist.slug}/${trackSlug}`);
      await expect(v.getByTestId("license-panel")).toContainText("Licensing opens soon");
      await expect(v).not.toContainText("$8.00");
      await checkWidth(visitor, "release");
      await visitor.goto("/explore?genre=cinematic");
      await expect(v.getByTestId("release-card").filter({ hasText: title })).toBeVisible();
      await checkWidth(visitor, "explore");
    });

    await test.step("an edit shows publicly at once, URL unchanged", async () => {
      await c.getByLabel("Title", { exact: true }).fill(`${title} (Final)`);
      await c.getByRole("button", { name: "Save changes" }).click();
      await expect(c.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
      await visitor.goto(`/creators/${artist.slug}/${trackSlug}`);
      await expect(v.getByRole("heading", { name: `${title} (Final)`, level: 1 })).toBeVisible();
    });

    await test.step("the rate stays private: the creator sees it on the dashboard, visitors never do", async () => {
      await creator.goto("/dashboard");
      const row = c.getByTestId("track-row").filter({ hasText: "(Final)" });
      await expect(row).toContainText("$8.00");
      await expect(c.getByTestId("stat-active-licenses")).toContainText("0");
      await checkWidth(creator, "dashboard");
      await visitor.reload();
      await expect(v.getByTestId("license-panel")).toBeVisible();
      await expect(v).not.toContainText("$8.00");
    });

    await test.step("archiving removes it from Explore but its page still opens", async () => {
      await c.getByTestId("track-row").filter({ hasText: "(Final)" }).click();
      await creator.waitForURL(`**/dashboard/tracks/${trackId}`);
      await c.getByRole("button", { name: "Archive" }).click();
      await c.getByRole("button", { name: "Yes, archive" }).click();
      await expect(c.getByTestId("status-badge")).toHaveText("Archived");
      await visitor.goto("/explore?genre=cinematic");
      await visitor.waitForLoadState("networkidle");
      await expect(v.getByTestId("release-card").filter({ hasText: "(Final)" })).toHaveCount(0);
      await visitor.goto(`/creators/${artist.slug}/${trackSlug}`);
      await expect(v.getByText("No longer for sale")).toBeVisible();
      await creator.goto("/dashboard?status=archived");
      await expect(c.getByTestId("track-row").filter({ hasText: "(Final)" })).toBeVisible();
    });

    expect(overflowed, "pages with sideways scrolling").toEqual([]);
  });
}
