import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { TrackCover } from "@/components/track/track-cover";
import { parseCreatorSlug, parseTrackSlug } from "@/features/catalog/params";
import { PricePanel } from "@/features/catalog/price-panel";
import { getPublicTrack } from "@/features/catalog/queries";
import { creatorHref } from "@/features/catalog/track-href";
import { genreLabel, keyLabel } from "@/features/releases/labels";

type Params = PageProps<"/creators/[slug]/[track]">["params"];

async function load(params: Params) {
  const { slug, track } = await params;
  const creatorSlug = parseCreatorSlug(slug);
  const trackSlug = parseTrackSlug(track);
  return creatorSlug && trackSlug ? getPublicTrack(creatorSlug, trackSlug) : null;
}

export async function generateMetadata({ params }: PageProps<"/creators/[slug]/[track]">): Promise<Metadata> {
  const track = await load(params);
  // Crawlers get metadata before streaming starts, so this gives them a real 404 status;
  // browsers get the streamed not-found page with a noindex tag (decision 015).
  if (!track) notFound();
  return {
    title: `${track.title} by ${track.artistName} · ferrel-forge`,
    description: track.description?.slice(0, 160) ?? `A limited run of ${track.totalSupply} licenses on ferrel-forge.`,
  };
}

export default function Page({ params }: PageProps<"/creators/[slug]/[track]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="h-[32rem] rounded-3xl border" />}>
        <Release params={params} />
      </Suspense>
    </main>
  );
}

async function Release({ params }: { params: Params }) {
  await connection();
  const track = await load(params);
  if (!track) notFound();

  const details = [
    ["Genre", genreLabel(track.genre)],
    ["BPM", track.bpm ? String(track.bpm) : null],
    ["Key", track.musicalKey ? keyLabel(track.musicalKey) : null],
    ["Copies", track.totalSupply.toLocaleString("en-US")],
    ["Released", track.publishedAt?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) ?? null],
  ].filter((d): d is [string, string] => d[1] !== null);

  return (
    <>
      <Link href={creatorHref(track.creatorSlug)} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> {track.artistName}
      </Link>

      <article className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-12">
        <div className="overflow-hidden rounded-3xl border shadow-2xl shadow-ember/10">
          <TrackCover seed={track.id} title={track.title} className="block" />
        </div>

        <div className="flex min-w-0 animate-rise flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="text-sm font-medium text-brand-text">{genreLabel(track.genre)}</p>
            <h1 className="font-display text-4xl font-bold tracking-tight break-words sm:text-5xl">{track.title}</h1>
            <p className="text-muted-foreground">
              by{" "}
              <Link href={creatorHref(track.creatorSlug)} className="font-medium text-foreground hover:underline">
                {track.artistName}
              </Link>
            </p>
          </header>

          <PricePanel track={track} />

          {track.description && <p className="text-pretty break-words whitespace-pre-line text-muted-foreground">{track.description}</p>}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-5 text-sm sm:grid-cols-3">
            {details.map(([term, value]) => (
              <div key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    </>
  );
}
