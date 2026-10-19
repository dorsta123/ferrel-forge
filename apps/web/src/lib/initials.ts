/** "DJ Ferrel" -> "DF", "björk" -> "B". Falls back to "?" for blank names. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}
