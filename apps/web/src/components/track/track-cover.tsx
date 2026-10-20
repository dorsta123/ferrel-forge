import { cn } from "cn";
import { initials } from "@/lib/initials";
import { COVER_BARS, coverArt } from "./cover-art";

type Props = { seed: string; title: string; className?: string };

/** Square generated cover. Decorative: the title is always shown next to it. */
export function TrackCover({ seed, title, className }: Props) {
  const art = coverArt(seed);
  const gradient = `cover-${art.id}`;
  const slot = 100 / COVER_BARS;

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("aspect-square w-full", className)}>
      <defs>
        <linearGradient id={gradient} gradientTransform={`rotate(${art.angle} 0.5 0.5)`}>
          <stop offset="0" stopColor={art.from} />
          <stop offset="1" stopColor={art.to} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradient})`} />
      {/* Darken the lower half so the waveform reads in both themes. */}
      <rect y="45" width="100" height="55" fill="#1c1206" opacity="0.35" />
      {art.bars.map((h, i) => {
        const height = h * 34;
        return (
          <rect
            key={i}
            x={i * slot + slot * 0.2}
            y={88 - height}
            width={slot * 0.6}
            height={height}
            rx={slot * 0.3}
            fill="#fff7ed"
            opacity={0.85}
          />
        );
      })}
      <text x="9" y="27" fill="#1c1206" fontSize="18" fontWeight="700" fontFamily="var(--font-display-face), sans-serif" opacity="0.85">
        {initials(title)}
      </text>
    </svg>
  );
}
