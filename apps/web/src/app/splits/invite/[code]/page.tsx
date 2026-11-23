import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { UsersIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getInvite } from "@/features/splits/respond";
import { formatShare } from "@/features/splits/rules";
import { ShareAnswer } from "@/features/splits/share-answer";
import { SplitTable } from "@/features/splits/split-table";
import { getCurrentUser } from "@/lib/session";

// The code in the URL is a secret: never indexed, never sent on as a referrer.
export const metadata = { title: "Your share · ferrel-forge", robots: { index: false }, referrer: "no-referrer" as const };

export default function Page({ params }: PageProps<"/splits/invite/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="h-96 rounded-2xl border bg-card" />}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/splits/invite/[code]">["params"] }) {
  await connection();
  const { code } = await params;
  // Answering needs an account: sign in or up, then come straight back here.
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/splits/invite/${code}`)}`);
  const result = await getInvite(user.id, code);

  if (!result.ok) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-6">
        <p role="alert">{result.error}</p>
        <Link href="/splits" className={buttonVariants({ variant: "outline", className: "h-10 px-5" })}>
          My splits
        </Link>
      </section>
    );
  }

  const { invite } = result;
  const you = invite.shares.findIndex((s) => s.name === invite.share.name);
  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-text">
          <UsersIcon className="size-4" aria-hidden="true" /> You&rsquo;re invited to a split
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight break-words">{invite.trackTitle}</h1>
        <p className="text-muted-foreground">by {invite.artistName}</p>
      </header>
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
        <p>
          {invite.artistName} lists you as <span className="font-semibold">{invite.share.name}</span>, with a share of{" "}
          <span className="font-semibold tabular-nums" data-testid="invite-share">
            {formatShare(invite.share.basisPoints)}
          </span>{" "}
          of what this track earns from licenses.
        </p>
        <SplitTable shares={invite.shares} highlight={you} />
        <p className="text-sm text-muted-foreground">
          The track can be licensed once everyone accepts. Each license keeps this split for its whole term. During testing no real money moves.
        </p>
        <ShareAnswer by={{ code }} />
      </section>
    </>
  );
}
