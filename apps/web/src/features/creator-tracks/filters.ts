// The dashboard's status filter, read from ?status= in the address. Pure:
// anything unexpected falls back to "all", so a crafted URL can't reach the query.
import { TRACK_STATUSES } from "@ferrel/db/constants";

export const TRACK_FILTERS = ["all", ...TRACK_STATUSES] as const;
export type TrackFilter = (typeof TRACK_FILTERS)[number];

export const FILTER_LABELS: Record<TrackFilter, string> = {
  all: "All",
  draft: "Drafts",
  published: "Published",
  archived: "Archived",
};

export function parseTrackFilter(value: string | string[] | undefined): TrackFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return (TRACK_FILTERS as readonly string[]).includes(v ?? "") ? (v as TrackFilter) : "all";
}

export function filterHref(filter: TrackFilter): string {
  return filter === "all" ? "/dashboard" : `/dashboard?status=${filter}`;
}
