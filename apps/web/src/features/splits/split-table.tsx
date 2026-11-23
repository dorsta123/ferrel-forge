// The whole split, read-only: what everyone gets (shown to contributors before they answer).
import { cn } from "cn";
import { CONTRIBUTOR_ROLE_LABELS, type ContributorRole, type ShareStatus } from "@ferrel/db/constants";
import { formatShare } from "./rules";
import { ShareStatusBadge } from "./share-status-badge";

type Line = { name: string; role: ContributorRole; roleNote: string | null; basisPoints: number; isLead: boolean; status: ShareStatus };

export function SplitTable({ shares, highlight }: { shares: Line[]; highlight?: number }) {
  return (
    <ul className="flex flex-col divide-y rounded-xl border" aria-label="The whole split" data-testid="split-table">
      {shares.map((s, i) => (
        <li key={i} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 p-3", i === highlight && "bg-brand/10")}>
          <span className="font-medium">
            {s.name}
            {i === highlight && <span className="text-brand-text"> (you)</span>}
          </span>
          <span className="text-sm text-muted-foreground">{s.isLead ? "Lead artist" : s.role === "other" && s.roleNote ? s.roleNote : CONTRIBUTOR_ROLE_LABELS[s.role]}</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">{formatShare(s.basisPoints)}</span>
          <ShareStatusBadge status={s.status} />
        </li>
      ))}
    </ul>
  );
}
