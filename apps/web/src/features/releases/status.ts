// The release lifecycle (decision 014). Pure: the page uses it to choose which
// buttons to show, the service as the real check before its guarded update.
//
//   draft ──publish──▶ published ──archive──▶ archived (final)
//     ▲                    │
//     └────unpublish───────┘  only while no copies are sold
//   draft ──delete──▶ gone   only while no copies are sold
import type { TrackStatus } from "@ferrel/db/constants";

export const RELEASE_ACTIONS = ["publish", "unpublish", "archive", "delete"] as const;
export type ReleaseAction = (typeof RELEASE_ACTIONS)[number];

export type ReleaseFacts = {
  status: TrackStatus;
  copiesSold: number;
  hasAudio: boolean;
  /** Set on the first publish and never cleared; it locks the URL. */
  everPublished: boolean;
};

export function releaseFacts(track: {
  status: TrackStatus;
  copiesSold: number;
  audioKey: string | null;
  publishedAt: Date | null;
}): ReleaseFacts {
  return {
    status: track.status,
    copiesSold: track.copiesSold,
    hasAudio: track.audioKey !== null,
    everPublished: track.publishedAt !== null,
  };
}

export type ActionCheck = { ok: true } | { ok: false; error: string };

export function checkAction(t: ReleaseFacts, action: ReleaseAction): ActionCheck {
  switch (action) {
    case "publish":
      if (t.status !== "draft") return no("Only drafts can be published.");
      if (!t.hasAudio) return no("Upload the audio file before publishing.");
      return { ok: true };
    case "unpublish":
      if (t.status !== "published") return no("Only published releases can be unpublished.");
      if (t.copiesSold > 0) return no("Copies have been sold, so this release can only be archived.");
      return { ok: true };
    case "archive":
      if (t.status !== "published") return no("Only published releases can be archived.");
      return { ok: true };
    case "delete":
      if (t.status !== "draft") return no("Only drafts can be deleted. Archive a published release instead.");
      if (t.copiesSold > 0) return no("Releases with sales can't be deleted.");
      return { ok: true };
  }
}

/** Buttons to show for the current status. A shown button can still be disabled (e.g. publish without audio). */
export function visibleActions(t: ReleaseFacts): ReleaseAction[] {
  if (t.status === "draft") return t.copiesSold === 0 ? ["publish", "delete"] : ["publish"];
  if (t.status === "published") return t.copiesSold === 0 ? ["unpublish", "archive"] : ["archive"];
  return [];
}

export type ReleaseLocks = {
  /** Archived: nothing can be edited. */
  readOnly: boolean;
  /** URL fixed after the first publish, so shared links never break. */
  slug: boolean;
  /** Copies and price fixed after the first sale, so buyers' deal never changes. */
  sale: boolean;
};

export function releaseLocks(t: ReleaseFacts): ReleaseLocks {
  return { readOnly: t.status === "archived", slug: t.everPublished, sale: t.copiesSold > 0 };
}

const no = (error: string): ActionCheck => ({ ok: false, error });
