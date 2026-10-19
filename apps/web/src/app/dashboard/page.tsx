import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DiscAlbumIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { creatorProfiles, db, eq } from "@ferrel/db";
import { Avatar } from "@/components/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Dashboard · ferrel-forge" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="h-72 rounded-2xl border bg-card" />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // Creators only. Checked here on the server, next to the data, not in the header.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.creator) return <CreatorsOnly />;

  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, user.id)).limit(1);
  if (!profile) return <CreatorsOnly />; // deleted between the two reads

  const since = profile.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      {/* Banner */}
      <section className="grain ember-glow animate-rise overflow-hidden rounded-3xl border bg-card">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <Avatar name={profile.artistName} className="size-16 text-xl sm:size-20 sm:text-2xl" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Creator dashboard</p>
              <h1 className="truncate font-display text-3xl font-bold tracking-tight sm:text-4xl">{profile.artistName}</h1>
              <p className="mt-1 font-mono text-xs break-words text-muted-foreground">ferrel-forge.com/creators/{profile.slug}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Creator since {since}</p>
        </div>
      </section>

      {/* Stats: real values, all zero until listings exist */}
      <section aria-label="Stats" className="grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Tracks listed" value="0" />
        <Stat label="Copies sold" value="0" />
        <Stat label="Earnings" value="$0.00" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Tracks empty state */}
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-text">
            <DiscAlbumIcon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold">Your tracks</h2>
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              No tracks yet. Uploading and listing tracks arrives in the next phase.
            </p>
          </div>
          <Button disabled className="gap-2">
            <UploadIcon aria-hidden="true" />
            Upload a track
            <span className="rounded-full bg-primary-foreground/15 px-1.5 text-[10px] uppercase">Soon</span>
          </Button>
        </section>

        {/* Profile details */}
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Your profile</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Artist name</dt>
              <dd className="font-medium">{profile.artistName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Profile URL</dt>
              <dd className="font-mono text-xs break-words">ferrel-forge.com/creators/{profile.slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bio</dt>
              <dd className="whitespace-pre-line">{profile.bio || <span className="text-muted-foreground">No bio yet.</span>}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-3 sm:p-5">
      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
      <span className="text-xl font-semibold tracking-tight sm:text-3xl">{value}</span>
    </div>
  );
}

function CreatorsOnly() {
  return (
    <section className="grain ember-glow mx-auto mt-6 flex w-full max-w-lg flex-col items-center gap-5 overflow-hidden rounded-3xl border bg-card px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-text">
        <SparklesIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">This page is for creators</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          Set up an artist profile to list your tracks and see your dashboard.
        </p>
      </div>
      <Link href="/become-creator" className={buttonVariants({ className: "h-10 px-5 font-semibold" })}>
        Become a creator
      </Link>
    </section>
  );
}
