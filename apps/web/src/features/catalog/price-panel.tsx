import { ArchiveIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowView } from "../creator-tracks/row-view";
import { formatCents } from "../releases/money";
import type { PublicTrack } from "./queries";

/** Price, remaining copies and the (not yet active) buy button on a release page. */
export function PricePanel({ track }: { track: PublicTrack }) {
  if (track.status === "archived") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-5" data-testid="price-panel">
        <ArchiveIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">No longer for sale</p>
          <p className="text-sm text-muted-foreground">The creator archived this release. Existing licenses stay valid.</p>
        </div>
      </div>
    );
  }

  const view = rowView({ ...track, hasAudio: true });
  const soldOut = view.remaining === 0;
  const percentLeft = (view.remaining / track.totalSupply) * 100;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5" data-testid="price-panel">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{soldOut ? "Status" : "Current price"}</p>
          <p className="text-4xl font-bold tracking-tight tabular-nums">{view.priceLabel}</p>
        </div>
        <p className="text-right text-sm text-muted-foreground tabular-nums">{view.supplyLabel}</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label="Copies left"
        aria-valuemin={0}
        aria-valuemax={track.totalSupply}
        aria-valuenow={view.remaining}
      >
        <div className="h-full rounded-full bg-linear-to-r from-ember to-brand" style={{ width: `${percentLeft}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Started at {formatCents(track.basePriceCents)}. Each sale raises the price of the next copy.
      </p>
      <Button disabled className="h-11 gap-2 text-base font-semibold">
        <LockIcon aria-hidden="true" />
        {soldOut ? "Sold out" : "Buying opens soon"}
      </Button>
      {!soldOut && <p className="text-center text-xs text-muted-foreground">Checkout arrives in a later phase, in Stripe test mode.</p>}
    </div>
  );
}
