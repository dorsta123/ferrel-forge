import { useId } from "react";
import { cn } from "cn";

/** Ember tile with a rising sound wave: the forge's flame is the music. */
export function LogoMark({ className }: { className?: string }) {
  const gradientId = useId(); // unique per instance (header + footer both render one)
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--ember)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <g fill="#1c1206">
        <rect x="6.5" y="15" width="3" height="8" rx="1.5" />
        <rect x="11.5" y="11" width="3" height="12" rx="1.5" />
        <rect x="16.5" y="7" width="3" height="16" rx="1.5" />
        <rect x="21.5" y="12" width="3" height="11" rx="1.5" />
      </g>
      {/* anvil base */}
      <rect x="5" y="24.5" width="22" height="2.5" rx="1.25" fill="#1c1206" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight whitespace-nowrap">ferrel-forge</span>
    </span>
  );
}
