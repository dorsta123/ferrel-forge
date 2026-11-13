import type { Genre, MusicalKey } from "@ferrel/db/constants";

// Shapes shared by the form, the Server Actions and the service. No server imports here.

export const RELEASE_FIELDS = ["title", "slug", "description", "genre", "bpm", "musicalKey", "price", "listenUrl"] as const;
export type ReleaseField = (typeof RELEASE_FIELDS)[number];

/** Raw form input: every field is the string the user typed or picked. */
export type ReleaseFormValues = Record<ReleaseField, string>;

/** Validated, normalized values, ready for the database. */
export type ReleaseValues = {
  title: string;
  slug: string;
  description: string | null;
  genre: Genre;
  bpm: number | null;
  musicalKey: MusicalKey | null;
  /** The artist's base rate per 1,000 exposure-seconds, in micro-dollars (decision 034). */
  baseRateMicros: number;
  /** Optional "Listen to the full song" link (decision 032), cleaned up. */
  listenUrl: string | null;
};

export type ReleaseErrors = Partial<Record<ReleaseField | "form", string>>;

/** useActionState state for the create and edit forms. */
export type ReleaseFormState = { errors: ReleaseErrors; savedAt?: number };

export type ReleaseActionResult = { ok: true } | { ok: false; error: string };
