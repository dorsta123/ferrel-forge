import { cn } from "cn";

// An illustrative campaign (not real data, and labelled as an example):
// shows how exposure is measured and how earnings split between contributors.
// No prices: rates aren't decided yet (PRODUCT.md question 15).
export const EXAMPLE = {
  views: 120_000,
  avgSecondsWatched: 9,
  contributors: [
    { role: "Producer", shareBps: 5_000 },
    { role: "Vocalist", shareBps: 3_000 },
    { role: "Writer", shareBps: 2_000 },
  ],
} as const;

export const exampleExposureSeconds = EXAMPLE.views * EXAMPLE.avgSecondsWatched;

const n = (value: number) => value.toLocaleString("en-US");

/** The example campaign as a card: views × seconds watched = exposure, then the split. */
export function ExposureExample({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="exposure-example">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Example ad campaign</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">example</span>
      </div>

      <dl className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Views</dt>
          <dd className="text-2xl font-semibold tabular-nums">{n(EXAMPLE.views)}</dd>
        </div>
        <span aria-hidden="true" className="pb-1 text-muted-foreground">
          ×
        </span>
        <div className="text-right">
          <dt className="text-muted-foreground">Avg. seconds watched</dt>
          <dd className="text-2xl font-semibold tabular-nums">{EXAMPLE.avgSecondsWatched}</dd>
        </div>
      </dl>

      <div className="rounded-xl border bg-background/40 p-4">
        <p className="text-sm text-muted-foreground">Exposure billed for the month</p>
        <p className="font-display text-3xl font-bold tracking-tight tabular-nums text-brand-text">
          {n(exampleExposureSeconds)} <span className="text-base font-medium text-muted-foreground">exposure-seconds</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Paid automatically to everyone who made the track</p>
        <ul className="flex flex-col gap-2" aria-label="Contributor shares">
          {EXAMPLE.contributors.map(({ role, shareBps }) => (
            <li key={role} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0">{role}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <span className="block h-full rounded-full bg-linear-to-r from-ember to-brand" style={{ width: `${shareBps / 100}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right font-mono tabular-nums">{shareBps / 100}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
