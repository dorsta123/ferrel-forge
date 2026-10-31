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
 * it asks the server every 3 s until everything is settled (or 10 minutes pass).
 */
export function useAudioStatus(trackId: string, initial: AudioStatusSnapshot) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [retrying, startRetry] = useTransition();
  const view = audioStatusView(snapshot);

  useEffect(() => {
    if (view.settled) return;
    const started = Date.now();
    let active = true;
    let lastStatus = snapshot.status;
    const timer = setInterval(async () => {
      if (Date.now() - started > GIVE_UP_AFTER_MS) return clearInterval(timer);
      const next = await getAudioStatus(trackId);
      if (!active || !next) return;
      setSnapshot(next);
      // The publish button depends on the status, so refresh the page around it.
      if (next.status !== lastStatus) router.refresh();
      lastStatus = next.status;
    }, EVERY_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // Restart only when settling changes; `snapshot.status` just seeds `lastStatus`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, view.settled, router]);

  function retry() {
    setError(null);
    startRetry(async () => {
      const result = await retryAudio(trackId);
      if (result.ok) setSnapshot(result.snapshot);
      else setError(result.error);
    });
  }

  return { view, error, retrying, retry };
}
