"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { quotePrice } from "@ferrel/pricing";

// Demo inputs. Prices come from the real pricing engine (@ferrel/pricing).
const TOTAL = 100;
const BASE_CENTS = 1000;
const TABLE_ROWS = [0, 25, 50, 75, 99];

// SVG geometry. The viewBox width tracks the container's pixel width, so axis
// text stays a real 11px on phones instead of shrinking with the chart.
const DEFAULT_W = 640;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 34, left: 48 };
const PLOT_H = H - PAD.top - PAD.bottom;

const priceAt = (sold: number) => quotePrice({ basePriceCents: BASE_CENTS, totalSupply: TOTAL, remainingSupply: TOTAL - sold });
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function PriceCurve() {
  const sliderId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  const [sold, setSold] = useState(50);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const PLOT_W = W - PAD.left - PAD.right;

  const points = useMemo(() => Array.from({ length: TOTAL }, (_, s) => ({ sold: s, cents: priceAt(s) })), []);
  const minC = points[0].cents;
  const maxC = points[TOTAL - 1].cents;
  // Y axis on clean dollar ticks around the engine's range.
  const yMin = Math.floor(minC / 500) * 500;
  const yMax = Math.ceil(maxC / 500) * 500;
  const x = (s: number) => PAD.left + (s / (TOTAL - 1)) * PLOT_W;
  const y = (c: number) => PAD.top + (1 - (c - yMin) / (yMax - yMin)) * PLOT_H;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.sold).toFixed(1)},${y(p.cents).toFixed(1)}`).join("");
  const area = `${line}L${x(TOTAL - 1)},${PAD.top + PLOT_H}L${x(0)},${PAD.top + PLOT_H}Z`;
  const yTicks = Array.from({ length: (yMax - yMin) / 500 + 1 }, (_, i) => yMin + i * 500);
  const xTicks = W < 420 ? [0, 50, 99] : [0, 25, 50, 75, 99];

  const current = priceAt(sold);
  const shown = hover ?? sold;
  const shownCents = priceAt(shown);
  const pctOverBase = Math.round(((current - BASE_CENTS) / BASE_CENTS) * 100);

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((e.clientX - rect.left) / rect.width) * W; // to viewBox units
    const s = Math.round(((vx - PAD.left) / PLOT_W) * (TOTAL - 1));
    setHover(Math.min(TOTAL - 1, Math.max(0, s)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Price of the next copy</p>
          <p className="text-5xl font-semibold tracking-tight" aria-live="polite">
            {money(current)}
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Copies left</dt>
            <dd className="font-mono text-base font-medium tabular-nums">
              {TOTAL - sold} / {TOTAL}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Above base price</dt>
            <dd className="font-mono text-base font-medium tabular-nums">+{pctOverBase}%</dd>
          </div>
        </dl>
      </div>

      <div ref={boxRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-label={`Price rises from ${money(minC)} for the first copy to ${money(maxC)} for the last of ${TOTAL}.`}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHover(null)}
        >
          {/* recessive grid + y ticks */}
          {yTicks.map((c) => (
            <g key={c}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(c)} y2={y(c)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 10} y={y(c)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[11px] tabular-nums">
                ${c / 100}
              </text>
            </g>
          ))}
          {xTicks.map((s) => (
            <text key={s} x={x(s)} y={H - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px] tabular-nums">
              {s}
            </text>
          ))}

          {/* area wash + 2px line */}
          <path d={area} fill="var(--chart-1)" fillOpacity={0.1} />
          <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* crosshair */}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-muted-foreground" strokeWidth={1} />
          )}

          {/* current-copy marker: r=5 with a 2px surface ring */}
          <circle cx={x(sold)} cy={y(current)} r={5} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
          {hover !== null && hover !== sold && (
            <circle cx={x(hover)} cy={y(shownCents)} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
          )}
        </svg>

        {/* tooltip: value leads, label follows */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <div className="font-mono text-sm font-semibold tabular-nums text-popover-foreground">{money(shownCents)}</div>
            <div className="text-muted-foreground">after {shown} sold</div>
          </div>
        )}
        <p className="mt-1 text-center text-xs text-muted-foreground">Copies sold</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="flex justify-between text-sm">
          <span className="font-medium">Copies sold</span>
          <span className="font-mono tabular-nums text-muted-foreground">{sold}</span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={TOTAL - 1}
          value={sold}
          onChange={(e) => setSold(Number(e.target.value))}
          className="w-full accent-(--chart-1)"
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-3 w-full max-w-sm text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Copies sold</th>
              <th className="py-1 text-right font-medium">Next copy costs</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {TABLE_ROWS.map((s) => (
              <tr key={s} className="border-t">
                <td className="py-1">{s}</td>
                <td className="py-1 text-right">{money(priceAt(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
