import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/session";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="ferrel-forge home" className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/explore" className="font-medium text-foreground transition-colors hover:text-brand-text">
              Explore
            </Link>
            <Link href="/#how" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="/#creators" className="transition-colors hover:text-foreground">
              For creators
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {/* The session read streams in; the rest of the header is static. */}
          <Suspense fallback={<div className="h-9 w-32" />}>
            <UserNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function UserNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
        <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants({ className: "font-semibold" })}>
          Sign up
        </Link>
      </nav>
    );
  }

  const isCreator = user.creator !== null;
  return (
    <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
      <Link
        href={isCreator ? "/dashboard" : "/become-creator"}
        className={buttonVariants({ variant: "ghost", className: "hidden sm:inline-flex" })}
      >
        {isCreator ? "Dashboard" : "Become a creator"}
      </Link>
      <UserMenu name={user.name} email={user.email} isCreator={isCreator} />
    </nav>
  );
}
