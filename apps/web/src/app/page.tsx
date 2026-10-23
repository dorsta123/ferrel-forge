import Link from "next/link";
import { Suspense } from "react";
import { DiscAlbumIcon, GaugeIcon, HandCoinsIcon, MegaphoneIcon } from "lucide-react";
import { Waveform } from "@/components/brand/waveform";
import { ExposureExample } from "@/components/home/exposure-example";
import { buttonVariants } from "@/components/ui/button";
import { LatestReleases } from "@/features/catalog/latest-releases";

// How the product works (decisions 016–019). Wording only: no prices, because
// rates aren't decided yet (PRODUCT.md question 15).
const STEPS = [
  {
    icon: DiscAlbumIcon,
    title: "Artists list tracks",
    body: "Upload a track, set a base rate, and agree how earnings split between everyone who made it.",
  },
  {
    icon: MegaphoneIcon,
    title: "Advertisers license them",
    body: "Pick a track for an Instagram, TikTok or YouTube ad. The rate is fixed for the whole license.",
  },
  {
    icon: GaugeIcon,
    title: "Exposure is measured",
    body: "We read the ad's stats (views × seconds watched) and never touch the ad itself.",
  },
  {
    icon: HandCoinsIcon,
    title: "Everyone gets paid",
    body: "A monthly bill for the real exposure, split automatically between every contributor by their agreed share.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="grain ember-glow overflow-hidden border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex animate-rise flex-col gap-6">
            <span className="w-fit rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Music licensing for ads
            </span>
            <h1 className="font-display text-5xl leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Pay for the music people actually <span className="text-molten">hear</span>.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              License tracks from independent artists for your Instagram, TikTok and YouTube ads. You pay each month for
              the exposure your ad gets, and everyone who made the track is paid their share automatically.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/explore" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base font-semibold" })}>
                Explore tracks
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
            <Waveform className="mb-6 h-20" />
            <ExposureExample />
          </div>
        </div>
      </section>

      {/* Newest real releases; streams in, renders nothing while the marketplace is empty. */}
      <Suspense fallback={null}>
        <LatestReleases />
      </Suspense>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-medium text-brand-text">How it works</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-balance">Priced by reach, not a guess.</h2>
            <p className="text-pretty text-muted-foreground">
              A flat fee ignores whether an ad takes off. Here the bill follows the exposure, so a quiet local campaign
              costs little and a viral one pays the artists more.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="mt-6 text-xs text-muted-foreground">
            A non-commercial project: ad platforms are simulated and payments run in Stripe test mode. Licensing opens soon.
          </p>
        </div>
      </section>

      {/* Audiences */}
      <section id="creators" className="scroll-mt-20 border-b">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-20 sm:px-6 md:grid-cols-2">
          <Audience
            eyebrow="For creators"
            title="Paid for every second you're heard."
            points={[
              "Upload a track and set your base rate.",
              "Split earnings with everyone who made it, paid automatically.",
              "A public profile page for your releases.",
            ]}
            cta={{ href: "/become-creator", label: "Become a creator" }}
            featured
          />
          <Audience
            eyebrow="For advertisers"
            title="Pay for reach, not a flat fee."
            points={[
              "License tracks for Instagram, TikTok and YouTube ads.",
              "Pay monthly for real exposure: views × seconds watched.",
              "Your rate stays fixed for the whole license.",
            ]}
            cta={{ href: "/explore", label: "Explore tracks" }}
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="grain ember-glow overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Ready to put your music in front of an audience?
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
