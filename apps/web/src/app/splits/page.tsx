import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UsersIcon } from "lucide-react";
import { CONTRIBUTOR_ROLE_LABELS } from "@ferrel/db/constants";
import { mySplits, type MySplit } from "@/features/splits/respond";
import { formatShare } from "@/features/splits/rules";
import { ShareAnswer } from "@/features/splits/share-answer";
import { ShareStatusBadge } from "@/features/splits/share-status-badge";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "My splits · ferrel-forge" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">My splits</h1>
        <p className="text-muted-foreground">Tracks you helped make, and your share of what they earn.</p>
      </div>
      <Suspense fallback={<div className="h-64 rounded-2xl border bg-card" />}>
        <Splits />
      </Suspense>
    </main>
  );
}

async function Splits() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fsplits");
  const rows = await mySplits(user.id);

  if (rows.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
        <UsersIcon className="size-8 text-brand-text" aria-hidden="true" />
        <p className="font-medium">No splits yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">When an artist adds you to a track, open the invite link they send you to accept your share.</p>
      </section>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label={`${rows.length} splits`}>
      {rows.map((s) => (
        <SplitCard key={s.shareId} split={s} />
      ))}
    </ul>
  );
}

function SplitCard({ split: s }: { split: MySplit }) {
  const title =
    s.trackStatus === "draft" ? (
      <span className="font-display text-lg font-semibold">{s.trackTitle}</span>
    ) : (
      <Link href={`/creators/${s.creatorSlug}/${s.trackSlug}`} className="font-display text-lg font-semibold hover:underline">
        {s.trackTitle}
      </Link>
    );
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-5" data-testid="my-split">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {title}
          <p className="text-sm text-muted-foreground">
            by {s.artistName} · {s.isLead ? "Lead artist" : s.role === "other" && s.roleNote ? s.roleNote : CONTRIBUTOR_ROLE_LABELS[s.role]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums">{formatShare(s.basisPoints)}</span>
          <ShareStatusBadge status={s.status} />
        </div>
      </div>
      {s.status === "pending" && <ShareAnswer by={{ shareId: s.shareId }} />}
    </li>
  );
}
