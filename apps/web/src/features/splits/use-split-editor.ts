"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SPLIT_LIMITS } from "@ferrel/db/constants";
import { saveSplitAction } from "./actions";
import type { CurrentSplit } from "./queries";
import { parsePercent, shareToInput, type SplitErrors } from "./rules";

export type EditorRow = { key: number; shareId?: string; name: string; role: string; roleNote: string; percent: string };

function startRows(split: CurrentSplit | null, artistName: string): EditorRow[] {
  if (!split) return [{ key: 0, name: artistName, role: "producer", roleNote: "", percent: "100" }];
  return split.shares.map((s, i) => ({
    key: i,
    // Non-lead rows keep their link to the share, so whoever holds it stays on the split.
    ...(!s.isLead && { shareId: s.id }),
    name: s.name,
    role: s.role,
    roleNote: s.roleNote ?? "",
    percent: shareToInput(s.basisPoints),
  }));
}

/** The Contributors box's rows, live total and save. The first row is always the lead artist. */
export function useSplitEditor(trackId: string, split: CurrentSplit | null, artistName: string) {
  const router = useRouter();
  const nextKey = useRef(1000);
  const [rows, setRows] = useState(() => startRows(split, artistName));
  const [errors, setErrors] = useState<SplitErrors>({});
  const [pending, startTransition] = useTransition();

  const totalBp = rows.reduce((sum, r) => sum + (parsePercent(r.percent) ?? 0), 0);
  const canAdd = rows.length < SPLIT_LIMITS.maxPeople;

  const change = (key: number, patch: Partial<EditorRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const add = () => {
    setRows((rs) => [...rs, { key: nextKey.current++, name: "", role: "vocalist", roleNote: "", percent: "" }]);
  };
  const remove = (key: number) => {
    setRows((rs) => rs.filter((r, i) => i === 0 || r.key !== key));
  };

  function save() {
    startTransition(async () => {
      const result = await saveSplitAction(
        trackId,
        rows.map((r) => ({ shareId: r.shareId, name: r.name, role: r.role, roleNote: r.roleNote, percent: r.percent })),
        split?.version ?? 0, // the version this form shows: a newer one in the meantime is refused
      ).catch(() => ({ ok: false as const, errors: { form: "Something went wrong. Please try again." } }));
      if (result.ok) {
        setErrors({});
        router.refresh(); // new version: fresh share ids and statuses
      } else setErrors(result.errors);
    });
  }

  return { rows, errors, pending, totalBp, canAdd, change, add, remove, save };
}
