// What one dashboard row shows, worked out from the stored track. Pure.
import { quotePrice } from "@ferrel/pricing";
import type { TrackStatus } from "@ferrel/db/constants";
import { formatCents } from "../releases/money";

export type RowFacts = {
  status: TrackStatus;
  totalSupply: number;
  copiesSold: number;
  basePriceCents: number;
  hasAudio: boolean;
};

export type RowView = {
  remaining: number;
  /** "48 of 50 left" */
  supplyLabel: string;
  /** Current price from the pricing engine, or "Sold out". */
  priceLabel: string;
  /** A draft that can't be published yet. */
  needsAudio: boolean;
};

export function rowView(t: RowFacts): RowView {
  const remaining = Math.max(0, t.totalSupply - t.copiesSold);
  return {
    remaining,
    supplyLabel: `${remaining.toLocaleString("en-US")} of ${t.totalSupply.toLocaleString("en-US")} left`,
    priceLabel:
      remaining === 0
        ? "Sold out"
        : formatCents(quotePrice({ basePriceCents: t.basePriceCents, totalSupply: t.totalSupply, remainingSupply: remaining })),
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
