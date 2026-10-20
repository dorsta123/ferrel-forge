import Link from "next/link";
import { cn } from "cn";
import { FILTER_LABELS, TRACK_FILTERS, filterHref, type TrackFilter } from "./filters";
import type { CreatorTrackStats } from "./queries";

/** Filter links with counts. Plain links, so the filter lives in the URL and survives reloads. */
export function StatusTabs({ active, stats }: { active: TrackFilter; stats: CreatorTrackStats }) {
  return (
    <nav aria-label="Filter releases" className="flex flex-wrap gap-1.5">
      {TRACK_FILTERS.map((filter) => {
        const current = filter === active;
        return (
          <Link
            key={filter}
            href={filterHref(filter)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              current ? "border-brand/50 bg-brand/15 font-medium text-brand-text" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {FILTER_LABELS[filter]}
            <span className="text-xs tabular-nums opacity-80">{stats[filter]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
