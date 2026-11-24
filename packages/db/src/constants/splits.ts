// Contributor splits (phase 5 part 3, decision 019). Shared by the database checks, the server and the browser.

export const CONTRIBUTOR_ROLES = ["producer", "vocalist", "writer", "mixer", "musician", "other"] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];
export const CONTRIBUTOR_ROLE_LABELS: Record<ContributorRole, string> = {
  producer: "Producer",
  vocalist: "Vocalist",
  writer: "Writer",
  mixer: "Mixer",
  musician: "Musician",
  other: "Other",
};

export const SHARE_STATUSES = ["pending", "accepted", "declined"] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

/** Shares are whole basis points: 100% = 10,000, 0.5% = 50. */
export const SPLIT_LIMITS = {
  totalBp: 10_000,
  minBp: 50,
  maxPeople: 50,
  nameMax: 60,
  roleNoteMax: 40,
} as const;
