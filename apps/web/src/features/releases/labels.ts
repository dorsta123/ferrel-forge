import { GENRE_LABELS, type Genre, type MusicalKey } from "@ferrel/db/constants";

const SHARP = "♯"; // ♯

/** "C#m" -> "C♯ minor", "F" -> "F major" */
export function keyLabel(key: MusicalKey): string {
  const minor = key.endsWith("m");
  return `${key.replace("m", "").replace("#", SHARP)} ${minor ? "minor" : "major"}`;
}

/** "C#m" -> "C♯m" (compact, for cards) */
export function keyShort(key: MusicalKey): string {
  return key.replace("#", SHARP);
}

export function genreLabel(genre: Genre): string {
  return GENRE_LABELS[genre];
}
