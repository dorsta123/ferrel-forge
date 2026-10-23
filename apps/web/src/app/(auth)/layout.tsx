import { Waveform } from "@/components/brand/waveform";
import { EXAMPLE, exampleExposureSeconds } from "@/components/home/exposure-example";

const n = (value: number) => value.toLocaleString("en-US");

// Split screen for /sign-in and /sign-up: form left, ember artwork right.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      {/* Compact art strip on small screens */}
      <div className="grain ember-glow flex items-end overflow-hidden border-b px-6 pt-8 lg:hidden">
        <Waveform className="h-16 w-full opacity-80" />
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <aside className="grain ember-glow relative hidden flex-col justify-between overflow-hidden border-l p-12 lg:flex">
        <p className="font-mono text-xs text-muted-foreground">ferrel-forge / music for ads</p>
        <div className="flex flex-col gap-8">
          <Waveform className="h-48" />
          <blockquote className="max-w-md font-display text-3xl leading-tight font-semibold text-balance">
            Paid for every second your music is <span className="text-molten">heard</span>.
          </blockquote>
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-muted-foreground">Example views</dt>
              <dd className="font-mono text-lg font-medium">{n(EXAMPLE.views)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Exposure-seconds</dt>
              <dd className="font-mono text-lg font-medium text-brand-text">{n(exampleExposureSeconds)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </main>
  );
}
