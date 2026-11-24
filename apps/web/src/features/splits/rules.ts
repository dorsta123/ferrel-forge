// Split rules, shared by the browser and the server (pure). Shares are whole basis points:
// 100% = 10,000, so totals are exact and never rounded (decision 019).
import { CONTRIBUTOR_ROLES, CONTRIBUTOR_ROLE_LABELS, SPLIT_LIMITS as L, type ContributorRole } from "@ferrel/db/constants";

/** One row as typed into the form. The first row is always the lead artist. */
export type SplitRowInput = { name: string; role: string; roleNote: string; percent: string };
export type SplitRow = { name: string; role: ContributorRole; roleNote: string | null; basisPoints: number };
export type SplitRowErrors = Partial<Record<"name" | "role" | "roleNote" | "percent", string>>;
export type SplitErrors = { form?: string; rows?: Record<number, SplitRowErrors> };

const PERCENT = /^(\d{1,3})(?:\.(\d{0,2}))?$/;

/** "12.5" → 1250. Up to 2 decimals, so every value is a whole number of basis points. */
export function parsePercent(input: string): number | null {
  const m = PERCENT.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** 1250 → "12.5%". */
export const formatShare = (bp: number) => `${Number((bp / 100).toFixed(2))}%`;

/** The percentage to put back in the form's box: 1250 → "12.5". */
export const shareToInput = (bp: number) => String(Number((bp / 100).toFixed(2)));

const isRole = (value: string): value is ContributorRole => (CONTRIBUTOR_ROLES as readonly string[]).includes(value);

export function validateSplit(rows: SplitRowInput[]): { ok: true; value: SplitRow[] } | { ok: false; errors: SplitErrors } {
  if (rows.length === 0) return { ok: false, errors: { form: "Add at least the lead artist." } };
  if (rows.length > L.maxPeople) return { ok: false, errors: { form: `At most ${L.maxPeople} people can share a track.` } };

  const rowErrors: Record<number, SplitRowErrors> = {};
  const seen = new Set<string>();
  const value: SplitRow[] = [];
  rows.forEach((input, i) => {
    const e: SplitRowErrors = {};
    const name = input.name.trim();
    if (!name) e.name = "Enter a name.";
    else if (name.length > L.nameMax) e.name = `At most ${L.nameMax} characters.`;
    else if (seen.has(name.toLowerCase())) e.name = "Someone on this split already has this name.";
    seen.add(name.toLowerCase());

    const role = input.role;
    if (!isRole(role)) e.role = "Choose a role.";
    const note = input.roleNote.trim();
    if (role === "other" && !note) e.roleNote = "Say what they did.";
    else if (role === "other" && note.length > L.roleNoteMax) e.roleNote = `At most ${L.roleNoteMax} characters.`;

    const bp = parsePercent(input.percent);
    if (bp === null) e.percent = "Enter a percentage, like 12.5.";
    else if (bp < L.minBp) e.percent = "Each share is at least 0.5%.";
    else if (bp > L.totalBp) e.percent = "At most 100%.";

    if (Object.keys(e).length) rowErrors[i] = e;
    else value.push({ name, role: role as ContributorRole, roleNote: role === "other" ? note : null, basisPoints: bp! });
  });
  if (Object.keys(rowErrors).length) return { ok: false, errors: { rows: rowErrors } };

  const total = value.reduce((sum, r) => sum + r.basisPoints, 0);
  if (total !== L.totalBp) return { ok: false, errors: { form: `Shares add up to ${formatShare(total)}, not 100%.` } };
  return { ok: true, value };
}

export type Answer = "accept" | "decline";

/** A contributor's answer from the browser: exactly "accept" or "decline", anything else refused. */
export const parseAnswer = (value: unknown): Answer | null => (value === "accept" || value === "decline" ? value : null);

/** How a share's role reads: the lead, the note for "other", or the role's name. */
export const roleLabel = (s: { isLead: boolean; role: ContributorRole; roleNote: string | null }) =>
  s.isLead ? "Lead artist" : s.role === "other" && s.roleNote ? s.roleNote : CONTRIBUTOR_ROLE_LABELS[s.role];
