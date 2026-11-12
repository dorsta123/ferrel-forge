"use server";

// Thin Server Actions: authenticate from the session cookie, rebuild the input from plain
// strings and booleans only, then delegate. The service decides everything that matters.
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import type { LicenseFormValues } from "./rules";
import { createLicense, type CreateLicenseResult } from "./service";

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 50) : []);

export async function createLicenseAction(trackId: string, input: LicenseFormValues): Promise<CreateLicenseResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const values: LicenseFormValues = {
    platforms: strings(input?.platforms),
    cities: strings(input?.cities),
    term: String(input?.term ?? ""),
    companyName: String(input?.companyName ?? ""),
    country: String(input?.country ?? ""),
    agreed: input?.agreed === true,
  };
  const result = await createLicense(user.id, String(trackId), values);
  if (result.ok) revalidatePath("/licenses");
  return result;
}
