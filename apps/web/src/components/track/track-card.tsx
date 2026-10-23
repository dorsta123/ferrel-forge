import type { Genre, MusicalKey } from "@ferrel/db/constants";
import { cn } from "cn";
import { genreLabel, keyShort } from "@/features/releases/labels";
import { formatDuration } from "@/lib/format-duration";
import { TrackCover } from "./track-cover";

export type TrackCardData = {
  coverSeed: string;
  title: string;
  artistName: string;
  genre: Genre | null;
  bpm: number | null;
  musicalKey: MusicalKey | null;
  /** Null until phase 4 reads it from the audio. */
  durationMs: number | null;
};

/**
 * A release as advertisers see it. No price: rates aren't public until pricing
 * is decided (decision 021). Values may be null while a creator is still typing (preview).
 */
export function TrackCard({ data, className }: { data: TrackCardData; className?: string }) {
  const { title, artistName, genre, bpm, musicalKey, durationMs } = data;
  const details = [genre && genreLabel(genre), bpm && `${bpm} BPM`, musicalKey && keyShort(musicalKey), durationMs && formatDuration(durationMs)].filter(Boolean);

  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card", className)} data-testid="track-card">
      <TrackCover seed={data.coverSeed} title={title} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold">{title || "Untitled release"}</h3>
          <p className="truncate text-sm text-muted-foreground">{artistName}</p>
        </div>
        {details.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 text-xs text-muted-foreground" aria-label="Details">
            {details.map((d) => (
              <li key={d as string} className="rounded-full bg-secondary px-2 py-0.5">
                {d}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto border-t pt-3 text-xs text-muted-foreground" data-testid="card-status">
          Licensing opens soon
        </p>
      </div>
    </article>
  );
}
