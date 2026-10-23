"use client";

import { ArchiveIcon, EyeOffIcon, RocketIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAction, visibleActions, type ReleaseAction, type ReleaseFacts } from "./status";
import { useReleaseActions } from "./use-release-actions";

const BUTTONS: Record<ReleaseAction, { label: string; icon: typeof RocketIcon; variant: "default" | "outline" | "destructive"; confirm?: string }> = {
  publish: { label: "Publish", icon: RocketIcon, variant: "default" },
  unpublish: { label: "Unpublish", icon: EyeOffIcon, variant: "outline" },
  archive: {
    label: "Archive",
    icon: ArchiveIcon,
    variant: "outline",
    confirm: "Archiving is final. The release leaves the marketplace and can no longer be licensed.",
  },
  delete: {
    label: "Delete draft",
    icon: Trash2Icon,
    variant: "destructive",
    confirm: "This deletes the draft and its audio file. It can't be undone.",
  },
};

const EXPLAIN: Record<ReleaseFacts["status"], string> = {
  draft: "Only you can see this draft.",
  published: "Live on the marketplace.",
  archived: "Archived: no longer offered for licensing.",
};

export function ReleaseActions({ trackId, facts }: { trackId: string; facts: ReleaseFacts }) {
  const { pending, error, confirming, setConfirming, run } = useReleaseActions(trackId);
  const actions = visibleActions(facts);
  const blocked = actions.map((a) => checkAction(facts, a)).find((c) => !c.ok);

  return (
    <section aria-label="Release status" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{EXPLAIN[facts.status]}</p>

      {confirming ? (
        <div role="alertdialog" aria-labelledby="confirm-text" className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p id="confirm-text" className="text-sm">
            {BUTTONS[confirming].confirm}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={pending} onClick={() => run(confirming)}>
              {pending ? "Working…" : `Yes, ${BUTTONS[confirming].label.toLowerCase()}`}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const { label, icon: Icon, variant, confirm } = BUTTONS[action];
              return (
                <Button
                  key={action}
                  variant={variant}
                  className="h-9 gap-1.5 px-4"
                  disabled={pending || !checkAction(facts, action).ok}
                  onClick={() => (confirm ? setConfirming(action) : run(action))}
                >
                  <Icon aria-hidden="true" /> {label}
                </Button>
              );
            })}
          </div>
        )
      )}

      {blocked && !blocked.ok && <p className="text-xs text-muted-foreground">{blocked.error}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
