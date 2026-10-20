import { describe, expect, it } from "vitest";
import { editedAgo, rowView } from "./row-view";

const base = { status: "published" as const, totalSupply: 50, copiesSold: 0, basePriceCents: 1250, hasAudio: true };

describe("rowView", () => {
  it("shows the base price at full supply", () => {
    expect(rowView(base)).toEqual({ remaining: 50, supplyLabel: "50 of 50 left", priceLabel: "$12.50", needsAudio: false });
  });

  it("shows the raised price after sales", () => {
    expect(rowView({ ...base, copiesSold: 2 })).toMatchObject({ remaining: 48, priceLabel: "$13.00" });
  });

  it("says sold out instead of a price", () => {
    expect(rowView({ ...base, copiesSold: 50 })).toMatchObject({ remaining: 0, supplyLabel: "0 of 50 left", priceLabel: "Sold out" });
  });

  it("flags drafts without audio only", () => {
    expect(rowView({ ...base, status: "draft", hasAudio: false }).needsAudio).toBe(true);
    expect(rowView({ ...base, status: "draft", hasAudio: true }).needsAudio).toBe(false);
    expect(rowView({ ...base, hasAudio: false }).needsAudio).toBe(false);
  });

  it("formats big runs with separators", () => {
    expect(rowView({ ...base, totalSupply: 1000 }).supplyLabel).toBe("1,000 of 1,000 left");
  });
});

describe("editedAgo", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const before = (ms: number) => new Date(now.getTime() - ms);

  it.each([
    [10_000, "just now"],
    [5 * 60_000, "5m ago"],
    [3 * 3_600_000, "3h ago"],
    [2 * 86_400_000, "2d ago"],
  ])("%i ms -> %s", (ms, label) => {
    expect(editedAgo(before(ms), now)).toBe(label);
  });

  it("shows a date after a week", () => {
    expect(editedAgo(new Date("2026-10-03T09:00:00Z"), now)).toBe("Oct 3");
    expect(editedAgo(new Date("2025-10-03T09:00:00Z"), now)).toBe("Oct 3, 2025");
  });
});
