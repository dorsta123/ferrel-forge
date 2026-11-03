import { afterEach, describe, expect, it } from "vitest";
import { publicPreviewUrl } from "./public-url";

const KEY = "22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.mp3";
const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("publicPreviewUrl", () => {
  it("defaults to the storage server's public previews bucket", () => {
    process.env.PREVIEWS_PUBLIC_URL = "";
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET_PREVIEWS = "previews";
    expect(publicPreviewUrl(KEY)).toBe(`http://localhost:9000/previews/${KEY}`);
  });

  it("uses PREVIEWS_PUBLIC_URL when set (e.g. a CDN), with or without a trailing slash", () => {
    process.env.PREVIEWS_PUBLIC_URL = "https://cdn.example.com/p/";
    expect(publicPreviewUrl(KEY)).toBe(`https://cdn.example.com/p/${KEY}`);
  });

  it.each([
    ["a master key", "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.wav"],
    ["a path escape", "../masters/x.mp3"],
    ["an absolute URL", "https://evil.example/x.mp3"],
  ])("refuses %s (only our preview keys are ever turned into public links)", (_, key) => {
    expect(() => publicPreviewUrl(key)).toThrow();
  });
});
