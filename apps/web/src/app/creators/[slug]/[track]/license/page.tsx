import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { parseCreatorSlug, parseTrackSlug } from "@/features/catalog/params";
import { getPublicTrack } from "@/features/catalog/queries";
import { LicenseForm } from "@/features/licensing/license-form";
import { licenseOffer } from "@/features/licensing/service";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "License a track · ferrel-forge", robots: { index: false } };

export default function Page({ params }: PageProps<"/creators/[slug]/[track]/license">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="h-[40rem] rounded-2xl border bg-card" />}>
        <License params={params} />
      </Suspense>
    </main>
  );
}

async function License({ params }: { params: PageProps<"/creators/[slug]/[track]/license">["params"] }) {
  await connection();
  const { slug, track: trackParam } = await params;
  const creatorSlug = parseCreatorSlug(slug);
  const trackSlug = parseTrackSlug(trackParam);
  const track = creatorSlug && trackSlug ? await getPublicTrack(creatorSlug, trackSlug) : null;
  if (!track) notFound();

  const releaseHref = `/creators/${track.creatorSlug}/${track.slug}`;
  // Licensing needs an account: sign in or up, then come straight back here.
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`${releaseHref}/license`)}`);
  const offer = await licenseOffer(user.id, track.id);

  return (
    <>
      <Link href={releaseHref} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> {track.title}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-brand-text">License for your ads</p>
        <h1 className="font-display text-3xl font-bold tracking-tight break-words">{track.title}</h1>
        <p className="text-muted-foreground">by {track.artistName}</p>
      </header>
      {offer.ok ? (
        <LicenseForm trackId={track.id} rateMicros={offer.rateMicros} needsBilling={offer.needsBilling} />
      ) : (
        <p role="alert" className="rounded-2xl border bg-card p-5 text-sm">
          {offer.error}
        </p>
      )}
    </>
  );
}
