import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheckIcon, DiscAlbumIcon, TrendingUpIcon } from "lucide-react";
import { quotePrice } from "@ferrel/pricing";
import { Waveform } from "@/components/brand/waveform";
import { PriceCurve } from "@/components/price-curve";
import { buttonVariants } from "@/components/ui/button";
import { LatestReleases } from "@/features/catalog/latest-releases";

const STEPS = [
  {
    icon: DiscAlbumIcon,
    title: "Creators release a limited run",
    body: "Each track gets a fixed number of license copies and a starting price. When they're gone, they're gone.",
  },
  {
    icon: TrendingUpIcon,
    title: "Every sale raises the price",
    body: "The fewer copies left, the more the next one costs. Early supporters pay the least.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Buyers own a real license",
    body: "Each purchase is a numbered license tied to your account, separate from the audio file itself.",
  },
];

// Real engine output for the hero stat strip.
const first = quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 100 });
const last = quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 1 });

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="grain ember-glow overflow-hidden border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex animate-rise flex-col gap-6">
            <span className="w-fit rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Limited-edition music licenses
            </span>
            <h1 className="font-display text-5xl leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Music that gets <span className="text-molten">rarer</span> as it sells.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Creators release a fixed number of licenses for every track. Each sale makes the next copy cost a
              little more, so the earliest fans pay the least.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base font-semibold" })}>
                Get started
              </Link>
              <Link
                href="/become-creator"
                className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 border-foreground/15 px-5 text-base" })}
              >
                Become a creator
              </Link>
            </div>
          </div>

          <div className="relative rounded-3xl border bg-card/70 p-6 shadow-2xl shadow-ember/10 backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center justify-between text-sm">
              <span className="font-medium">Example release · 100 copies</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">demo</span>
            </div>
            <Waveform className="h-40" />
            <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-sm">
              <div>
                <p className="text-muted-foreground">First copy</p>
                <p className="text-2xl font-semibold">${(first / 100).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Last copy</p>
                <p className="text-2xl font-semibold text-brand-text">${(last / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newest real releases; streams in, renders nothing while the marketplace is empty. */}
      <Suspense fallback={null}>
        <LatestReleases />
      </Suspense>

      {/* Pricing demo */}
      <section id="how" className="scroll-mt-20 border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-brand-text">How pricing works</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-balance">Watch the price move.</h2>
            <p className="text-pretty text-muted-foreground">
              Drag the slider to sell copies of a 100-copy release that starts at $10. This chart runs the same pricing
              engine the marketplace uses, so what you see is exactly how prices will behave.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-5 sm:p-8">
            <PriceCurve />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-10 font-display text-3xl font-bold tracking-tight">Three steps, no surprises.</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand-text">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audiences */}
      <section id="creators" className="scroll-mt-20 border-b">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-20 sm:px-6 md:grid-cols-2">
          <Audience
            eyebrow="For creators"
            title="Turn demand into value."
            points={[
              "Choose how many copies exist and where the price starts.",
              "Every sale lifts the price of what's left.",
              "A public profile page for your releases.",
            ]}
            cta={{ href: "/become-creator", label: "Become a creator" }}
            featured
          />
          <Audience
            eyebrow="For buyers"
            title="Get in early, pay less."
            points={[
              "See the full price curve before you buy.",
              "A license that's yours, with a fixed copy number.",
              "One account to buy from every creator.",
            ]}
            cta={{ href: "/sign-up", label: "Create an account" }}
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="grain ember-glow overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Ready to forge your first release?
          </h2>
          <Link href="/become-creator" className={buttonVariants({ size: "lg", className: "h-11 px-6 text-base font-semibold" })}>
            Become a creator
          </Link>
        </div>
      </section>
    </main>
  );
}

function Audience({
  eyebrow,
  title,
  points,
  cta,
  featured = false,
}: {
  eyebrow: string;
  title: string;
  points: string[];
  cta: { href: string; label: string };
  featured?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-5 rounded-2xl border p-8 ${featured ? "grain ember-glow bg-card" : "bg-card"}`}>
      <p className="text-sm font-medium text-brand-text">{eyebrow}</p>
      <h3 className="font-display text-3xl font-bold tracking-tight">{title}</h3>
      <ul className="flex flex-col gap-3 text-sm">
        {points.map((p) => (
          <li key={p} className="flex gap-3">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
            <span className="text-muted-foreground">{p}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={buttonVariants({ variant: featured ? "default" : "outline", className: "mt-auto w-fit border-foreground/15 font-semibold" })}
      >
        {cta.label}
      </Link>
    </div>
  );
}
