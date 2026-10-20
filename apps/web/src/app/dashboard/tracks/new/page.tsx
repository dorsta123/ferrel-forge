import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { createRelease } from "@/features/releases/actions";
import { NEW_RELEASE_VALUES } from "@/features/releases/form-values";
import { ReleaseForm } from "@/features/releases/release-form";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "New release · ferrel-forge" };

const NO_LOCKS = { readOnly: false, slug: false, sale: false };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Dashboard
      </Link>
      <header className="flex animate-rise flex-col gap-2">
        <p className="text-sm font-medium text-brand-text">New release</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Forge a new release</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Set the details and the limited run. It stays a private draft until you upload the audio and publish.
        </p>
      </header>
      <Suspense fallback={<div className="h-[36rem] rounded-2xl border bg-card" />}>
        <NewRelease />
      </Suspense>
    </main>
  );
}

async function NewRelease() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.creator) redirect("/become-creator");

  return (
    <ReleaseForm
      mode="create"
      action={createRelease}
      initial={NEW_RELEASE_VALUES}
      locks={NO_LOCKS}
      creatorSlug={user.creator.slug}
      artistName={user.creator.artistName}
      coverSeed="new-release"
      copiesSold={0}
    />
  );
}
