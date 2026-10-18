import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in · ferrel-forge" };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to ferrel-forge.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Don&apos;t have an account?&nbsp;
          <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
