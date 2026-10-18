// Creator profile rules, shared by the form (instant feedback) and the server
// action (the real check). The database enforces the same limits as a backstop
// (see creator_profiles check constraints in packages/db/src/schema.ts).

export const ARTIST_NAME_MAX = 60;
export const SLUG_MIN = 3;
export const SLUG_MAX = 30;
export const BIO_MAX = 500;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Slugs that would collide with app routes or look official.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "become-creator", "creator", "creators", "dashboard",
  "help", "login", "logout", "me", "new", "settings", "sign-in", "sign-up", "signin",
  "signup", "support", "system", "tracks", "ferrel", "ferrel-forge",
]);

/** "Björk & Friends!" -> "bjork-friends" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

export type CreatorProfileInput = { artistName: string; slug: string; bio: string };
export type CreatorProfileErrors = Partial<Record<keyof CreatorProfileInput, string>>;

export function validateCreatorProfile({ artistName, slug, bio }: CreatorProfileInput): CreatorProfileErrors {
  const errors: CreatorProfileErrors = {};

  if (!artistName.trim()) errors.artistName = "Enter your artist name.";
  else if (artistName.trim().length > ARTIST_NAME_MAX) errors.artistName = `Keep it under ${ARTIST_NAME_MAX} characters.`;

  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    errors.slug = `Use ${SLUG_MIN}–${SLUG_MAX} characters.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and single dashes between words.";
  } else if (RESERVED_SLUGS.has(slug)) {
    errors.slug = "That URL is reserved. Try another.";
  }

  if (bio.length > BIO_MAX) errors.bio = `Keep your bio under ${BIO_MAX} characters.`;

  return errors;
}
