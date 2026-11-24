"use client";

// "Extend" on an active license: more days at the same locked rate (phase 5 part 4).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LICENSE_TERM_DAYS } from "@ferrel/db/constants";
import { Button } from "@/components/ui/button";
import { formatRate, RATE_UNIT } from "@/lib/rate";
import { extendLicenseAction } from "./actions";

const LABELS: Record<number, string> = { 30: "30 days", 90: "90 days", 365: "1 year" };

export function ExtendLicense({ licenseId, rateMicros }: { licenseId: string; rateMicros: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="mt-1 h-9 px-4">
        Extend
      </Button>
    );
  }

  const extend = () =>
    startTransition(async () => {
      setError(null);
      const r = await extendLicenseAction(licenseId, days).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
      if (!r.ok) return setError(r.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <fieldset className="mt-1 flex flex-col gap-2 rounded-xl border p-3 text-left sm:items-end sm:text-right">
      <legend className="sr-only">Extend this license</legend>
      <div className="flex flex-wrap gap-2">
        {LICENSE_TERM_DAYS.map((d) => (
          <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm has-checked:border-brand has-checked:bg-brand/10">
            <input type="radio" name={`extend-${licenseId}`} value={d} checked={days === String(d)} onChange={() => setDays(String(d))} className="accent-brand" />
            {LABELS[d]}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        At your locked rate: {formatRate(rateMicros)} {RATE_UNIT}.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={extend} disabled={pending} className="h-9 px-4">
          {pending ? "Extending…" : "Confirm extension"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="h-9 px-3"
        >
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
