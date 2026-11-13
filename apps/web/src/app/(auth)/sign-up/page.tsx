import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthSwitchLink } from "@/components/auth/switch-link";

export const metadata = { title: "Create an account · ferrel-forge" };

export default function Page({ searchParams }: PageProps<"/sign-up">) {
  return (
    <div className="flex animate-rise flex-col gap-8">
      <Suspense>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Buy licenses now. Become a creator any time.</p>
      </div>
      {/* Reads ?next= (where to return to), so it renders per request. */}
      <Suspense fallback={<div className="h-72" />}>
        <SignUpForm />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Suspense fallback={<span>Sign in</span>}>
          <AuthSwitchLink to="/sign-in">Sign in</AuthSwitchLink>
        </Suspense>
      </p>
    </div>
  );
}
