// Display name rule, shared by the sign-up form (instant feedback) and the
// Better Auth hooks in auth.ts (the real check — the API can be called directly).

export const DISPLAY_NAME_MAX = 60;

/** Collapse runs of whitespace and trim: "  Sahil   Sharma " -> "Sahil Sharma". */
export function normalizeDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** Returns an error message, or null if the (already normalized) name is valid. */
export function displayNameError(name: string): string | null {
  if (name.length === 0 || name.length > DISPLAY_NAME_MAX) {
    return `Name must be 1–${DISPLAY_NAME_MAX} characters.`;
  }
  return null;
}
