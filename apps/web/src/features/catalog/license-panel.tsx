import { ArchiveIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicTrack } from "./queries";

/**
 * The licensing box on a release page. No price yet: rates are decided before
 * licensing opens (decision 021). Archived releases say they can't be licensed.
 */
export function LicensePanel({ track }: { track: PublicTrack }) {
  if (track.status === "archived") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-5" data-testid="license-panel">
        <ArchiveIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">No longer for sale</p>
          <p className="text-sm text-muted-foreground">The creator archived this release. Existing licenses stay valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5" data-testid="license-panel">
      <div>
        <p className="font-display text-lg font-semibold">License this track for your ads</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Use it in Instagram, TikTok or YouTube ads and pay monthly for the exposure it gets: views × seconds watched.
        </p>
      </div>
      <Button disabled className="h-11 gap-2 text-base font-semibold">
        <LockIcon aria-hidden="true" />
        Licensing opens soon
      </Button>
      <p className="text-center text-xs text-muted-foreground">Payments will run in Stripe test mode. No real money moves.</p>
    </div>
  );
}
