"use client";

// The lead artist's "Contributors" box: who made the track and their share, totalling exactly 100%.
import { PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "cn";
import { CONTRIBUTOR_ROLES, CONTRIBUTOR_ROLE_LABELS, SPLIT_LIMITS } from "@ferrel/db/constants";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CurrentSplit } from "./queries";
import { formatShare } from "./rules";
import { useSplitEditor } from "./use-split-editor";

type Props = { trackId: string; split: CurrentSplit | null; artistName: string; editable: boolean };

export function SplitEditor({ trackId, split, artistName, editable }: Props) {
  const e = useSplitEditor(trackId, split, artistName);
  const exact = e.totalBp === SPLIT_LIMITS.totalBp;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        e.save();
      }}
    >
      <ol className="flex flex-col gap-3" aria-label="Contributors">
        {e.rows.map((r, i) => {
          const err = e.errors.rows?.[i] ?? {};
          const id = (field: string) => `split-${r.key}-${field}`;
          return (
            <li key={r.key} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_10rem_7rem_auto] sm:items-start" data-testid="split-row">
              <FormField id={id("name")} label={i === 0 ? "Name (you, the lead artist)" : "Name"} error={err.name}>
                <Input id={id("name")} value={r.name} maxLength={SPLIT_LIMITS.nameMax} disabled={!editable} aria-invalid={!!err.name} onChange={(ev) => e.change(r.key, { name: ev.target.value })} />
              </FormField>
              <div className="flex flex-col gap-2">
                <FormField id={id("role")} label="Role" error={err.role}>
                  <NativeSelect id={id("role")} value={r.role} disabled={!editable} onChange={(ev) => e.change(r.key, { role: ev.target.value })}>
                    {CONTRIBUTOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {CONTRIBUTOR_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                {r.role === "other" && (
                  <FormField id={id("note")} label="What they did" error={err.roleNote}>
                    <Input id={id("note")} value={r.roleNote} maxLength={SPLIT_LIMITS.roleNoteMax} disabled={!editable} aria-invalid={!!err.roleNote} onChange={(ev) => e.change(r.key, { roleNote: ev.target.value })} />
                  </FormField>
                )}
              </div>
              <FormField id={id("percent")} label="Share %" error={err.percent}>
                <Input id={id("percent")} inputMode="decimal" value={r.percent} disabled={!editable} aria-invalid={!!err.percent} onChange={(ev) => e.change(r.key, { percent: ev.target.value })} />
              </FormField>
              {i > 0 && editable ? (
                <Button type="button" variant="ghost" onClick={() => e.remove(r.key)} className="h-10 self-end px-3" aria-label={`Remove ${r.name || "this person"}`}>
                  <Trash2Icon aria-hidden="true" />
                </Button>
              ) : (
                <span aria-hidden="true" className="hidden sm:block sm:w-10" />
              )}
            </li>
          );
        })}
      </ol>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={e.add} disabled={!e.canAdd} className="h-9 gap-2 px-4">
            <PlusIcon aria-hidden="true" /> Add contributor
          </Button>
          <p className={cn("text-sm tabular-nums", exact ? "text-muted-foreground" : "font-medium text-destructive")} data-testid="split-total" aria-live="polite">
            Total {formatShare(e.totalBp)}
            {!exact && " (must be 100%)"}
          </p>
        </div>
      )}

      {e.errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {e.errors.form}
        </p>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={e.pending} className="h-10 px-5">
            {e.pending ? "Saving…" : "Save split"}
          </Button>
          <p className="text-xs text-muted-foreground">Saving asks everyone except you to accept again. Running licenses keep the split they started with.</p>
        </div>
      )}
    </form>
  );
}
