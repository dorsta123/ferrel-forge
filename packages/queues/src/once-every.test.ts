import { describe, expect, it, vi } from "vitest";
import { onceEvery } from "./once-every";

describe("onceEvery", () => {
  it("runs the first call, drops calls inside the window, runs again after it", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const limited = onceEvery(60_000, fn);
    limited("a");
    limited("b");
    vi.advanceTimersByTime(59_999);
    limited("c");
    vi.advanceTimersByTime(1);
    limited("d");
    expect(fn.mock.calls).toEqual([["a"], ["d"]]);
    vi.useRealTimers();
  });
});
