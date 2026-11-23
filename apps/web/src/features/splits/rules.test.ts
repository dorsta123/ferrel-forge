import { describe, expect, it } from "vitest";
import { formatShare, parsePercent, validateSplit, type SplitRowInput } from "./rules";

const row = (patch: Partial<SplitRowInput> = {}): SplitRowInput => ({ name: "Sam", role: "vocalist", roleNote: "", percent: "40", ...patch });
const lead = (percent = "60") => row({ name: "Alice Music", role: "producer", percent });

describe("parsePercent", () => {
  it.each([
    ["100", 10_000],
    ["12.5", 1_250],
    ["0.5", 50],
    ["33.33", 3_333],
    [" 7 ", 700],
    ["7.", 700],
  ])("%s%% is %i basis points", (input, bp) => expect(parsePercent(input)).toBe(bp));

  it.each(["", "abc", "1.234", "-5", "1e2", "12,5", "0x10", "Infinity"])("refuses %j", (input) => expect(parsePercent(input)).toBeNull());
});

describe("formatShare", () => {
  it.each([
    [10_000, "100%"],
    [1_250, "12.5%"],
    [3_333, "33.33%"],
    [50, "0.5%"],
  ])("%i bp → %s", (bp, text) => expect(formatShare(bp)).toBe(text));
});

describe("validateSplit", () => {
  it("accepts a split totalling exactly 100% with the lead first", () => {
    const r = validateSplit([lead(), row()]);
    expect(r).toEqual({
      ok: true,
      value: [
        { name: "Alice Music", role: "producer", roleNote: null, basisPoints: 6_000 },
        { name: "Sam", role: "vocalist", roleNote: null, basisPoints: 4_000 },
      ],
    });
  });

  it("accepts the lead alone at 100%", () => {
    expect(validateSplit([lead("100")]).ok).toBe(true);
  });

  it("refuses totals that aren't exactly 100% (no rounding)", () => {
    expect(validateSplit([lead("60"), row({ percent: "39.99" })])).toMatchObject({ ok: false, errors: { form: expect.stringContaining("99.99%") } });
    expect(validateSplit([lead("60"), row({ percent: "40.01" })])).toMatchObject({ ok: false, errors: { form: expect.stringContaining("100.01%") } });
  });

  it("refuses shares under 0.5%, bad percentages, names and roles, per row", () => {
    const r = validateSplit([lead("99.6"), row({ percent: "0.4" }), row({ name: "  ", role: "drummer" as never, percent: "x" })]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.rows?.[1]?.percent).toContain("0.5%");
    expect(r.errors.rows?.[2]).toMatchObject({ name: expect.any(String), role: expect.any(String), percent: expect.any(String) });
  });

  it("needs a note for 'other', and keeps it only for 'other'", () => {
    expect(validateSplit([lead("60"), row({ role: "other", roleNote: " " })])).toMatchObject({ ok: false, errors: { rows: { 1: { roleNote: expect.any(String) } } } });
    const fine = validateSplit([lead("60"), row({ role: "other", roleNote: " Cover art " })]);
    expect(fine).toMatchObject({ ok: true, value: [{}, { roleNote: "Cover art" }] });
    const dropped = validateSplit([lead("60"), row({ roleNote: "not other" })]);
    expect(dropped).toMatchObject({ ok: true, value: [{}, { roleNote: null }] });
  });

  it("refuses more than 50 people, and an empty split", () => {
    const many = [lead("51"), ...Array.from({ length: 50 }, (_, i) => row({ name: `P${i}`, percent: "0.98" }))];
    expect(validateSplit(many)).toMatchObject({ ok: false, errors: { form: expect.stringContaining("50") } });
    expect(validateSplit([])).toMatchObject({ ok: false });
  });

  it("refuses two people with the same name, which would be impossible to tell apart", () => {
    expect(validateSplit([lead("50"), row({ percent: "25" }), row({ name: " sam ", percent: "25" })])).toMatchObject({
      ok: false,
      errors: { rows: { 2: { name: expect.any(String) } } },
    });
  });

  it("trims names and refuses ones over 60 characters", () => {
    expect(validateSplit([lead("60"), row({ name: "  Sam  " })])).toMatchObject({ ok: true, value: [{}, { name: "Sam" }] });
    expect(validateSplit([lead("60"), row({ name: "x".repeat(61) })])).toMatchObject({ ok: false });
  });
});
