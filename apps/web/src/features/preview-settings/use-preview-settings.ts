"use client";

import { useState, useTransition } from "react";
import { setPreviewEnabled, setPreviewStart } from "./actions";

type Initial = { startMs: number; enabled: boolean };

/** The picker's state: the start being chosen, Save, and the on/off switch. */
export function usePreviewSettings(trackId: string, initial: Initial) {
  const [startMs, setStartMs] = useState(initial.startMs);
  const [savedStartMs, setSavedStartMs] = useState(initial.startMs);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(next: number) {
    setStartMs(next);
    setMessage(null);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setPreviewStart(trackId, startMs);
      if (result.ok) {
        setSavedStartMs(startMs);
        setMessage("Saved. The new preview is being made.");
      } else setError(result.error);
    });
  }

  function toggle() {
    const next = !enabled;
    setEnabled(next); // show the change at once; undone if the server refuses
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await setPreviewEnabled(trackId, next);
      if (!result.ok) {
        setEnabled(!next);
        setError(result.error);
      }
    });
  }

  return { startMs, unsaved: startMs !== savedStartMs, enabled, message, error, pending, move, save, toggle };
}
