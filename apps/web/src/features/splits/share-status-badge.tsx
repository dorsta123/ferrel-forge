import { cn } from "cn";
import type { ShareStatus } from "@ferrel/db/constants";

const LABEL: Record<ShareStatus, string> = { pending: "Waiting", accepted: "Accepted", declined: "Declined" };
const STYLE: Record<ShareStatus, string> = {
  pending: "border-border text-muted-foreground",
  accepted: "border-brand/40 bg-brand/10 text-brand-text",
  declined: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function ShareStatusBadge({ status }: { status: ShareStatus }) {
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", STYLE[status])}>{LABEL[status]}</span>;
}
