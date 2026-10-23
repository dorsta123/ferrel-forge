import { describe, expect, it } from "vitest";
import { editedAgo, rowView } from "./row-view";

const base = { status: "published" as const, basePriceCents: 1250, hasAudio: true, durationMs: null };

describe("rowView", () => {
  it("shows the artist's own base rate", () => {
    expect(rowView(base)).toEqual({ rateLabel: "$12.50", lengthLabel: null, needsAudio: false });
  });

  it("shows the track length once known", () => {
    expect(rowView({ ...base, durationMs: 222_000 }).lengthLabel).toBe("3:42");
  });

  it("flags drafts without audio only", () => {
    expect(rowView({ ...base, status: "draft", hasAudio: false }).needsAudio).toBe(true);
    expect(rowView({ ...base, status: "draft", hasAudio: true }).needsAudio).toBe(false);
    expect(rowView({ ...base, hasAudio: false }).needsAudio).toBe(false);
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
