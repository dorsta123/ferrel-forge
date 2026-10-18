import { headers } from "next/headers";
import { creatorProfiles, db, eq } from "@ferrel/db";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  /** Null until the user becomes a creator. */
  creator: { artistName: string; slug: string } | null;
};

/**
 * The signed-in user, or null. Server-only: reads the session cookie, so any
 * component calling this must render inside <Suspense> (cacheComponents).
 * Returns a narrow object so session tokens never reach client components.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;

  const [creator] = await db
    .select({ artistName: creatorProfiles.artistName, slug: creatorProfiles.slug })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, id))
    .limit(1);

  return { id, name, email, creator: creator ?? null };
}
