// Release field rules. Pure: the form uses them for instant feedback and the
// service as the real check. The database enforces the same limits (tracks
// check constraints) as a backstop.
import { GENRES, MUSICAL_KEYS, TRACK_LIMITS as L, type Genre, type MusicalKey } from "@ferrel/db/constants";
import { formatCents, parseDollars } from "./money";
import { FALLBACK_SLUG, TRACK_SLUG_PATTERN, trackSlugify } from "./slug";
import type { ReleaseErrors, ReleaseFormValues, ReleaseValues } from "./types";

// Control characters: none in single-line fields; descriptions keep tabs and newlines.
const CONTROL = /[\u0000-\u001f\u007f]/;
const CONTROL_EXCEPT_TAB_NEWLINE = /[\u0000-\u0008\u000b-\u001f\u007f]/;
const DIGITS = /^\d+$/;

export type ReleaseCheck = { ok: true; value: ReleaseValues } | { ok: false; errors: ReleaseErrors };

export function validateRelease(input: ReleaseFormValues): ReleaseCheck {
  const errors: ReleaseErrors = {};

  const title = input.title.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!title) errors.title = "Give your release a title.";
  else if (title.length > L.titleMax) errors.title = `Keep the title under ${L.titleMax} characters.`;
  else if (CONTROL.test(title)) errors.title = "The title contains characters that aren't allowed.";

  // An empty slug means "build it from the title".
  const slug = input.slug.trim() || trackSlugify(title) || FALLBACK_SLUG;
  if (slug.length > L.slugMax) errors.slug = `Keep the URL under ${L.slugMax} characters.`;
  else if (!TRACK_SLUG_PATTERN.test(slug)) errors.slug = "Use lowercase letters, numbers, and single dashes between words.";

  const description = input.description.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (description.length > L.descriptionMax) errors.description = `Keep the description under ${L.descriptionMax} characters.`;
  else if (CONTROL_EXCEPT_TAB_NEWLINE.test(description)) errors.description = "The description contains characters that aren't allowed.";

  const genre = input.genre as Genre;
  if (!GENRES.includes(genre)) errors.genre = "Choose a genre.";

  const bpm = optionalInt(input.bpm);
  if (bpm === undefined || (bpm !== null && (bpm < L.bpmMin || bpm > L.bpmMax))) {
    errors.bpm = `BPM is a whole number from ${L.bpmMin} to ${L.bpmMax}.`;
  }

  const musicalKey = (input.musicalKey || null) as MusicalKey | null;
  if (musicalKey !== null && !MUSICAL_KEYS.includes(musicalKey)) errors.musicalKey = "Choose a key from the list.";

  const totalSupply = optionalInt(input.totalSupply);
  if (totalSupply === null || totalSupply === undefined || totalSupply < L.supplyMin || totalSupply > L.supplyMax) {
    errors.totalSupply = `Copies is a whole number from ${L.supplyMin} to ${L.supplyMax.toLocaleString("en-US")}.`;
  }

  const basePriceCents = parseDollars(input.price);
  if (basePriceCents === null || basePriceCents < L.priceMinCents || basePriceCents > L.priceMaxCents) {
    errors.price = `Price is ${formatCents(L.priceMinCents)}–${formatCents(L.priceMaxCents)}, e.g. 12.50.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      slug,
      description: description || null,
      genre,
      bpm: bpm ?? null,
      musicalKey,
      totalSupply: totalSupply!,
      basePriceCents: basePriceCents!,
    },
  };
}

/** "" -> null, "120" -> 120, anything else ("12.5", "-3", "1e2") -> undefined. */
function optionalInt(input: string): number | null | undefined {
  const s = input.trim();
  if (!s) return null;
  return DIGITS.test(s) && s.length <= 6 ? Number(s) : undefined;
}
