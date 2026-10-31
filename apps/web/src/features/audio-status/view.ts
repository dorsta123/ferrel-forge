// What the editor shows for a snapshot (pure: shared by server and browser).
import { formatDuration } from "@/lib/format-duration";
import type { AudioStatusSnapshot } from "./types";

export type AudioStatusView = {
  state: "none" | "processing" | "ready" | "failed";
  title: string;
  /** The length when ready, the reason when failed. */
  detail: string | null;
  /** The preview's state, once the song is ready. */
  preview: string | null;
  canRetry: boolean;
  /** Nothing more will change by itself, so the page can stop checking. */
  settled: boolean;
};

export function audioStatusView(s: AudioStatusSnapshot): AudioStatusView {
  switch (s.status) {
    case "none":
      return { state: "none", title: "No audio yet", detail: null, preview: null, canRetry: false, settled: true };
    case "processing":
      return { state: "processing", title: "Processing", detail: "Measuring your track…", preview: null, canRetry: false, settled: false };
    case "failed":
      return { state: "failed", title: "Failed", detail: s.error, preview: null, canRetry: true, settled: true };
    case "ready": {
      const ready = { state: "ready" as const, title: "Ready", detail: s.durationMs === null ? null : formatDuration(s.durationMs) };
      if (!s.previewEnabled) return { ...ready, preview: "Preview off", canRetry: false, settled: true };
      if (s.hasPreview) return { ...ready, preview: "Preview ready", canRetry: false, settled: true };
      if (s.previewFailed) return { ...ready, preview: "The preview couldn't be made.", canRetry: true, settled: true };
      return { ...ready, preview: "Making the preview…", canRetry: false, settled: false };
    }
  }
}
