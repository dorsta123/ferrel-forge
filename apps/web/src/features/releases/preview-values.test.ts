import { describe, expect, it } from "vitest";
import { NEW_RELEASE_VALUES } from "./form-values";
import { previewFromForm } from "./preview-values";

describe("previewFromForm", () => {
  it("shows valid values as typed", () => {
    expect(
      previewFromForm({ ...NEW_RELEASE_VALUES, title: " Night  Drive ", genre: "lo-fi", bpm: "90", musicalKey: "Am", totalSupply: "50", price: "7.5" }),
    ).toEqual({ title: "Night Drive", genre: "lo-fi", bpm: 90, musicalKey: "Am", totalSupply: 50, basePriceCents: 750 });
  });

  it("blanks out values that aren't valid yet", () => {
    expect(previewFromForm({ ...NEW_RELEASE_VALUES, genre: "polka", bpm: "9", musicalKey: "H", totalSupply: "0", price: "0.5" })).toMatchObject({
      genre: null,
      bpm: null,
      musicalKey: null,
      totalSupply: null,
      basePriceCents: null,
    });
  });
});
