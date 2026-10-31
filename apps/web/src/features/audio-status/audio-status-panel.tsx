"use client";

import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { AudioStatusSnapshot } from "./types";
import { useAudioStatus } from "./use-audio-status";

type Props = { trackId: string; initial: AudioStatusSnapshot };

/** The editor's live audio status: Processing → Ready (length, preview) or Failed (reason) · Try again. */
export function AudioStatusPanel({ trackId, initial }: Props) {
  const { view, error, retrying, retry } = useAudioStatus(trackId, initial);
  if (view.state === "none") return null;

  const Icon = view.state === "processing" ? LoaderCircleIcon : view.state === "ready" ? CheckCircle2Icon : AlertTriangleIcon;
  return (
    <div
      data-testid="audio-status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center",
        view.state === "failed" ? "border-destructive/40 bg-destructive/5" : "bg-secondary/40",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0",
          view.state === "processing" && "animate-spin text-muted-foreground motion-reduce:animate-none",
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
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
      {view.canRetry && (
        <Button variant="outline" size="sm" disabled={retrying} onClick={retry}>
          <RotateCcwIcon aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}
