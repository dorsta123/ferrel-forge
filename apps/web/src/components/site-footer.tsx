import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Limited-run music licenses, priced by how many copies remain.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium">Explore</span>
            <Link href="/#how" className="text-muted-foreground hover:text-foreground">How it works</Link>
            <Link href="/#creators" className="text-muted-foreground hover:text-foreground">For creators</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium">Account</span>
            <Link href="/sign-up" className="text-muted-foreground hover:text-foreground">Sign up</Link>
            <Link href="/become-creator" className="text-muted-foreground hover:text-foreground">Become a creator</Link>
          </div>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Non-commercial project · checkout will run in Stripe test mode, so no real money ever moves.
        </p>
      </div>
    </footer>
  );
}
