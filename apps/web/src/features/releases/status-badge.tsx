import type { TrackStatus } from "@ferrel/db/constants";
import { cn } from "cn";

const STYLES: Record<TrackStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  published: { label: "Published", className: "bg-brand/15 text-brand-text" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: TrackStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span data-testid="status-badge" className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
