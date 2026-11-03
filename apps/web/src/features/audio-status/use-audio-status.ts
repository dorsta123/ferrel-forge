"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getAudioStatus, retryAudio } from "./actions";
import type { AudioStatusSnapshot } from "./types";
import { audioStatusView } from "./view";

const EVERY_MS = 3_000;
const GIVE_UP_AFTER_MS = 10 * 60_000; // a forgotten tab stops asking

/**
 * The track's audio status, kept up to date while something is still in progress:
 * one check at a time, 3 s apart, until everything is settled or 10 minutes pass.
 */
export function useAudioStatus(trackId: string, initial: AudioStatusSnapshot) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [retrying, startRetry] = useTransition();
  const view = audioStatusView(snapshot);

  useEffect(() => {
    if (view.settled) return;
    const started = Date.now();
    let lastStatus = snapshot.status;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;

    // The next check is scheduled only after this one finishes, so slow answers never pile up
    // (Server Actions run one at a time, so a backlog would also delay the artist's own saves).
    const check = async () => {
      if (Date.now() - started > GIVE_UP_AFTER_MS) return setGaveUp(true);
      try {
        const next = await getAudioStatus(trackId);
        if (!active) return;
        if (!next) return; // signed out or no longer the owner: stop asking
        setSnapshot(next);
        // The publish button depends on the status, so refresh the page around it.
        if (next.status !== lastStatus) router.refresh();
        lastStatus = next.status;
      } catch {
        if (!active) return; // a network blip or a restarting server: just try again later
      }
      timer = setTimeout(check, EVERY_MS);
    };
    timer = setTimeout(check, EVERY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // Restart only when settling changes; `snapshot.status` just seeds `lastStatus`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, view.settled, router]);

  function retry() {
    setError(null);
    setGaveUp(false);
    startRetry(async () => {
      const result = await retryAudio(trackId);
      if (result.ok) setSnapshot(result.snapshot);
      else setError(result.error);
    });
  }

  return { view, error, gaveUp, retrying, retry };
}
