// The homepage explains the product as it is now: licensing for ads, paid by
// exposure, split between contributors. No prices until pricing is decided.
import { expect, test, PHONE } from "../helpers/fixtures";
import { fitsWidth, main } from "../helpers/page";

test("the homepage explains exposure licensing, without prices", async ({ open }) => {
  const page = await open();
  const m = main(page);
  await page.goto("/");

  await test.step("the hero names the model and leads to Explore", async () => {
    await expect(m.getByRole("heading", { level: 1 })).toHaveText("Pay for the music people actually hear.");
    await m.getByRole("link", { name: "Explore tracks" }).first().click();
    await page.waitForURL("/explore");
    await page.goBack();
  });

  await test.step("the example shows views × seconds watched = exposure, and a split that adds up to 100%", async () => {
    const example = m.getByTestId("exposure-example");
    await expect(example).toContainText("example");
    await expect(example).toContainText("120,000");
    await expect(example).toContainText("1,080,000 exposure-seconds");
    const shares = await example.getByRole("list", { name: "Contributor shares" }).getByRole("listitem").allTextContents();
    const total = shares.map((s) => Number(s.match(/([\d.]+)%/)?.[1])).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  await test.step("how it works has the four steps", async () => {
    const steps = page.locator("#how ol > li h3");
    await expect(steps).toHaveText(["Artists list tracks", "Advertisers license them", "Exposure is measured", "Everyone gets paid"]);
  });

  await test.step("our own copy never describes copies or shows a price", async () => {
    // Only the page's own sections: the Latest releases strip shows live track titles.
    for (const section of [m.locator("section").first(), page.locator("#how"), page.locator("#creators")]) {
      await expect(section).not.toContainText(/copies|sold out|rarer|\$\d/i);
    }
  });
});

test("the sign-in side panel describes exposure, not copies", async ({ open }) => {
  const page = await open();
  await page.goto("/sign-in");
  const aside = page.locator("aside");
  await expect(aside).toContainText("Paid for every second your music is heard.");
  await expect(aside).toContainText("1,080,000");
  await expect(aside).not.toContainText(/copy|\$\d/i);
});

test("the homepage fits a phone in the light theme", async ({ open }) => {
  const page = await open({ viewport: PHONE, theme: "light" });
  await page.goto("/");
  await expect(main(page).getByTestId("exposure-example")).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});
