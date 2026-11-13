import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { safeReturnTo } from "@/lib/return-to";

/**
 * Render inside <Suspense> on pages that signed-in users shouldn't see. Sends them where they
 * were heading (?next=, a path on this site only), so it never undoes the form's own redirect.
 */
export async function RedirectIfSignedIn({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await getCurrentUser())) return null;
  const { next } = await searchParams;
  redirect(safeReturnTo(typeof next === "string" ? next : null));
}
