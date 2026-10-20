import { randomUUID } from "node:crypto";
import { AUDIO_FORMATS, type AudioFormat } from "@ferrel/db/constants";

// Master files live at  <creatorId>/<trackId>/<random>.<ext>  in the masters
// bucket. The random part makes every upload a new object, so a replacement
// never overwrites a file until the server has verified the new one.

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MASTER_KEY = new RegExp(`^(${UUID})/(${UUID})/(${UUID})\\.(${AUDIO_FORMATS.join("|")})$`);

export function newMasterKey(creatorId: string, trackId: string, format: AudioFormat): string {
  return `${creatorId}/${trackId}/${randomUUID()}.${format}`;
}

/** Parse a master key, or null if it isn't one of ours. */
export function parseMasterKey(key: string): { creatorId: string; trackId: string; format: AudioFormat } | null {
  const match = MASTER_KEY.exec(key);
  if (!match) return null;
  return { creatorId: match[1], trackId: match[2], format: match[4] as AudioFormat };
}

/** True only for a well-formed key inside this creator's folder for this track. */
export function isMasterKeyFor(key: string, creatorId: string, trackId: string): boolean {
  const parsed = parseMasterKey(key);
  return parsed !== null && parsed.creatorId === creatorId && parsed.trackId === trackId;
}
