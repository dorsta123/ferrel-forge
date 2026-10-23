/** 1080000 -> "1,080,000". One place for how counts are shown across the app. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
