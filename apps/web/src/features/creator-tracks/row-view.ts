// What one dashboard row shows, worked out from the stored track. Pure.
import type { TrackStatus } from "@ferrel/db/constants";
import { formatDuration } from "@/lib/format-duration";
import { formatCents } from "../releases/money";

export type RowFacts = {
  status: TrackStatus;
  basePriceCents: number;
  hasAudio: boolean;
  durationMs: number | null;
};

export type RowView = {
  /** The artist's own placeholder rate: shown only to them, on the dashboard. */
  rateLabel: string;
  /** "3:42", or null until phase 4 reads the length from the audio. */
  lengthLabel: string | null;
  /** A draft that can't be published yet. */
  needsAudio: boolean;
};

export function rowView(t: RowFacts): RowView {
  return {
    rateLabel: formatCents(t.basePriceCents),
    lengthLabel: t.durationMs === null ? null : formatDuration(t.durationMs),
    needsAudio: t.status === "draft" && !t.hasAudio,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m ago", "3h ago", "2d ago", then a date ("Oct 3" or "Oct 3, 2025"). */
export function editedAgo(date: Date, now: Date): string {
  const ms = now.getTime() - date.getTime();
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ago`;
  if (ms < 7 * DAY) return `${Math.floor(ms / DAY)}d ago`;
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}
