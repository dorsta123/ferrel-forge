import Link from "next/link";
import { TrackCard } from "@/components/track/track-card";
import type { PublicTrackCard } from "./queries";
import { trackHref } from "./track-href";

/** Responsive grid of release cards; each card opens its release page. */
export function ReleaseGrid({ releases, label }: { releases: PublicTrackCard[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {releases.map((r) => (
        <li key={r.id} className="min-w-0">
          <Link
            href={trackHref(r)}
            className="block rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            data-testid="release-card"
          >
            <TrackCard
              className="h-full transition-shadow hover:shadow-lg hover:shadow-ember/10"
              data={{
                coverSeed: r.id,
                title: r.title,
                artistName: r.artistName,
                genre: r.genre,
                bpm: r.bpm,
                musicalKey: r.musicalKey,
                durationMs: r.durationMs,
              }}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
