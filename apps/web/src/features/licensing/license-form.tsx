"use client";

import { LockIcon } from "lucide-react";
import { cn } from "cn";
import { AD_PLATFORMS, AD_PLATFORM_LABELS, CITIES, COUNTRIES, LICENSE_TERMS, LICENSE_TERM_DAYS, LICENSING_LIMITS } from "@ferrel/db/constants";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatRate, RATE_UNIT } from "@/lib/rate";
import { useLicenseForm } from "./use-license-form";

type Props = { trackId: string; rateMicros: number; needsBilling: boolean };

const TERM_LABELS: Record<number, string> = { 30: "30 days", 90: "90 days", 365: "1 year" };
const choice = "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-checked:border-brand has-checked:bg-brand/10";

/** Choose platforms, cities and term, agree to the terms, and license at the locked rate. */
export function LicenseForm({ trackId, rateMicros, needsBilling }: Props) {
  const f = useLicenseForm(trackId);

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      <Choices legend="Where your ads run" error={f.errors.platforms}>
        {AD_PLATFORMS.map((p) => (
          <label key={p} className={choice}>
            <input type="checkbox" className="accent-brand" checked={f.values.platforms.includes(p)} onChange={() => f.toggle("platforms", p)} />
            {AD_PLATFORM_LABELS[p]}
          </label>
        ))}
      </Choices>

      <Choices legend="Cities your ads are shown in" error={f.errors.cities} grid>
        {CITIES.map((c) => (
          <label key={c.code} className={choice}>
            <input type="checkbox" className="accent-brand" checked={f.values.cities.includes(c.code)} onChange={() => f.toggle("cities", c.code)} />
            {c.name}
          </label>
        ))}
      </Choices>

      <Choices legend="How long" error={f.errors.term}>
        {LICENSE_TERM_DAYS.map((d) => (
          <label key={d} className={choice}>
            <input type="radio" name="term" className="accent-brand" checked={f.values.term === String(d)} onChange={() => f.set("term", String(d))} />
            {TERM_LABELS[d]}
          </label>
        ))}
      </Choices>

      {needsBilling && (
        <fieldset className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <legend className="px-1 font-medium">Billing details</legend>
          <p className="-mt-2 text-sm text-muted-foreground">Asked once, for your invoices. You can license more tracks without entering them again.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="companyName" label="Company or brand" error={f.errors.companyName}>
              <Input id="companyName" className="h-10" maxLength={LICENSING_LIMITS.companyNameMax} value={f.values.companyName} aria-invalid={!!f.errors.companyName} onChange={(e) => f.set("companyName", e.target.value)} />
            </FormField>
            <FormField id="country" label="Billing country" error={f.errors.country}>
              <NativeSelect id="country" value={f.values.country} aria-invalid={!!f.errors.country} onChange={(e) => f.set("country", e.target.value)}>
                <option value="" disabled>
                  Choose…
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </fieldset>
      )}

      <section aria-labelledby="rate-heading" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <h2 id="rate-heading" className="font-medium">
          Your rate
        </h2>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold" data-testid="license-rate">
            {formatRate(rateMicros)}
          </span>
          <span className="text-sm text-muted-foreground">{RATE_UNIT}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LockIcon className="size-3.5" aria-hidden="true" /> Locked for this license. You pay monthly for the exposure your ads get (views × seconds watched).
        </p>
      </section>

      <section aria-labelledby="terms-heading" className="flex flex-col gap-3">
        <h2 id="terms-heading" className="font-medium">
          License terms
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
          {LICENSE_TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 accent-brand" checked={f.values.agreed} aria-invalid={!!f.errors.agreed} onChange={(e) => f.set("agreed", e.target.checked)} />I agree to these license terms
        </label>
        {f.errors.agreed && (
          <p role="alert" className="text-sm text-destructive">
            {f.errors.agreed}
          </p>
        )}
      </section>

      {f.error && (
        <p role="alert" className="text-sm text-destructive">
          {f.error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={f.pending} className="h-11 px-6 text-base font-semibold">
          {f.pending ? "Licensing…" : "License this track"}
        </Button>
        <p className="text-xs text-muted-foreground">Testing: no card needed yet, and no real money moves.</p>
      </div>
    </form>
  );
}

function Choices({ legend, error, grid, children }: { legend: string; error?: string; grid?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={!!error}>
      <legend className="mb-1 font-medium">{legend}</legend>
      <div className={cn("flex flex-wrap gap-2", grid && "grid grid-cols-2 sm:grid-cols-4")}>{children}</div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
