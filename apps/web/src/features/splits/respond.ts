// The contributor's side of splits, independent of Next.js: callers pass an authenticated user id.
// Answers only ever apply to a pending share on the split in force.
import { and, asc, creatorProfiles, db, eq, splitShares, splitVersions, sql, tracks } from "@ferrel/db";
import type { ContributorRole, ShareStatus } from "@ferrel/db/constants";
import { PG_UNIQUE_VIOLATION, pgError } from "@/lib/pg-error";
import { isUuid } from "../tracks/track-access";
import { isCurrentVersion } from "./current-version";
import { inviteCodeHash } from "./invite-code";

export type Answer = "accept" | "decline";
type Result = { ok: true } | { ok: false; error: string };

const EXPIRED = { ok: false, error: "This invite link has expired or was already used. Ask the artist for a new one." } as const;
const ALREADY_ON = { ok: false, error: "You're already on this split." } as const;
const NOT_FOUND = { ok: false, error: "This share isn't waiting for your answer." } as const;

type ShareLine = { name: string; role: ContributorRole; roleNote: string | null; basisPoints: number; isLead: boolean; status: ShareStatus };
export type Invite = {
  trackTitle: string;
  artistName: string;
  version: number;
  share: ShareLine & { id: string };
  /** The whole split, so everyone sees what they're agreeing to (user, 2026-11-24). */
  shares: ShareLine[];
};

/** A share is open to this user if no account holds it yet, or theirs does. */
const openTo = (userId: string) => sql`(${splitShares.userId} is null or ${splitShares.userId} = ${userId})`;

/** What an invite link offers, if it's live and meant for anyone or this user. */
export async function getInvite(userId: string, code: string): Promise<{ ok: true; invite: Invite } | { ok: false; error: string }> {
  const hash = inviteCodeHash(code);
  if (!hash) return EXPIRED;
  const [row] = await db
    .select({
      id: splitShares.id,
      splitVersionId: splitShares.splitVersionId,
      version: splitVersions.version,
      trackTitle: tracks.title,
      artistName: creatorProfiles.artistName,
    })
    .from(splitShares)
    .innerJoin(splitVersions, eq(splitVersions.id, splitShares.splitVersionId))
    .innerJoin(tracks, eq(tracks.id, splitVersions.trackId))
    .innerJoin(creatorProfiles, eq(creatorProfiles.userId, tracks.creatorId))
    .where(and(eq(splitShares.inviteHash, hash), eq(splitShares.status, "pending"), openTo(userId), isCurrentVersion))
    .limit(1);
  if (!row) return EXPIRED;
  const lines = await db
    .select({
      id: splitShares.id,
      name: splitShares.name,
      role: splitShares.role,
      roleNote: splitShares.roleNote,
      basisPoints: splitShares.basisPoints,
      isLead: splitShares.isLead,
      status: splitShares.status,
    })
    .from(splitShares)
    .where(eq(splitShares.splitVersionId, row.splitVersionId))
    .orderBy(asc(splitShares.position));
  const share = lines.find((l) => l.id === row.id)!;
  return {
    ok: true,
    invite: { trackTitle: row.trackTitle, artistName: row.artistName, version: row.version, share, shares: lines.map(({ id: _, ...line }) => line) },
  };
}

async function answer(where: ReturnType<typeof and>, userId: string, response: Answer, notFound: Result): Promise<Result> {
  try {
    const updated = await db
      .update(splitShares)
      .set({ userId, status: response === "accept" ? "accepted" : "declined", respondedAt: new Date(), inviteHash: null })
      .where(and(where, eq(splitShares.status, "pending"), eq(splitShares.isLead, false), openTo(userId), isCurrentVersion))
      .returning({ id: splitShares.id });
    return updated.length ? { ok: true } : notFound;
  } catch (err) {
    // One share per person per version: they already hold another share on this split.
    if (pgError(err)?.code === PG_UNIQUE_VIOLATION) return ALREADY_ON;
    throw err;
  }
}

/** Accept or decline through an invite link. Ties the share to this account and uses up the link. */
export async function respondByCode(userId: string, code: string, response: Answer): Promise<Result> {
  const hash = inviteCodeHash(code);
  if (!hash) return EXPIRED;
  return answer(eq(splitShares.inviteHash, hash), userId, response, EXPIRED);
}

/** Accept or decline a share already tied to this account ("My splits"). */
export async function respondToShare(userId: string, shareId: string, response: Answer): Promise<Result> {
  if (!isUuid(shareId)) return NOT_FOUND;
  return answer(and(eq(splitShares.id, shareId), eq(splitShares.userId, userId)), userId, response, NOT_FOUND);
}

/** Every track this account is on, as the split in force stands. */
export async function mySplits(userId: string) {
  return db
    .select({
      shareId: splitShares.id,
      trackTitle: tracks.title,
      trackSlug: tracks.slug,
      trackStatus: tracks.status,
      artistName: creatorProfiles.artistName,
      creatorSlug: creatorProfiles.slug,
      role: splitShares.role,
      roleNote: splitShares.roleNote,
      basisPoints: splitShares.basisPoints,
      isLead: splitShares.isLead,
      status: splitShares.status,
      version: splitVersions.version,
    })
    .from(splitShares)
    .innerJoin(splitVersions, eq(splitVersions.id, splitShares.splitVersionId))
    .innerJoin(tracks, eq(tracks.id, splitVersions.trackId))
    .innerJoin(creatorProfiles, eq(creatorProfiles.userId, tracks.creatorId))
    .where(and(eq(splitShares.userId, userId), isCurrentVersion))
    .orderBy(sql`${splitShares.status} = 'pending' desc`, asc(tracks.title));
}

export type MySplit = Awaited<ReturnType<typeof mySplits>>[number];
