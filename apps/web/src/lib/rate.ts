// Rates: typed in dollars per 1,000 exposure-seconds, stored as whole micro-dollars
// (millionths of a dollar, as Google Ads does), so money maths never rounds wrongly (decision 034).

export const RATE_UNIT = "per 1,000 exposure-seconds";

const DOLLARS = /^\$?\s*(\d{1,7})(?:\.(\d{1,4}))?$/;

/** "0.5", "$0.50", "0.0125" -> micro-dollars. Anything else (negatives, "1e3", 5+ decimals, commas) -> null. */
export function parseRate(input: string): number | null {
  const match = DOLLARS.exec(input.trim());
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(6, "0");
  return Number(match[1]) * 1_000_000 + Number(fraction);
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** 500_000 -> "$0.50", 12_500 -> "$0.0125" */
export function formatRate(micros: number): string {
  return USD.format(micros / 1_000_000);
}

/** 500_000 -> "0.50", 12_500 -> "0.0125", for prefilling the rate input. */
export function rateToInput(micros: number): string {
  return formatRate(micros).replace(/^\$/, "").replace(/,/g, "");
}
