"use client";

import { useMemo, useState } from "react";
import { previewFromForm } from "./preview-values";
import { trackSlugify } from "./slug";
import type { ReleaseLocks } from "./status";
import { RELEASE_FIELDS, type ReleaseErrors, type ReleaseField, type ReleaseFormState, type ReleaseFormValues } from "./types";

/**
 * Form state for creating or editing a release: controlled values, the URL
 * suggested from the title until the creator edits it, server errors hidden
 * once their field is edited, and live preview values.
 */
export function useReleaseForm(initial: ReleaseFormValues, locks: ReleaseLocks, state: ReleaseFormState) {
  const [values, setValues] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(initial.slug !== "");

  // After a save the server sends the stored (normalized) values: adopt them.
  // Compared by content, so an unrelated refresh (e.g. an audio upload) keeps unsaved typing.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if (!sameValues(initial, seenInitial)) setValues(initial);
  }

  // Show each new submit result's errors until the user edits that field.
  const [seenState, setSeenState] = useState(state);
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  if (state !== seenState) {
    setSeenState(state);
    setCleared(new Set());
  }

  const suggestSlug = !slugEdited && !locks.slug;

  function set(field: ReleaseField, value: string) {
    setValues((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "title" && suggestSlug && { slug: trackSlugify(value) }),
    }));
    if (field === "slug") setSlugEdited(true);
    setCleared((prev) => {
      const next = new Set(prev).add(field);
      if (field === "title" && suggestSlug) next.add("slug");
      return next;
    });
  }

  const errors = Object.fromEntries(Object.entries(state.errors).filter(([field]) => !cleared.has(field))) as ReleaseErrors;
  const preview = useMemo(() => previewFromForm(values), [values]);
  const dirty = !sameValues(values, initial);

  return { values, set, errors, preview, dirty };
}

function sameValues(a: ReleaseFormValues, b: ReleaseFormValues): boolean {
  return RELEASE_FIELDS.every((field) => a[field] === b[field]);
}
