import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { parseCreatorSlug } from "@/features/catalog/params";
import { creatorReleases, getPublicCreator } from "@/features/catalog/queries";
import { ReleaseGrid } from "@/features/catalog/release-grid";

export async function generateMetadata({ params }: PageProps<"/creators/[slug]">): Promise<Metadata> {
  const slug = parseCreatorSlug((await params).slug);
  const creator = slug ? await getPublicCreator(slug) : null;
  // Crawlers get metadata before streaming starts, so this gives them a real 404 status;
  // browsers get the streamed not-found page with a noindex tag (decision 015).
  if (!creator) notFound();
  return { title: `${creator.artistName} · ferrel-forge`, description: creator.bio ?? `Tracks by ${creator.artistName}, available to license for ads.` };
}

export default function Page({ params }: PageProps<"/creators/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<div className="mx-auto h-96 max-w-6xl" />}>
        <CreatorProfile params={params} />
      </Suspense>
    </main>
  );
}

async function CreatorProfile({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const slug = parseCreatorSlug((await params).slug);
  const creator = slug ? await getPublicCreator(slug) : null;
  if (!creator) notFound();
  const releases = await creatorReleases(creator.userId);

  return (
    <>
      <section className="grain ember-glow border-b">
        <div className="mx-auto flex max-w-6xl animate-rise flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <Avatar name={creator.artistName} className="size-20 text-2xl sm:size-24 sm:text-3xl" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm text-muted-foreground">Creator</p>
            <h1 className="font-display text-4xl font-bold tracking-tight break-words">{creator.artistName}</h1>
            {creator.bio && <p className="max-w-2xl text-pretty whitespace-pre-line text-muted-foreground">{creator.bio}</p>}
          </div>
        </div>
      </section>
      <section aria-labelledby="releases-heading" className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6">
        <h2 id="releases-heading" className="font-display text-2xl font-semibold">
          Releases <span className="text-base font-normal text-muted-foreground tabular-nums">{releases.length}</span>
        </h2>
        {releases.length > 0 ? (
          <ReleaseGrid releases={releases} label={`Releases by ${creator.artistName}`} />
        ) : (
          <p className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">No releases yet.</p>
        )}
      </section>
    </>
  );
}
