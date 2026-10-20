import Link from "next/link";
import { GENRES, type Genre } from "@ferrel/db/constants";
import { cn } from "cn";
import { genreLabel } from "../releases/labels";
import { exploreHref } from "./params";

/** Genre links for /explore. Choosing a genre always starts at page 1. */
export function GenreFilter({ active }: { active: Genre | null }) {
  const options: (Genre | null)[] = [null, ...GENRES];
  return (
    <nav aria-label="Filter by genre" className="flex flex-wrap gap-1.5">
      {options.map((genre) => {
        const current = genre === active;
        return (
          <Link
            key={genre ?? "all"}
            href={exploreHref({ genre, page: 1 })}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              current ? "border-brand/50 bg-brand/15 font-medium text-brand-text" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {genre ? genreLabel(genre) : "All genres"}
          </Link>
        );
      })}
    </nav>
  );
}
