"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signOut();
    router.push("/");
    router.refresh(); // re-render server components (the header) without the session
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
