import { TrackCard } from "@/components/track/track-card";
import type { ReleasePreview as PreviewValues } from "./preview-values";

type Props = { values: PreviewValues; artistName: string; coverSeed: string; copiesSold: number; note?: string };

/** The marketplace card, updated as the creator types. */
export function ReleasePreview({ values, artistName, coverSeed, copiesSold, note }: Props) {
  return (
    <aside aria-label="Card preview" className="flex flex-col gap-3 lg:sticky lg:top-20">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</p>
      <TrackCard data={{ ...values, coverSeed, artistName, copiesSold }} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </aside>
  );
}
