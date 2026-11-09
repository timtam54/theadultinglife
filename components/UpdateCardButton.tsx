"use client";

import { useState } from "react";
import { StripeCardDialog } from "@/components/StripeCardDialog";

// "Change card" on the Subscription page — opens the Stripe popup.
export function UpdateCardButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-lg border border-tal-line bg-white text-xs font-medium text-tal-plum hover:bg-tal-cream-soft"
      >
        Change card
      </button>
      {open && <StripeCardDialog mode={{ kind: "update" }} onClose={() => setOpen(false)} />}
    </>
  );
}
