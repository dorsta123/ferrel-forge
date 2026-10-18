import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { creatorProfiles, db, eq } from "@ferrel/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Dashboard · ferrel-forge" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-64" />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // Creators only. Checked here on the server, next to the data, not in the header.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.creator) return <CreatorsOnly />;

  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, user.id)).limit(1);
  if (!profile) return <CreatorsOnly />; // deleted between the two reads

  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Creator dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">{profile.artistName}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            Created{" "}
            {profile.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr] sm:gap-y-4 [&>dd]:mb-3 sm:[&>dd]:mb-0">
            <dt className="text-muted-foreground">Artist name</dt>
            <dd className="font-medium">{profile.artistName}</dd>
            <dt className="text-muted-foreground">Profile URL</dt>
            <dd className="font-medium break-all">ferrel-forge.com/creators/{profile.slug}</dd>
            <dt className="text-muted-foreground">Bio</dt>
            <dd className="whitespace-pre-line">{profile.bio || <span className="text-muted-foreground">No bio yet.</span>}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your tracks</CardTitle>
          <CardDescription>Uploading and listing tracks arrives in the next phase.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

function CreatorsOnly() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>This page is for creators</CardTitle>
        <CardDescription>Set up an artist profile to list your tracks and see your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/become-creator" className={buttonVariants({ className: "w-full" })}>
          Become a creator
        </Link>
      </CardContent>
    </Card>
  );
}
