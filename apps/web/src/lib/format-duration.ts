/** 222_000 -> "3:42", 3_725_000 -> "1:02:05". Rounds to the nearest second; anything above zero shows at least "0:01". */
export function formatDuration(ms: number): string {
  const total = ms > 0 ? Math.max(1, Math.round(ms / 1000)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
