"use client";

import { startTransition, useActionState } from "react";
import { CheckCircle2Icon, LockIcon } from "lucide-react";
import { GENRES, MUSICAL_KEYS, TRACK_LIMITS as L } from "@ferrel/db/constants";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { genreLabel, keyLabel } from "./labels";
import { formatCents } from "./money";
import { ReleasePreview } from "./release-preview";
import type { ReleaseLocks } from "./status";
import type { ReleaseFormState, ReleaseFormValues } from "./types";
import { useReleaseForm } from "./use-release-form";

type Props = {
  mode: "create" | "edit";
  action: (prev: ReleaseFormState, formData: FormData) => Promise<ReleaseFormState>;
  initial: ReleaseFormValues;
  locks: ReleaseLocks;
  creatorSlug: string;
  artistName: string;
  coverSeed: string;
  /** Track length, once phase 4 reads it from the audio. */
  durationMs: number | null;
};

const INITIAL_STATE: ReleaseFormState = { errors: {} };

export function ReleaseForm({ mode, action, initial, locks, creatorSlug, artistName, coverSeed, durationMs }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const { values, set, errors, preview, dirty } = useReleaseForm(initial, locks, state);
  const saved = mode === "edit" && state.savedAt !== undefined && !dirty && !pending;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        noValidate
        className="flex min-w-0 flex-col gap-5 rounded-2xl border bg-card p-6 sm:p-8"
        // Not action={formAction}: React then resets the form after every submit,
        // which snaps <select>s back to their first option while state keeps the
        // real value — the next save would silently change genre and key.
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <fieldset disabled={locks.readOnly} className="flex min-w-0 flex-col gap-5">
          <legend className="sr-only">Release details</legend>

          <FormField id="title" label="Title" error={errors.title}>
            <Input
              id="title"
              name="title"
              className="h-10"
              value={values.title}
              maxLength={L.titleMax}
              aria-invalid={!!errors.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </FormField>

          <FormField
            id="slug"
            label="URL"
            error={errors.slug}
            hint={
              <>
                /creators/{creatorSlug}/<span className="font-medium text-foreground">{values.slug || "your-title"}</span>
                {" · "}
                {locks.slug ? <LockedNote>Fixed once published, so shared links keep working.</LockedNote> : "Locks when you publish."}
              </>
            }
          >
            <Input
              id="slug"
              name="slug"
              className="h-10 font-mono"
              value={values.slug}
              maxLength={L.slugMax}
              disabled={locks.slug}
              aria-invalid={!!errors.slug}
              aria-describedby="slug-hint"
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
            />
          </FormField>

          <FormField id="description" label="Description" optional error={errors.description} hint={`${values.description.length}/${L.descriptionMax}`}>
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={values.description}
              maxLength={L.descriptionMax}
              aria-invalid={!!errors.description}
              aria-describedby="description-hint"
              onChange={(e) => set("description", e.target.value)}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-3">
            <FormField id="genre" label="Genre" error={errors.genre}>
              <NativeSelect id="genre" name="genre" value={values.genre} aria-invalid={!!errors.genre} onChange={(e) => set("genre", e.target.value)} required>
                <option value="" disabled>
                  Choose…
                </option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {genreLabel(g)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField id="bpm" label="BPM" optional error={errors.bpm}>
              <Input
                id="bpm"
                name="bpm"
                className="h-10"
                inputMode="numeric"
                placeholder={`${L.bpmMin}–${L.bpmMax}`}
                value={values.bpm}
                maxLength={3}
                aria-invalid={!!errors.bpm}
                onChange={(e) => set("bpm", e.target.value)}
              />
            </FormField>

            <FormField id="musicalKey" label="Key" optional error={errors.musicalKey}>
              <NativeSelect id="musicalKey" name="musicalKey" value={values.musicalKey} aria-invalid={!!errors.musicalKey} onChange={(e) => set("musicalKey", e.target.value)}>
                <option value="">No key</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {keyLabel(k)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="price"
              label="Base rate"
              error={errors.price}
              hint={`${formatCents(L.priceMinCents)}–${formatCents(L.priceMaxCents)} · only you see this. How rates work for advertisers is decided before licensing opens.`}
            >
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  name="price"
                  className="h-10 pl-6"
                  inputMode="decimal"
                  value={values.price}
                  maxLength={10}
                  aria-invalid={!!errors.price}
                  aria-describedby="price-hint"
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>
            </FormField>
          </div>
        </fieldset>

        {errors.form && (
          <p role="alert" className="text-sm text-destructive">
            {errors.form}
          </p>
        )}

        {locks.readOnly ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockIcon className="size-4" aria-hidden="true" /> Archived releases can&apos;t be edited.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || (mode === "edit" && !dirty)} className="h-10 px-5 font-semibold">
              {mode === "create" ? (pending ? "Creating…" : "Create draft") : pending ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <p role="status" className="flex items-center gap-1.5 text-sm text-brand-text">
                <CheckCircle2Icon className="size-4" aria-hidden="true" /> Saved.
              </p>
            )}
            {mode === "create" && <p className="text-xs text-muted-foreground">Next: upload the audio, then publish.</p>}
          </div>
        )}
      </form>

      <ReleasePreview
        values={preview}
        artistName={artistName}
        coverSeed={coverSeed}
        durationMs={durationMs}
        note={mode === "create" ? "Your cover art is generated from the release when you save it." : undefined}
      />
    </div>
  );
}

function LockedNote({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <LockIcon className="size-3" aria-hidden="true" /> {children}
    </span>
  );
}
