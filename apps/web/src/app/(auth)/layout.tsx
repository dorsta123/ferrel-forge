import { quotePrice } from "@ferrel/pricing";
import { Waveform } from "@/components/brand/waveform";

const first = quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 100 });
const half = quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 50 });

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
        <p className="font-mono text-xs text-muted-foreground">ferrel-forge / limited runs</p>
        <div className="flex flex-col gap-8">
          <Waveform className="h-48" />
          <blockquote className="max-w-md font-display text-3xl leading-tight font-semibold text-balance">
            Every sale makes the next copy <span className="text-molten">rarer</span>.
          </blockquote>
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-muted-foreground">Copy #1</dt>
              <dd className="font-mono text-lg font-medium">${(first / 100).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Copy #51</dt>
              <dd className="font-mono text-lg font-medium text-brand-text">${(half / 100).toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </main>
  );
}
