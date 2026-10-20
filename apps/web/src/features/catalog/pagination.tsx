import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { exploreHref, type ExploreParams } from "./params";

/** Previous / next links with "Page 2 of 5". Hidden when everything fits on one page. */
export function Pagination({ params, pages }: { params: ExploreParams; pages: number }) {
  if (pages <= 1 && params.page === 1) return null;
  const link = buttonVariants({ variant: "outline", className: "h-9 gap-1 px-3" });

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {params.page > 1 ? (
        <Link href={exploreHref({ ...params, page: Math.min(params.page - 1, pages) })} rel="prev" className={link}>
          <ChevronLeftIcon aria-hidden="true" /> Newer
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {params.page} of {pages}
      </p>
      {params.page < pages ? (
        <Link href={exploreHref({ ...params, page: params.page + 1 })} rel="next" className={link}>
          Older <ChevronRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
