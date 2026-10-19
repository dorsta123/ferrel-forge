import { cn } from "cn";

// Fixed, hand-shaped heights (0-1): deterministic so server and client render
// the same markup, and no Math.random() during prerender.
const SHAPE = [
  0.3, 0.45, 0.6, 0.4, 0.75, 0.9, 0.65, 0.5, 0.8, 1, 0.85, 0.6, 0.7, 0.95, 0.75, 0.5, 0.65, 0.85, 0.55,
  0.4, 0.6, 0.8, 0.5, 0.35, 0.55, 0.7, 0.45, 0.3,
];

/** Decorative animated equalizer. Hidden from screen readers. */
export function Waveform({ bars = SHAPE.length, className }: { bars?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex h-32 items-end gap-[3px]", className)}>
      {Array.from({ length: bars }, (_, i) => {
        const h = SHAPE[i % SHAPE.length];
        return (
          <span
            key={i}
            className="w-full origin-bottom animate-eq rounded-full bg-linear-to-t from-ember to-brand"
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${(i * 97) % 1600}ms`,
              opacity: 0.55 + h * 0.45,
            }}
          />
        );
      })}
    </div>
  );
}
