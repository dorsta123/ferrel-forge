import { GENRES, MUSICAL_KEYS, TRACK_LIMITS as L, type Genre, type MusicalKey } from "@ferrel/db/constants";
import type { ReleaseFormValues } from "./types";

/** What the public card shows. The artist's rate is private, so it isn't part of the preview. */
export type ReleasePreview = {
  title: string;
  genre: Genre | null;
  bpm: number | null;
  musicalKey: MusicalKey | null;
};

/** What the live card can show from half-typed input: each field is its value if valid so far, else null. */
export function previewFromForm(v: ReleaseFormValues): ReleasePreview {
  const bpm = wholeNumber(v.bpm);
  return {
    title: v.title.trim().replace(/\s+/g, " "),
    genre: GENRES.includes(v.genre as Genre) ? (v.genre as Genre) : null,
    bpm: bpm !== null && bpm >= L.bpmMin && bpm <= L.bpmMax ? bpm : null,
    musicalKey: MUSICAL_KEYS.includes(v.musicalKey as MusicalKey) ? (v.musicalKey as MusicalKey) : null,
  };
}

function wholeNumber(input: string): number | null {
  const s = input.trim();
  return /^\d{1,6}$/.test(s) ? Number(s) : null;
}
