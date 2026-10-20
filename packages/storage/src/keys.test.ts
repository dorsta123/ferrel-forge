import { describe, expect, it } from "vitest";
import { isMasterKeyFor, newMasterKey, parseMasterKey } from "./keys";

const creator = "11111111-1111-4111-8111-111111111111";
const track = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";

describe("master keys", () => {
  it("creates unique keys inside the creator's track folder", () => {
    const a = newMasterKey(creator, track, "wav");
    const b = newMasterKey(creator, track, "wav");
    expect(a).not.toBe(b);
    expect(parseMasterKey(a)).toEqual({ creatorId: creator, trackId: track, format: "wav" });
    expect(isMasterKeyFor(a, creator, track)).toBe(true);
  });

  it("rejects keys for another creator or track", () => {
    const key = newMasterKey(creator, track, "mp3");
    expect(isMasterKeyFor(key, other, track)).toBe(false);
    expect(isMasterKeyFor(key, creator, other)).toBe(false);
  });

  it.each([
    `${creator}/${track}/../../${other}/x.wav`,
    `${creator}/${track}/not-a-uuid.wav`,
    `${creator}/${track}/${other}.exe`,
    `/${creator}/${track}/${other}.wav`,
    "",
  ])("rejects malformed key %j", (key) => {
    expect(parseMasterKey(key)).toBeNull();
    expect(isMasterKeyFor(key, creator, track)).toBe(false);
  });
});
