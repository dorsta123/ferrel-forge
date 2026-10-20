// Prices are typed in dollars and stored as integer cents (decision 006).

const DOLLARS = /^\$?\s*(\d{1,7})(?:\.(\d{1,2}))?$/;

/** "12", "12.5", "$12.50" -> 1250. Anything else (negatives, "1e3", "12.345", commas) -> null. */
export function parseDollars(input: string): number | null {
  const match = DOLLARS.exec(input.trim());
  if (!match) return null;
  const cents = (match[2] ?? "").padEnd(2, "0");
  return Number(match[1]) * 100 + Number(cents);
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 1250 -> "$12.50" */
export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

/** 1250 -> "12.50", for prefilling a price input. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
