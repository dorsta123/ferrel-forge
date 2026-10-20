/** The public address of a release: /creators/<creator>/<track>. */
export function trackHref(t: { creatorSlug: string; slug: string }): string {
  return `/creators/${t.creatorSlug}/${t.slug}`;
}

export function creatorHref(creatorSlug: string): string {
  return `/creators/${creatorSlug}`;
}
