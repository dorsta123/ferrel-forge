"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeReturnTo } from "@/lib/return-to";

/** "Sign up" / "Sign in" link that keeps where to return to afterwards. */
export function AuthSwitchLink({ to, children }: { to: "/sign-in" | "/sign-up"; children: React.ReactNode }) {
  const next = safeReturnTo(useSearchParams().get("next"));
  return (
    <Link href={next === "/" ? to : `${to}?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4 hover:text-brand-text">
      {children}
    </Link>
  );
}
