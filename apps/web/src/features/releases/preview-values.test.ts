import { describe, expect, it } from "vitest";
import { NEW_RELEASE_VALUES } from "./form-values";
import { previewFromForm } from "./preview-values";

describe("previewFromForm", () => {
  it("shows valid values as typed", () => {
    expect(previewFromForm({ ...NEW_RELEASE_VALUES, title: " Night  Drive ", genre: "lo-fi", bpm: "90", musicalKey: "Am", price: "7.5" })).toEqual({
      title: "Night Drive",
      genre: "lo-fi",
      bpm: 90,
      musicalKey: "Am",
    });
  });

  it("blanks out values that aren't valid yet", () => {
    expect(previewFromForm({ ...NEW_RELEASE_VALUES, genre: "polka", bpm: "9", musicalKey: "H" })).toMatchObject({
      genre: null,
      bpm: null,
      musicalKey: null,
    });
  });

  it("never includes the artist's private rate", () => {
    expect(previewFromForm({ ...NEW_RELEASE_VALUES, price: "12.50" })).not.toHaveProperty("basePriceCents");
  });
});
