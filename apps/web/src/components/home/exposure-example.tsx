import { cn } from "cn";
import { formatCount } from "@/lib/format-number";
import { EXAMPLE, exampleExposureSeconds } from "./example-campaign";

/** The example campaign as a card: views × seconds watched = exposure, then the split. */
export function ExposureExample({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="exposure-example">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Example ad campaign</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">example</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 text-sm">
        <dl>
          <dt className="text-muted-foreground">Views</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatCount(EXAMPLE.views)}</dd>
        </dl>
        <span aria-hidden="true" className="pb-1 text-muted-foreground">
          ×
        </span>
        <dl className="text-right">
          <dt className="text-muted-foreground">Avg. seconds watched</dt>
          <dd className="text-2xl font-semibold tabular-nums">{EXAMPLE.avgSecondsWatched}</dd>
        </dl>
      </div>

      <div className="rounded-xl border bg-background/40 p-4">
        <p className="text-sm text-muted-foreground">Exposure that would be billed for the month</p>
        <p className="font-display text-3xl font-bold tracking-tight tabular-nums text-brand-text">
          {formatCount(exampleExposureSeconds)} <span className="text-base font-medium text-muted-foreground">exposure-seconds</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Split automatically between everyone who made the track</p>
        <ul className="flex flex-col gap-2" aria-label="Contributor shares">
          {EXAMPLE.contributors.map(({ role, shareBps }) => (
            <li key={role} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0">{role}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <span className="block h-full rounded-full bg-linear-to-r from-ember to-brand" style={{ width: `${shareBps / 100}%` }} />
              </span>
              <span className="w-12 shrink-0 text-right font-mono tabular-nums">{shareBps / 100}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
