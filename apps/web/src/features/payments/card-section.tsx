"use client";

// "Payment card" on the license page: the saved card, or a way to add one (Stripe test mode or simulated).
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CreditCardIcon } from "lucide-react";
import { CARD_BRAND_LABELS } from "@ferrel/db/constants";
import { Button } from "@/components/ui/button";
import { saveSimulatedCardAction, startCardSetupAction } from "./actions";
import type { SavedCard } from "./service";

// Stripe's code is only downloaded once someone opens its card form.
const StripeCardForm = dynamic(() => import("./stripe-card-form").then((m) => m.StripeCardForm), { ssr: false });

type Props = { card: SavedCard | null; mode: "stripe" | "simulated" };

export function CardSection({ card, mode }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ clientSecret: string; publishableKey: string } | null>(null);

  const saved = () => {
    setSetup(null);
    router.refresh();
  };
  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) saved();
      else setError(result.error);
    });
  const startStripe = () =>
    startTransition(async () => {
      setError(null);
      const result = await startCardSetupAction();
      if (result.ok) setSetup({ clientSecret: result.clientSecret, publishableKey: result.publishableKey });
      else setError(result.error);
    });

  return (
    <section aria-labelledby="card-heading" className="flex flex-col gap-3 rounded-2xl border bg-card p-5" data-testid="card-section">
      <h2 id="card-heading" className="font-display text-lg font-semibold">
        Payment card
      </h2>
      <p className="text-sm text-muted-foreground">You pay monthly for the exposure your ads get. Nothing is charged now.</p>

      {card && !setup && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-sm font-medium" data-testid="saved-card">
            <CreditCardIcon className="size-4 text-brand-text" aria-hidden="true" />
            {CARD_BRAND_LABELS[card.brand] ?? "Card"} ending {card.last4}
          </p>
          {card.provider === "simulated" && <SimulatedBadge />}
          {mode === "stripe" && (
            <Button type="button" variant="outline" onClick={startStripe} disabled={pending} className="h-9 px-4">
              Change card
            </Button>
          )}
        </div>
      )}

      {!card && mode === "simulated" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <SimulatedBadge /> No Stripe account is connected to this server, so a pretend card stands in. No money moves.
          </p>
          <Button type="button" onClick={() => run(saveSimulatedCardAction)} disabled={pending} className="h-10 w-fit px-5">
            Add simulated test card
          </Button>
        </div>
      )}

      {!card && mode === "stripe" && !setup && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Stripe test mode: use card <span className="font-mono">4242 4242 4242 4242</span>, any future date and any CVC. No real money moves.
          </p>
          <Button type="button" onClick={startStripe} disabled={pending} className="h-10 w-fit px-5">
            Add a card
          </Button>
        </div>
      )}

      {setup && <StripeCardForm clientSecret={setup.clientSecret} publishableKey={setup.publishableKey} onSaved={saved} />}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function SimulatedBadge() {
  return <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-text">Simulated</span>;
}
