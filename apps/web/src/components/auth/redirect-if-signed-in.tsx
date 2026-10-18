import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

/** Render inside <Suspense> on pages that signed-in users shouldn't see. */
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/");
  return null;
}
