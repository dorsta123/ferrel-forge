// Track URL slugs: /creators/<creator>/<track-slug>. Unique per creator,
// editable while a draft, locked once first published (decision 009).
import { TRACK_LIMITS } from "@ferrel/db/constants";

export const TRACK_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Used when a title has no letters a–z or digits to build a slug from (e.g. "!!!"). */
export const FALLBACK_SLUG = "release";

/** "Midnight Run (Remix)!" -> "midnight-run-remix" */
export function trackSlugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TRACK_LIMITS.slugMax)
    .replace(/-+$/, "");
}

/** "midnight-run", 2 -> "midnight-run-2", trimming the base so the result stays within the limit. */
export function slugWithSuffix(base: string, n: number): string {
  const suffix = `-${n}`;
  return base.slice(0, TRACK_LIMITS.slugMax - suffix.length).replace(/-+$/, "") + suffix;
}

/** The base slug if free, otherwise the first free "-2", "-3", … */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = slugWithSuffix(base, n);
    if (!taken.has(candidate)) return candidate;
  }
}
