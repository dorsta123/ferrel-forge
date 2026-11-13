"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/components/auth/auth-errors";
import { safeReturnTo } from "@/lib/return-to";
import { signIn } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  // Back to where they came from (e.g. a license page), only ever a path on this site.
  const next = safeReturnTo(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) return setError("Enter your email and password.");

    setError(null);
    setPending(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setPending(false);
      return setError(authErrorMessage(error));
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input className="h-10" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input className="h-10" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-10 w-full font-semibold">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
