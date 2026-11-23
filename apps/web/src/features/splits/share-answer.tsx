"use client";

// Accept / Decline for a share, either through an invite link's code or from "My splits".
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondByCodeAction, respondToShareAction } from "./actions";
import type { Answer } from "./respond";

type Props = { by: { code: string } | { shareId: string } };

export function ShareAnswer({ by }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (answer: Answer) =>
    startTransition(async () => {
      setError(null);
      const call = "code" in by ? respondByCodeAction(by.code, answer) : respondToShareAction(by.shareId, answer);
      const result = await call.catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
      if (!result.ok) return setError(result.error);
      if ("code" in by) router.push("/splits");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => respond("accept")} disabled={pending} className="h-10 px-5">
          Accept my share
        </Button>
        <Button type="button" variant="outline" onClick={() => respond("decline")} disabled={pending} className="h-10 px-5">
          Decline
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
