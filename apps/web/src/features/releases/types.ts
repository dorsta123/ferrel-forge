import type { Genre, MusicalKey } from "@ferrel/db/constants";

// Shapes shared by the form, the Server Actions and the service. No server imports here.

export const RELEASE_FIELDS = ["title", "slug", "description", "genre", "bpm", "musicalKey", "totalSupply", "price"] as const;
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
  totalSupply: number;
  basePriceCents: number;
};

export type ReleaseErrors = Partial<Record<ReleaseField | "form", string>>;

/** useActionState state for the create and edit forms. */
export type ReleaseFormState = { errors: ReleaseErrors; savedAt?: number };

export type ReleaseActionResult = { ok: true } | { ok: false; error: string };
