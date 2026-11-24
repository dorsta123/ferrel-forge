"use client";

// Who has answered the split in force, with an invite link for each person still to answer.
import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInviteLinkAction } from "./actions";
import type { CurrentShare, CurrentSplit } from "./queries";
import { formatShare, roleLabel } from "./rules";
import { ShareStatusBadge } from "./share-status-badge";

export function SplitStatus({ trackId, split }: { trackId: string; split: CurrentSplit }) {
  const accepted = split.shares.filter((s) => s.status === "accepted").length;
  return (
    <div className="flex flex-col gap-3" data-testid="split-status">
      <p className="text-sm">
        <span className="font-medium">
          {accepted} of {split.shares.length} accepted
        </span>{" "}
        <span className="text-muted-foreground">· split version {split.version}</span>
        {accepted < split.shares.length && <span className="text-muted-foreground"> · the track can be licensed once everyone accepts</span>}
      </p>
      <ul className="flex flex-col divide-y rounded-xl border">
        {split.shares.map((s) => (
          <ShareLine key={s.id} trackId={trackId} share={s} />
        ))}
      </ul>
    </div>
  );
}

function ShareLine({ trackId, share: s }: { trackId: string; share: CurrentShare }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  const makeLink = () =>
    startTransition(async () => {
      setError(null);
      const r = await createInviteLinkAction(trackId, s.id).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
      setCopied(null);
      if (r.ok) setLink(`${window.location.origin}/splits/invite/${r.code}`);
      else setError(r.error);
    });
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
    } catch {
      setCopied("failed"); // e.g. no clipboard access: the link is selectable in the box
    }
  };

  return (
    <li className="flex flex-col gap-2 p-3" data-testid="share-line">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{s.name}</span>
        <span className="text-sm text-muted-foreground">
          {roleLabel(s)}
        </span>
        <span className="text-sm tabular-nums">{formatShare(s.basisPoints)}</span>
        <ShareStatusBadge status={s.status} />
        {s.status === "pending" && !s.isLead && (
          <Button type="button" variant="outline" onClick={makeLink} disabled={pending} className="ml-auto h-8 gap-1.5 px-3 text-xs">
            <LinkIcon aria-hidden="true" /> {link ? "New invite link" : "Get invite link"}
          </Button>
        )}
      </div>
      {s.status === "pending" && !s.isLead && s.hasAccount && !link && (
        <p className="text-xs text-muted-foreground">They can answer from &ldquo;My splits&rdquo; in their account menu.</p>
      )}
      {link && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input readOnly value={link} aria-label={`Invite link for ${s.name}`} className="h-8 min-w-0 flex-1 rounded-md border bg-muted px-2 font-mono text-xs" onFocus={(ev) => ev.target.select()} />
            <Button type="button" variant="outline" onClick={copy} className="h-8 gap-1.5 px-3 text-xs">
              {copied === "yes" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />} {copied === "yes" ? "Copied" : "Copy"}
            </Button>
          </div>
          {copied === "failed" && (
            <p role="alert" className="text-xs text-destructive">
              Couldn&rsquo;t copy automatically: select the link and copy it.
            </p>
          )}
          <p className="text-xs text-muted-foreground">Send it to {s.name} yourself. Anyone with it can claim this share, and it stops working once used or replaced.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
