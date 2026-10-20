import Link from "next/link";
import { DiscAlbumIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FILTER_LABELS, type TrackFilter } from "./filters";

/** No releases at all: invite the creator to make the first one. */
export function NoReleases() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-text">
        <DiscAlbumIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">No releases yet</p>
        <p className="max-w-sm text-sm text-pretty text-muted-foreground">
          Create a release, upload its audio, and publish it to start selling limited licenses.
        </p>
      </div>
      <Link href="/dashboard/tracks/new" className={buttonVariants({ className: "h-10 gap-2 px-5 font-semibold" })}>
        <PlusIcon aria-hidden="true" />
        Create your first release
      </Link>
    </div>
  );
}

/** Releases exist, but none match the selected filter. */
export function NoneInFilter({ filter }: { filter: Exclude<TrackFilter, "all"> }) {
  return (
    <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
      No {FILTER_LABELS[filter].toLowerCase()} releases.
    </p>
  );
}
