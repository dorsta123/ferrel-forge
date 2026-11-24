"use client";

// Stripe's own card form (test mode). Card numbers go straight from this form to Stripe.
import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
// "/pure": Stripe.js loads only when this form opens, never on import (no Stripe calls in simulated mode).
import { loadStripe } from "@stripe/stripe-js/pure";
import { Button } from "@/components/ui/button";
import { finishCardSetupAction } from "./actions";

type Props = { publishableKey: string; clientSecret: string; onSaved: () => void };

export function StripeCardForm({ publishableKey, clientSecret, onSaved }: Props) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <CardFields onSaved={onSaved} />
    </Elements>
  );
}

function CardFields({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      const result = stripeError || !setupIntent ? { ok: false as const, error: stripeError?.message ?? "We couldn't save that card." } : await finishCardSetupAction(setupIntent.id);
      if (result.ok) onSaved();
      else setError(result.error);
    } catch {
      setError("We couldn't save that card. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PaymentElement />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" onClick={save} disabled={!stripe || pending} className="h-10 w-fit px-5">
        {pending ? "Saving…" : "Save card"}
      </Button>
    </div>
  );
}
