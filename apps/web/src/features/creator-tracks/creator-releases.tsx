import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NoReleases, NoneInFilter } from "./empty-state";
import type { TrackFilter } from "./filters";
import { TRACK_LIST_LIMIT, listCreatorTracks, type CreatorTrackStats } from "./queries";
import { StatusTabs } from "./status-tabs";
import { TrackRow } from "./track-row";

type Props = { creatorId: string; filter: TrackFilter; stats: CreatorTrackStats };

/** "Your releases" panel: header, filter tabs, and the list (or an empty state). Server component. */
export async function CreatorReleases({ creatorId, filter, stats }: Props) {
  const rows = stats.all === 0 ? [] : await listCreatorTracks(creatorId, filter);
  const now = new Date();

  return (
    <section aria-labelledby="releases-heading" className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="releases-heading" className="font-display text-xl font-semibold">
          Your releases
        </h2>
        {stats.all > 0 && (
          <Link href="/dashboard/tracks/new" className={buttonVariants({ className: "h-9 gap-1.5 px-4 font-semibold" })}>
            <PlusIcon aria-hidden="true" />
            New release
          </Link>
        )}
      </div>

      {stats.all === 0 ? (
        <NoReleases />
      ) : (
        <>
          <StatusTabs active={filter} stats={stats} />
          {rows.length === 0 && filter !== "all" ? (
            <NoneInFilter filter={filter} />
          ) : (
            <ul className="-mx-2 flex flex-col divide-y sm:-mx-3" aria-label={`${rows.length} releases`}>
              {rows.map((track) => (
                <TrackRow key={track.id} track={track} now={now} />
              ))}
            </ul>
          )}
          {rows.length === TRACK_LIST_LIMIT && (
            <p className="text-xs text-muted-foreground">Showing the {TRACK_LIST_LIMIT} most recently edited releases.</p>
          )}
        </>
      )}
    </section>
  );
}
