import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { AudioUploadField } from "@/features/audio-upload/audio-upload-field";
import { trackHref } from "@/features/catalog/track-href";
import { updateRelease } from "@/features/releases/actions";
import { releaseFormValues } from "@/features/releases/form-values";
import { ReleaseActions } from "@/features/releases/release-actions";
import { ReleaseForm } from "@/features/releases/release-form";
import { StatusBadge } from "@/features/releases/status-badge";
import { releaseFacts, releaseLocks } from "@/features/releases/status";
import { getOwnedTrack } from "@/features/tracks/track-access";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Edit release · ferrel-forge" };

export default function Page({ params }: PageProps<"/dashboard/tracks/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Dashboard
      </Link>
      <Suspense fallback={<div className="h-[40rem] rounded-2xl border bg-card" />}>
        <TrackEditor params={params} />
      </Suspense>
    </main>
  );
}

async function TrackEditor({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect("/sign-in");
  // Owner-only: anyone else (including other creators) gets "not found".
  const track = user.creator ? await getOwnedTrack(user.id, id) : null;
  if (!track || !user.creator) notFound();

  const facts = releaseFacts(track);
  const current = track.audioFormat && track.audioSizeBytes ? { format: track.audioFormat, sizeBytes: track.audioSizeBytes } : null;

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <StatusBadge status={track.status} />
          <h1 className="font-display text-3xl font-bold tracking-tight break-words sm:text-4xl">{track.title}</h1>
          {track.status === "draft" ? (
            <p className="font-mono text-xs break-all text-muted-foreground">
              /creators/{user.creator.slug}/{track.slug}
            </p>
          ) : (
            <Link
              href={trackHref({ creatorSlug: user.creator.slug, slug: track.slug })}
              className="flex w-fit items-center gap-1 font-mono text-xs break-all text-brand-text hover:underline"
            >
              /creators/{user.creator.slug}/{track.slug}
              <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">(view public page)</span>
            </Link>
          )}
        </div>
        <div className="sm:w-80 sm:shrink-0">
          <ReleaseActions trackId={track.id} facts={facts} />
        </div>
      </header>

      <section aria-labelledby="audio-heading" className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
        <div>
          <h2 id="audio-heading" className="font-display text-lg font-semibold">
            Audio
          </h2>
          <p className="text-sm text-muted-foreground">The full-quality master. It stays private; licensed advertisers get it once licensing opens.</p>
        </div>
        <AudioUploadField trackId={track.id} current={current} editable={track.status === "draft"} />
      </section>

      <section aria-labelledby="details-heading" className="flex flex-col gap-4">
        <h2 id="details-heading" className="font-display text-lg font-semibold">
          Details
        </h2>
        <ReleaseForm
          mode="edit"
          action={updateRelease.bind(null, track.id)}
          initial={releaseFormValues(track)}
          locks={releaseLocks(facts)}
          creatorSlug={user.creator.slug}
          artistName={user.creator.artistName}
          coverSeed={track.id}
          durationMs={track.durationMs}
        />
      </section>
    </>
  );
}
