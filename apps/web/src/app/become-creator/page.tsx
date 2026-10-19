import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { BecomeCreatorForm } from "./become-creator-form";

export const metadata = { title: "Become a creator · ferrel-forge" };

export default function Page() {
  return (
    <main className="grain ember-glow flex-1">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16">
        <header className="flex max-w-2xl animate-rise flex-col gap-3">
          <p className="text-sm font-medium text-brand-text">Creator setup</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-balance">Become a creator</h1>
          <p className="text-pretty text-muted-foreground">
            Set up your artist profile to start listing tracks. You can still buy as usual.
          </p>
        </header>
        <Suspense fallback={<div className="h-[32rem] rounded-2xl border bg-card" />}>
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.creator) redirect("/dashboard");
  return <BecomeCreatorForm />;
}
