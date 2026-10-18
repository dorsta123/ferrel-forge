import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/session";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
          ferrel-forge
        </Link>
        {/* The session read streams in; the rest of the header is static. */}
        <Suspense fallback={<div className="h-8 w-40" />}>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}

async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-2">
        <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants()}>
          Sign up
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2 sm:gap-3">
      {user.creator ? (
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
          Dashboard
        </Link>
      ) : (
        <Link href="/become-creator" className={buttonVariants({ variant: "ghost" })}>
          Become a creator
        </Link>
      )}
      <span className="hidden text-sm whitespace-nowrap text-muted-foreground sm:inline">
        Hi, <span className="font-medium text-foreground">{user.name}</span>
      </span>
      <SignOutButton />
    </nav>
  );
}
