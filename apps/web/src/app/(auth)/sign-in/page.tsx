import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthSwitchLink } from "@/components/auth/switch-link";

export const metadata = { title: "Sign in · ferrel-forge" };

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return (
    <div className="flex animate-rise flex-col gap-8">
      <Suspense>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your ferrel-forge account.</p>
      </div>
      {/* Reads ?next= (where to return to), so it renders per request. */}
      <Suspense fallback={<div className="h-52" />}>
        <SignInForm />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Suspense fallback={<span>Sign up</span>}>
          <AuthSwitchLink to="/sign-up">Sign up</AuthSwitchLink>
        </Suspense>
      </p>
    </div>
  );
}
