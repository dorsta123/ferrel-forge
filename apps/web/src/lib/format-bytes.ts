// Non-breaking space keeps "150 MB" together when text wraps.
const NBSP = " ";

/** 1536 -> "1.5 KB", 157286400 -> "150 MB". Binary units, one decimal under 10. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}${NBSP}B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1).replace(/\.0$/, "") : Math.round(value)}${NBSP}${units[unit]}`;
}
