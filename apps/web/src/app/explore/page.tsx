import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompassIcon } from "lucide-react";
import { GenreFilter } from "@/features/catalog/genre-filter";
import { Pagination } from "@/features/catalog/pagination";
import { exploreHref, pageCount, parseExploreParams } from "@/features/catalog/params";
import { explorePage } from "@/features/catalog/queries";
import { ReleaseGrid } from "@/features/catalog/release-grid";
import { genreLabel } from "@/features/releases/labels";
import { formatCount } from "@/lib/format-number";

export const metadata = {
  title: "Explore · ferrel-forge",
  description: "Tracks you can license for Instagram, TikTok and YouTube ads, paying for the exposure they get.",
};

export default function Page({ searchParams }: PageProps<"/explore">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex max-w-2xl animate-rise flex-col gap-2">
        <p className="text-sm font-medium text-brand-text">Marketplace</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Explore releases</h1>
        <p className="text-pretty text-muted-foreground">
          Tracks you can license for your Instagram, TikTok and YouTube ads. You pay for the exposure they get.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 rounded-2xl border border-dashed" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  await connection();
  const params = parseExploreParams(await searchParams);
  const { rows, total } = await explorePage(params);
  const pages = pageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <GenreFilter active={params.genre} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? "No releases" : `${formatCount(total)} release${total === 1 ? "" : "s"}`}
        {params.genre && ` in ${genreLabel(params.genre)}`}
      </p>
      {rows.length > 0 ? (
        <ReleaseGrid releases={rows} label="Releases" />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <CompassIcon className="size-8 text-brand-text" aria-hidden="true" />
          <p className="font-display text-lg font-semibold">
            {params.page > pages ? "This page is empty" : params.genre ? `No ${genreLabel(params.genre)} releases yet` : "No releases yet"}
          </p>
          <Link href={exploreHref({ genre: params.page > pages ? params.genre : null, page: 1 })} className="text-sm font-medium text-brand-text hover:underline">
            {params.page > pages ? "Back to the first page" : params.genre ? "See all genres" : "Become a creator and release the first one"}
          </Link>
        </div>
      )}
      <Pagination params={params} pages={pages} />
    </div>
  );
}
