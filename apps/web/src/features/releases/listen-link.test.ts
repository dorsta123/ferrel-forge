import { describe, expect, it } from "vitest";
import { checkListenUrl, listenPlatform } from "./listen-link";

describe("checkListenUrl", () => {
  it("treats an empty field as no link", () => {
    expect(checkListenUrl("   ")).toEqual({ ok: true, value: null });
  });

  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=abc", "https://music.youtube.com/watch?v=abc"],
    ["https://m.youtube.com/watch?v=abc", "https://m.youtube.com/watch?v=abc"],
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"],
    ["https://soundcloud.com/artist/song", "https://soundcloud.com/artist/song"],
    ["  https://SoundCloud.com/artist/song  ", "https://soundcloud.com/artist/song"], // trimmed, host lowercased
  ])("accepts %s", (input, stored) => {
    expect(checkListenUrl(input)).toEqual({ ok: true, value: stored });
  });

  it.each([
    ["plain http", "http://www.youtube.com/watch?v=abc"],
    ["a script", "javascript:alert(1)"],
    ["data", "data:text/html,hi"],
    ["a lookalike domain", "https://youtube.com.evil.com/watch?v=abc"],
    ["another site with the name in the path", "https://evil.com/youtube.com/watch"],
    ["a hidden login", "https://youtube.com@evil.com/watch"],
    ["credentials", "https://user:pass@open.spotify.com/track/x"],
    ["a port", "https://open.spotify.com:8443/track/x"],
    ["a bare home page", "https://www.youtube.com/"],
    ["spotify without open.", "https://spotify.com/track/x"],
    ["a different site", "https://example.com/song"],
    ["not a link", "my song on youtube"],
    ["over 300 characters", `https://youtu.be/${"a".repeat(300)}`],
  ])("refuses %s", (_, input) => {
    expect(checkListenUrl(input).ok).toBe(false);
  });
});

describe("listenPlatform", () => {
  it.each([
    ["https://youtu.be/x", "YouTube"],
    ["https://music.youtube.com/watch?v=x", "YouTube"],
    ["https://open.spotify.com/track/x", "Spotify"],
    ["https://soundcloud.com/a/b", "SoundCloud"],
  ])("names the site of %s", (url, name) => {
    expect(listenPlatform(url)).toBe(name);
  });
});
