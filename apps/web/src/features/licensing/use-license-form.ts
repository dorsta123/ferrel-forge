"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLicenseAction } from "./actions";
import type { LicenseErrors, LicenseFormValues } from "./rules";

type Choices = Omit<LicenseFormValues, "shownRateMicros">;
const START: Choices = { platforms: [], cities: [], term: "30", companyName: "", country: "", agreed: false };

/** Order the fields appear in, so focus can go to the first problem after a failed submit. */
const FIELD_ORDER = ["platforms", "cities", "term", "companyName", "country", "agreed"] as const;

/**
 * The license form's state and submit. It sends the rate it showed; if the real rate changed
 * meanwhile, the server refuses and the form shows the new rate to review. On success, go to "My licenses".
 */
export function useLicenseForm(trackId: string, initialRateMicros: number) {
  const router = useRouter();
  const [values, setValues] = useState(START);
  const [rateMicros, setRateMicros] = useState(initialRateMicros);
  const [errors, setErrors] = useState<LicenseErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Choices>(key: K, value: Choices[K]) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key: "platforms" | "cities", item: string) =>
    setValues((v) => ({ ...v, [key]: v[key].includes(item) ? v[key].filter((x) => x !== item) : [...v[key], item] }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createLicenseAction(trackId, { ...values, shownRateMicros: rateMicros });
      if (result.ok) {
        router.push(`/licenses?new=${result.licenseId}`);
        router.refresh();
        return;
      }
      if ("errors" in result) {
        setErrors(result.errors);
        const first = FIELD_ORDER.find((f) => result.errors[f]);
        if (first) document.getElementById(`license-${first}`)?.focus();
        return;
      }
      setErrors({}); // a whole-form problem: don't leave stale field errors on screen
      if ("rateMicros" in result) setRateMicros(result.rateMicros);
      setError(result.error);
    });
  }

  return { values, rateMicros, errors, error, pending, set, toggle, submit };
}
