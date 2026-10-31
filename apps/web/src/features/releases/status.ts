// The release lifecycle (decisions 014, 021). Pure: the page uses it to choose
// which buttons to show, the service as the real check before its guarded update.
//
//   draft ──publish──▶ published ──archive──▶ archived (final)
//     ▲                    │
//     └────unpublish───────┘
//   draft ──delete──▶ gone
//
// Phase 5 adds license-based limits (e.g. no unpublish or delete while licenses are active).
import type { AudioStatus, TrackStatus } from "@ferrel/db/constants";

export const RELEASE_ACTIONS = ["publish", "unpublish", "archive", "delete"] as const;
export type ReleaseAction = (typeof RELEASE_ACTIONS)[number];

export type ReleaseFacts = {
  status: TrackStatus;
  hasAudio: boolean;
  /** The worker couldn't use the file (decision 027): publishing waits until it's fixed. */
  audioFailed: boolean;
  /** Set on the first publish and never cleared; it locks the URL. */
  everPublished: boolean;
};

export function releaseFacts(track: { status: TrackStatus; audioKey: string | null; audioStatus: AudioStatus; publishedAt: Date | null }): ReleaseFacts {
  return {
    status: track.status,
    hasAudio: track.audioKey !== null,
    audioFailed: track.audioStatus === "failed",
    everPublished: track.publishedAt !== null,
  };
}

export type ActionCheck = { ok: true } | { ok: false; error: string };

export function checkAction(t: ReleaseFacts, action: ReleaseAction): ActionCheck {
  switch (action) {
    case "publish":
      if (t.status !== "draft") return no("Only drafts can be published.");
      if (!t.hasAudio) return no("Upload the audio file before publishing.");
      // Publishing never waits for processing, but a file the worker couldn't use must be fixed first.
      if (t.audioFailed) return no("Fix the audio before publishing: upload a working file or try again.");
      return { ok: true };
    case "unpublish":
      if (t.status !== "published") return no("Only published releases can be unpublished.");
      return { ok: true };
    case "archive":
      if (t.status !== "published") return no("Only published releases can be archived.");
      return { ok: true };
    case "delete":
      if (t.status !== "draft") return no("Only drafts can be deleted. Archive a published release instead.");
      return { ok: true };
  }
}

/** Buttons to show for the current status. A shown button can still be disabled (e.g. publish without audio). */
export function visibleActions(t: ReleaseFacts): ReleaseAction[] {
  if (t.status === "draft") return ["publish", "delete"];
  if (t.status === "published") return ["unpublish", "archive"];
  return [];
}

export type ReleaseLocks = {
  /** Archived: nothing can be edited. */
  readOnly: boolean;
  /** URL fixed after the first publish, so shared links never break. */
  slug: boolean;
};

export function releaseLocks(t: ReleaseFacts): ReleaseLocks {
  return { readOnly: t.status === "archived", slug: t.everPublished };
}

const no = (error: string): ActionCheck => ({ ok: false, error });
