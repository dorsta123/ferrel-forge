import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in · ferrel-forge" };

export default function Page() {
  return (
    <div className="flex animate-rise flex-col gap-8">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your ferrel-forge account.</p>
      </div>
      <SignInForm />
      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4 hover:text-brand-text">
          Sign up
        </Link>
      </p>
    </div>
  );
}
