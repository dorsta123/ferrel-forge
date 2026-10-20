"use client";

import { useState, useTransition } from "react";
import { changeReleaseStatus } from "./actions";
import type { ReleaseAction } from "./status";

/** Runs a status change; final actions (archive, delete) need a second confirming click. */
export function useReleaseActions(trackId: string) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ReleaseAction | null>(null);

  function run(action: ReleaseAction) {
    setError(null);
    startTransition(async () => {
      // On success the action revalidates this page (or redirects, for delete).
      const result = await changeReleaseStatus(trackId, action);
      if (result && !result.ok) setError(result.error); // no result when it redirected
      setConfirming(null);
    });
  }

  return { pending, error, confirming, setConfirming, run };
}
