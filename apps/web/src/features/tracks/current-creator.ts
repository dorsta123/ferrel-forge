import { getCurrentUser } from "@/lib/session";

/**
 * For Server Actions: the signed-in creator's id, read from the session cookie
 * (never from anything the client sends). Null when signed out,
 * "not-creator" for buyers.
 */
export async function currentCreatorId(): Promise<string | null | "not-creator"> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.creator ? user.id : "not-creator";
}
