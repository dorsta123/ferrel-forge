import type { Genre, MusicalKey } from "@ferrel/db/constants";
import { centsToInput } from "./money";
import type { ReleaseFormValues } from "./types";

/** Starting values for a new release. */
export const NEW_RELEASE_VALUES: ReleaseFormValues = {
  title: "",
  slug: "",
  description: "",
  genre: "",
  bpm: "",
  musicalKey: "",
  price: "10.00",
};

/** A stored track as form input, for prefilling the edit form. */
export function releaseFormValues(track: {
  title: string;
  slug: string;
  description: string | null;
  genre: Genre;
  bpm: number | null;
  musicalKey: MusicalKey | null;
  basePriceCents: number;
}): ReleaseFormValues {
  return {
    title: track.title,
    slug: track.slug,
    description: track.description ?? "",
    genre: track.genre,
    bpm: track.bpm === null ? "" : String(track.bpm),
    musicalKey: track.musicalKey ?? "",
    price: centsToInput(track.basePriceCents),
  };
}

/** Rebuild form input from untrusted FormData: only known fields, always strings. */
export function readReleaseForm(formData: FormData): ReleaseFormValues {
  const get = (name: keyof ReleaseFormValues) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: get("title"),
    slug: get("slug"),
    description: get("description"),
    genre: get("genre"),
    bpm: get("bpm"),
    musicalKey: get("musicalKey"),
    price: get("price"),
  };
}
