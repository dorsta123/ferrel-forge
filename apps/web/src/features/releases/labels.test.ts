import { describe, expect, it } from "vitest";
import { genreLabel, keyLabel, keyShort } from "./labels";

describe("labels", () => {
  it("names musical keys", () => {
    expect(keyLabel("C")).toBe("C major");
    expect(keyLabel("C#m")).toBe("C♯ minor");
    expect(keyLabel("Am")).toBe("A minor");
    expect(keyShort("F#m")).toBe("F♯m");
  });

  it("names genres", () => {
    expect(genreLabel("rnb")).toBe("R&B");
  });
});
