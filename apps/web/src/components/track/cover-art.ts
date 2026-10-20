// Generated cover art (decision 008): every visual choice comes from a seed
// (the track id), so the same track always gets the same cover. Pure and
// deterministic — no Math.random(), safe in prerendered components.

const PALETTES = [
  ["#ff5a1f", "#f5a524"], // ember
  ["#c2410c", "#fbbf24"], // molten
  ["#7c2d12", "#f97316"], // dusk
  ["#b45309", "#fde68a"], // glow
  ["#991b1b", "#fb923c"], // crimson
] as const;

export const COVER_BARS = 24;

export type CoverArt = {
  /** Short stable id for SVG gradient ids. */
  id: string;
  from: string;
  to: string;
  /** Gradient direction in degrees. */
  angle: number;
  /** Waveform bar heights, 0.15–1. */
  bars: number[];
};

export function coverArt(seed: string): CoverArt {
  const hash = fnv1a(seed);
  const next = mulberry32(hash);
  const [from, to] = PALETTES[hash % PALETTES.length];
  const angle = Math.floor(next() * 360);

  // A smooth random walk reads as a waveform rather than noise.
  const bars: number[] = [];
  let level = 0.4 + next() * 0.4;
  for (let i = 0; i < COVER_BARS; i++) {
    level = Math.min(1, Math.max(0.15, level + (next() - 0.5) * 0.45));
    bars.push(Math.round(level * 100) / 100);
  }
  return { id: hash.toString(36), from, to, angle, bars };
}

/** FNV-1a 32-bit string hash. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded PRNG: same seed, same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
