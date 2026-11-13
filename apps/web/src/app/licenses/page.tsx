import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2Icon, FileCheckIcon } from "lucide-react";
import { AD_PLATFORM_LABELS, CITIES } from "@ferrel/db/constants";
import { buttonVariants } from "@/components/ui/button";
import { myLicenses, type MyLicense } from "@/features/licensing/service";
import { formatRate, RATE_UNIT } from "@/lib/rate";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "My licenses · ferrel-forge" };

const CITY_NAMES: Record<string, string> = Object.fromEntries(CITIES.map((c) => [c.code, c.name]));
const date = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export default function Page({ searchParams }: PageProps<"/licenses">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">My licenses</h1>
      <Suspense fallback={<div className="h-64 rounded-2xl border bg-card" />}>
        <Licenses searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Licenses({ searchParams }: { searchParams: PageProps<"/licenses">["searchParams"] }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/sign-in?next=%2Flicenses");
  const rows = await myLicenses(user.id);
  const now = new Date();
  const justLicensed = typeof params.new === "string" && rows.some((r) => r.id === params.new);

  if (rows.length === 0) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center">
        <FileCheckIcon className="size-8 text-brand-text" aria-hidden="true" />
        <p className="font-medium">No licenses yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">Find a track for your next ad and license it for the platforms and cities you run in.</p>
        <Link href="/explore" className={buttonVariants({ className: "h-10 px-5" })}>
          Explore music
        </Link>
      </section>
    );
  }

  return (
    <>
      {justLicensed && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm">
          <CheckCircle2Icon className="size-4 text-brand-text" aria-hidden="true" /> Licensed. The rate is locked for the whole term.
        </p>
      )}
      <ul className="flex flex-col gap-3" aria-label={`${rows.length} licenses`}>
        {rows.map((l) => (
          <LicenseCard key={l.id} license={l} now={now} />
        ))}
      </ul>
    </>
  );
}

function LicenseCard({ license: l, now }: { license: MyLicense; now: Date }) {
  const active = l.endsAt > now;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between" data-testid="license-card">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/creators/${l.creatorSlug}/${l.trackSlug}`} className="truncate font-display text-lg font-semibold hover:underline">
          {l.trackTitle}
        </Link>
        <p className="text-sm text-muted-foreground">by {l.artistName}</p>
        <p className="text-sm">{l.platforms.map((p) => AD_PLATFORM_LABELS[p]).join(" · ")}</p>
        <p className="text-sm text-muted-foreground">{l.cities.map((c) => CITY_NAMES[c] ?? c).join(", ")}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:items-end sm:text-right">
        <span className={active ? "text-sm font-medium text-brand-text" : "text-sm text-muted-foreground"}>{active ? "Active" : "Ended"}</span>
        <span className="text-sm tabular-nums">
          {date(l.startsAt)} – {date(l.endsAt)}
        </span>
        <span className="text-sm">
          <span className="font-semibold tabular-nums">{formatRate(l.rateMicros)}</span> <span className="text-muted-foreground">{RATE_UNIT}</span>
        </span>
      </div>
    </li>
  );
}
