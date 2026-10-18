import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create an account · ferrel-forge" };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Buy licenses now. Become a creator any time.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Already have an account?&nbsp;
          <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
