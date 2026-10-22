import type { Locator, Page } from "@playwright/test";

/**
 * The visible <main>. Next 16 keeps visited pages mounted but hidden after
 * client navigation, and React briefly streams a hidden copy of new content,
 * so a plain locator("main") can match two elements.
 */
export const main = (page: Page): Locator => page.locator("main:visible");

/** True when the page has no sideways scrolling. */
export const fitsWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
