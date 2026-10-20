"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { creatorProfiles, db } from "@ferrel/db";
import { type CreatorProfileErrors, validateCreatorProfile } from "@/lib/creator-profile";
import { PG_UNIQUE_VIOLATION, pgError } from "@/lib/pg-error";
import { getCurrentUser } from "@/lib/session";

export type BecomeCreatorState = { errors: CreatorProfileErrors & { form?: string } };

export async function becomeCreator(_prev: BecomeCreatorState, formData: FormData): Promise<BecomeCreatorState> {
  // Authorize from the session cookie, never from anything the client sends.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.creator) redirect("/dashboard");

  const input = {
    artistName: String(formData.get("artistName") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
  };

  const errors = validateCreatorProfile(input);
  if (Object.keys(errors).length > 0) return { errors };

  try {
    await db.insert(creatorProfiles).values({
      userId: user.id,
      artistName: input.artistName,
      slug: input.slug,
      bio: input.bio || null,
    });
  } catch (err) {
    const pg = pgError(err);
    if (pg?.code === PG_UNIQUE_VIOLATION && pg.constraint === "creator_profiles_slug_unique") {
      return { errors: { slug: "That URL is taken. Try another." } };
    }
    if (pg?.code === PG_UNIQUE_VIOLATION && pg.constraint === "creator_profiles_pkey") {
      redirect("/dashboard"); // already a creator (e.g. double submit)
    }
    console.error("becomeCreator failed", err);
    return { errors: { form: "Something went wrong. Please try again." } };
  }

  // The header lives in the root layout, which redirect() alone would reuse
  // as-is; revalidate it so the Dashboard link shows immediately.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
