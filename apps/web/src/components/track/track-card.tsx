import { quotePrice } from "@ferrel/pricing";
import type { Genre, MusicalKey } from "@ferrel/db/constants";
import { cn } from "cn";
import { genreLabel, keyShort } from "@/features/releases/labels";
import { formatCents } from "@/features/releases/money";
import { TrackCover } from "./track-cover";

export type TrackCardData = {
  coverSeed: string;
  title: string;
  artistName: string;
  genre: Genre | null;
  bpm: number | null;
  musicalKey: MusicalKey | null;
  basePriceCents: number | null;
  totalSupply: number | null;
  copiesSold: number;
};

/** A release as buyers see it. Values may be null while a creator is still typing (preview). */
export function TrackCard({ data, className }: { data: TrackCardData; className?: string }) {
  const { title, artistName, genre, bpm, musicalKey, basePriceCents, totalSupply, copiesSold } = data;
  const remaining = totalSupply === null ? null : Math.max(0, totalSupply - copiesSold);
  const price =
    basePriceCents === null || totalSupply === null || remaining === null
      ? null
      : remaining === 0
        ? "Sold out"
        : formatCents(quotePrice({ basePriceCents, totalSupply, remainingSupply: remaining }));
  const details = [genre && genreLabel(genre), bpm && `${bpm} BPM`, musicalKey && keyShort(musicalKey)].filter(Boolean);

  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card", className)} data-testid="track-card">
      <TrackCover seed={data.coverSeed} title={title} />
      <div className="flex flex-col gap-3 p-4">
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
        <div className="flex items-end justify-between gap-3 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Current price</p>
            <p className="text-xl font-semibold tracking-tight" data-testid="card-price">
              {price ?? "—"}
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground" data-testid="card-supply">
            {remaining === null || totalSupply === null ? "— copies" : `${remaining.toLocaleString("en-US")} of ${totalSupply.toLocaleString("en-US")} left`}
          </p>
        </div>
        {remaining !== null && totalSupply !== null && totalSupply > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <div className="h-full rounded-full bg-linear-to-r from-ember to-brand" style={{ width: `${(remaining / totalSupply) * 100}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}
