"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLicenseAction } from "./actions";
import type { LicenseErrors, LicenseFormValues } from "./rules";

const START: LicenseFormValues = { platforms: [], cities: [], term: "30", companyName: "", country: "", agreed: false };

/** The license form's state and submit; on success, go to "My licenses". */
export function useLicenseForm(trackId: string) {
  const router = useRouter();
  const [values, setValues] = useState(START);
  const [errors, setErrors] = useState<LicenseErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof LicenseFormValues>(key: K, value: LicenseFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key: "platforms" | "cities", item: string) =>
    setValues((v) => ({ ...v, [key]: v[key].includes(item) ? v[key].filter((x) => x !== item) : [...v[key], item] }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createLicenseAction(trackId, values);
      if (result.ok) {
        router.push(`/licenses?new=${result.licenseId}`);
        router.refresh();
      } else if ("errors" in result) setErrors(result.errors);
      else setError(result.error);
    });
  }

  return { values, errors, error, pending, set, toggle, submit };
}
