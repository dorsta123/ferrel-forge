"use client";

import { useState } from "react";
import { CheckCircle2Icon, FileAudioIcon, LoaderCircleIcon, UploadIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format-bytes";
import { AUDIO_ACCEPT, AUDIO_HINT } from "./rules";
import type { CurrentAudio } from "./types";
import { useAudioUpload } from "./use-audio-upload";

type Props = { trackId: string; current: CurrentAudio; editable: boolean };

export function AudioUploadField({ trackId, current, editable }: Props) {
  const { state, start, cancel } = useAudioUpload(trackId);
  const [dragging, setDragging] = useState(false);
  const busy = state.phase === "preparing" || state.phase === "uploading" || state.phase === "verifying";

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file && !busy) void start(file);
  }

  return (
    <div className="flex flex-col gap-3">
      {current && (
        <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 px-4 py-3 text-sm">
          <FileAudioIcon className="size-5 text-brand-text" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">Master file attached</p>
            <p className="font-mono text-xs text-muted-foreground" data-testid="current-audio">
              {current.format.toUpperCase()} · {formatBytes(current.sizeBytes)}
            </p>
          </div>
        </div>
      )}

      {editable ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors hover:border-brand/60 hover:bg-brand/5",
            dragging && "border-brand bg-brand/10",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <UploadIcon className="size-6 text-brand-text" aria-hidden="true" />
          <span className="text-sm font-medium">{current ? "Replace audio file" : "Choose an audio file"}</span>
          <span className="text-xs text-muted-foreground">or drag it here · {AUDIO_HINT}</span>
          <input
            type="file"
            accept={AUDIO_ACCEPT}
            className="sr-only"
            disabled={busy}
            aria-label={current ? "Replace audio file" : "Choose an audio file"}
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = ""; // allow picking the same file again
            }}
          />
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">Audio can only be changed while the track is a draft.</p>
      )}

      <UploadStatus state={state} onCancel={cancel} />
    </div>
  );
}

function UploadStatus({ state, onCancel }: { state: ReturnType<typeof useAudioUpload>["state"]; onCancel: () => void }) {
  if (state.phase === "idle") return null;
  if (state.phase === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.message}
      </p>
    );
  }
  if (state.phase === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-brand-text">
        <CheckCircle2Icon className="size-4" aria-hidden="true" /> {state.fileName} uploaded and verified.
      </p>
    );
  }

  const percent = state.phase === "uploading" ? Math.round(state.progress * 100) : state.phase === "verifying" ? 100 : 0;
  const label = state.phase === "preparing" ? "Preparing…" : state.phase === "verifying" ? "Checking the file…" : `Uploading… ${percent}%`;
  return (
    <div role="status" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-brand-text" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        {state.phase === "uploading" && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-linear-to-r from-ember to-brand transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
