import Link from "next/link";
import { connection } from "next/server";
import { ArrowRightIcon } from "lucide-react";
import { latestReleases } from "./queries";
import { ReleaseGrid } from "./release-grid";

/** Homepage strip of the newest published releases. Renders nothing until there are any. */
export async function LatestReleases() {
  await connection(); // public pages render fresh per request (decision 015)
  const releases = await latestReleases(4);
  if (releases.length === 0) return null;

  return (
    <section aria-labelledby="latest-heading" className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-text">Fresh from the forge</p>
            <h2 id="latest-heading" className="font-display text-3xl font-bold tracking-tight">
              Latest releases
            </h2>
          </div>
          <Link href="/explore" className="flex items-center gap-1 text-sm font-medium text-brand-text hover:underline">
            Explore all <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ReleaseGrid releases={releases} label="Latest releases" />
      </div>
    </section>
  );
}
