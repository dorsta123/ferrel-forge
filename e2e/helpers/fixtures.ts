// `open()` makes a fresh, isolated browser session (its own cookies) with a
// chosen theme and screen size. Every page it opens is watched for console
// errors; the test fails if any appear, unless the page was told to expect them.
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

export const DESKTOP = { width: 1280, height: 900 };
export const PHONE = { width: 390, height: 844 };

type OpenOptions = {
  /** Theme preset in localStorage; null leaves the visitor's default untouched. */
  theme?: "dark" | "light" | null;
  viewport?: { width: number; height: number };
  /** Start signed in as the user of another page. */
  as?: Page;
  reducedMotion?: "reduce" | "no-preference";
  /** Console messages to tolerate on this page (e.g. expected 404s). */
  allow?: RegExp[];
};

export const test = base.extend<{ open: (options?: OpenOptions) => Promise<Page> }>({
  open: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    const errors: string[] = [];

    await use(async ({ theme = "dark", viewport = DESKTOP, as, reducedMotion, allow = [] } = {}) => {
      const context = await browser.newContext({
        viewport,
        reducedMotion,
        storageState: as ? await as.context().storageState() : undefined,
      });
      contexts.push(context);
      if (theme) await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
      const page = await context.newPage();
      page.on("console", (m) => {
        if (m.type() === "error" && !allow.some((re) => re.test(m.text()))) errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(String(e)));
      return page;
    });

    for (const c of contexts) await c.close();
    if (testInfo.status === testInfo.expectedStatus) expect(errors, "browser console errors").toEqual([]);
  },
});

export { expect };
