import Link from "next/link";
import { ChevronRightIcon, CircleAlertIcon } from "lucide-react";
import { TrackCover } from "@/components/track/track-cover";
import { genreLabel } from "../releases/labels";
import { StatusBadge } from "../releases/status-badge";
import type { CreatorTrackRow } from "./queries";
import { editedAgo, rowView } from "./row-view";

/** One release in the dashboard list; the whole row opens its edit page. */
export function TrackRow({ track, now }: { track: CreatorTrackRow; now: Date }) {
  const view = rowView(track);

  return (
    <li>
      <Link
        href={`/dashboard/tracks/${track.id}`}
        className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:gap-4 sm:p-3"
        data-testid="track-row"
      >
        <span className="size-14 shrink-0 overflow-hidden rounded-lg sm:size-16">
          <TrackCover seed={track.id} title={track.title} className="block" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Phones: badge under the title, so the title gets the full width. */}
          <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <p className="max-w-full truncate font-medium">{track.title}</p>
            <StatusBadge status={track.status} />
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{genreLabel(track.genre)}</span>
            <span aria-hidden="true">·</span>
            <span>edited {editedAgo(track.updatedAt, now)}</span>
            {view.needsAudio && (
              <span className="inline-flex items-center gap-1 text-brand-text">
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <CircleAlertIcon className="size-3" aria-hidden="true" /> Needs audio
              </span>
            )}
          </p>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="font-semibold tabular-nums">{view.rateLabel}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{view.lengthLabel ? `base rate · ${view.lengthLabel}` : "base rate"}</span>
        </div>
        {/* Phones: one compact line instead of the column. */}
        <span className="shrink-0 text-sm font-semibold tabular-nums sm:hidden">{view.rateLabel}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  );
}
