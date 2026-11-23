// Invite codes: 32 random bytes, shown once in the link. Only their SHA-256 is stored, so a
// database leak doesn't hand out working links.
import { createHash, randomBytes } from "node:crypto";

const CODE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes in base64url

export const hashInviteCode = (code: string) => createHash("sha256").update(code).digest("hex");

export function newInviteCode(): { code: string; hash: string } {
  const code = randomBytes(32).toString("base64url");
  return { code, hash: hashInviteCode(code) };
}

/** The hash to look up, or null for anything that can't be one of our codes. */
export const inviteCodeHash = (code: string): string | null => (CODE.test(code) ? hashInviteCode(code) : null);
