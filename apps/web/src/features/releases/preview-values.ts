import { GENRES, MUSICAL_KEYS, TRACK_LIMITS as L, type Genre, type MusicalKey } from "@ferrel/db/constants";
import { parseDollars } from "./money";
import type { ReleaseFormValues } from "./types";

export type ReleasePreview = {
  title: string;
  genre: Genre | null;
  bpm: number | null;
  musicalKey: MusicalKey | null;
  totalSupply: number | null;
  basePriceCents: number | null;
};

/** What the live card can show from half-typed input: each field is its value if valid so far, else null. */
export function previewFromForm(v: ReleaseFormValues): ReleasePreview {
  const bpm = wholeNumber(v.bpm);
  const supply = wholeNumber(v.totalSupply);
  const price = parseDollars(v.price);
  return {
    title: v.title.trim().replace(/\s+/g, " "),
    genre: GENRES.includes(v.genre as Genre) ? (v.genre as Genre) : null,
    bpm: bpm !== null && bpm >= L.bpmMin && bpm <= L.bpmMax ? bpm : null,
    musicalKey: MUSICAL_KEYS.includes(v.musicalKey as MusicalKey) ? (v.musicalKey as MusicalKey) : null,
    totalSupply: supply !== null && supply >= L.supplyMin && supply <= L.supplyMax ? supply : null,
    basePriceCents: price !== null && price >= L.priceMinCents && price <= L.priceMaxCents ? price : null,
  };
}

function wholeNumber(input: string): number | null {
  const s = input.trim();
  return /^\d{1,6}$/.test(s) ? Number(s) : null;
}
