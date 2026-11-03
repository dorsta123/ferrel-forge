"use client";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format-duration";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import { latestStartMs } from "./rules";
import { usePreviewSettings } from "./use-preview-settings";

type Props = {
  trackId: string;
  /** Known once the song is measured; the picker needs both. */
  durationMs: number | null;
  waveform: number[] | null;
  startMs: number;
  enabled: boolean;
  /** Archived releases are read-only. */
  editable: boolean;
};

/** The Preview section: on/off, and (once measured) the 15 s window on the waveform. */
export function PreviewSettings({ trackId, durationMs, waveform, startMs: initialStart, enabled: initialEnabled, editable }: Props) {
  const s = usePreviewSettings(trackId, { startMs: initialStart, enabled: initialEnabled });
  const measured = durationMs !== null && waveform !== null && waveform.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {s.enabled ? "A 15-second preview with a soft watermark tone, so advertisers can hear the mood." : "Off: public pages show no preview."}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={s.enabled}
          aria-label="Preview"
          disabled={!editable || s.pending}
          onClick={s.toggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
            s.enabled ? "bg-brand" : "bg-secondary",
          )}
        >
          <span className={cn("inline-block size-4 rounded-full bg-background shadow transition-transform", s.enabled ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>

      {s.enabled && measured && (
        <StartPicker durationMs={durationMs} waveform={waveform} startMs={s.startMs} onMove={s.move} disabled={!editable || s.pending} />
      )}
      {s.enabled && !measured && <p className="text-sm text-muted-foreground">You can choose where it starts once your track is measured.</p>}

      {s.enabled && measured && editable && (
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={!s.unsaved || s.pending} onClick={s.save}>
            Save start point
          </Button>
          {s.message && <p className="text-sm text-muted-foreground">{s.message}</p>}
        </div>
      )}
      {s.error && (
        <p role="alert" className="text-sm text-destructive">
          {s.error}
        </p>
      )}
    </div>
  );
}

type PickerProps = { durationMs: number; waveform: number[]; startMs: number; onMove: (ms: number) => void; disabled: boolean };

/** The waveform with the preview's 15 s highlighted, moved by a standard slider (drag or arrow keys). */
function StartPicker({ durationMs, waveform, startMs, onMove, disabled }: PickerProps) {
  const lengthMs = Math.min(TRACK_LIMITS.previewMs, durationMs);
  const from = (startMs / durationMs) * waveform.length;
  const to = ((startMs + lengthMs) / durationMs) * waveform.length;
  const label = `Starts at ${formatDuration(startMs)} of ${formatDuration(durationMs)}`;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${waveform.length} 40`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
        <rect x={from} width={to - from} height={40} className="fill-brand/15" />
        {waveform.map((v, i) => {
          const h = Math.max(1, (v / TRACK_LIMITS.waveformMax) * 38);
          return <rect key={i} x={i + 0.15} y={20 - h / 2} width={0.7} height={h} className={i >= from && i < to ? "fill-brand" : "fill-muted-foreground/40"} />;
        })}
      </svg>
      <input
        type="range"
        aria-label="Preview start"
        aria-valuetext={label}
        min={0}
        max={latestStartMs(durationMs)}
        step={100}
        value={startMs}
        disabled={disabled}
        onChange={(e) => onMove(Number(e.target.value))}
        className="w-full accent-brand"
      />
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
