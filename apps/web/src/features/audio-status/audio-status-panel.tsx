"use client";

import { useRef } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { AudioStatusSnapshot } from "./types";
import { useAudioStatus } from "./use-audio-status";

type Props = {
  trackId: string;
  initial: AudioStatusSnapshot;
  /** The release is published or archived: a failed file hides it from public pages (decision 029). */
  released: boolean;
};

/**
 * The editor's live audio status: Processing → Ready (length, preview) or Failed (reason),
 * with Try again when a retry can help. Place it inside an `aria-live` region that isn't
 * remounted with it, so screen readers announce the first status too.
 */
export function AudioStatusPanel({ trackId, initial, released }: Props) {
  const { view, error, gaveUp, retrying, retry } = useAudioStatus(trackId, initial);
  const panel = useRef<HTMLDivElement>(null);
  if (view.state === "none") return null;

  function tryAgain() {
    retry();
    panel.current?.focus(); // the button disappears; keep keyboard focus on the status
  }

  const Icon = view.state === "processing" ? LoaderCircleIcon : view.state === "ready" ? CheckCircle2Icon : AlertTriangleIcon;
  return (
    <div
      ref={panel}
      tabIndex={-1}
      data-testid="audio-status"
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm outline-none sm:flex-row sm:items-center",
        view.state === "failed" ? "border-destructive/40 bg-destructive/5" : "bg-secondary/40",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0",
          view.state === "processing" && !gaveUp && "animate-spin text-muted-foreground motion-reduce:animate-none",
          view.state === "processing" && gaveUp && "text-muted-foreground",
          view.state === "ready" && "text-brand-text",
          view.state === "failed" && "text-destructive",
        )}
      />
      <div className="flex-1">
        <p className="font-medium">
          {view.title}
          {view.state === "ready" && view.detail && <span className="font-mono font-normal text-muted-foreground"> · {view.detail}</span>}
        </p>
        {view.state !== "ready" && view.detail && <p className="text-muted-foreground">{view.detail}</p>}
        {view.preview && <p className="text-muted-foreground">{view.preview}</p>}
        {view.state === "failed" && released && (
          <p className="text-muted-foreground">Hidden from public pages until fixed. Unpublish to upload a new file.</p>
        )}
        {gaveUp && !view.settled && <p className="text-muted-foreground">Still working on it. Reload the page to check again.</p>}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
      {view.canRetry && (
        <Button variant="outline" size="sm" disabled={retrying} onClick={tryAgain}>
          <RotateCcwIcon aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}
