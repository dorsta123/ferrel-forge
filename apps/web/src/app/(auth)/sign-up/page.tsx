import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create an account · ferrel-forge" };

export default function Page() {
  return (
    <div className="flex animate-rise flex-col gap-8">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Buy licenses now. Become a creator any time.</p>
      </div>
      <SignUpForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4 hover:text-brand-text">
          Sign in
        </Link>
      </p>
    </div>
  );
}
