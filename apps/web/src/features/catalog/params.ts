// Public page inputs from the URL. Pure: bad values fall back to safe defaults
// (or null for slugs), so nothing unexpected ever reaches a query.
import { GENRES, TRACK_LIMITS, type Genre } from "@ferrel/db/constants";
import { SLUG_MAX, SLUG_MIN } from "@/lib/creator-profile";
import { TRACK_SLUG_PATTERN } from "../releases/slug";

export const EXPLORE_PAGE_SIZE = 24;
const MAX_PAGE = 10_000;

type SearchValue = string | string[] | undefined;
const first = (v: SearchValue) => (Array.isArray(v) ? v[0] : v);

export type ExploreParams = { genre: Genre | null; page: number };

export function parseExploreParams(search: { genre?: SearchValue; page?: SearchValue }): ExploreParams {
  const genre = first(search.genre);
  const page = first(search.page) ?? "";
  return {
    genre: GENRES.includes(genre as Genre) ? (genre as Genre) : null,
    page: /^\d{1,5}$/.test(page) ? Math.min(MAX_PAGE, Math.max(1, Number(page))) : 1,
  };
}

/** /explore with only the non-default parts in the query string. */
export function exploreHref({ genre, page }: ExploreParams): string {
  const query = new URLSearchParams();
  if (genre) query.set("genre", genre);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

/** A creator slug from the URL, or null if it can't be one (no query needed). */
export function parseCreatorSlug(value: string): string | null {
  return value.length >= SLUG_MIN && value.length <= SLUG_MAX && TRACK_SLUG_PATTERN.test(value) ? value : null;
}

/** A track slug from the URL, or null if it can't be one. */
export function parseTrackSlug(value: string): string | null {
  return value.length >= 1 && value.length <= TRACK_LIMITS.slugMax && TRACK_SLUG_PATTERN.test(value) ? value : null;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE));
}
