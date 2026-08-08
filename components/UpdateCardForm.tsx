"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{
    status: "OK" | "Invalid" | string;
    token?: string;
    errors?: { message: string }[];
  }>;
  destroy: () => Promise<void>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}

const scriptSrc =
  (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "sandbox") === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

export function UpdateCardForm() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "done" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const cardRef = useRef<SquareCard | null>(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  useEffect(() => {
    if (!expanded || !scriptReady || cardRef.current) return;
    if (!appId || !locationId) {
      setError("Square is not configured.");
      setStatus("error");
      return;
    }
    if (!window.Square) {
      setError("Square SDK failed to load.");
      setStatus("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const payments = window.Square!.payments(appId, locationId);
        const card = await payments.card();
        await card.attach("#update-card-container");
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => undefined);
      cardRef.current = null;
    };
  }, [expanded, scriptReady, appId, locationId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardRef.current) return;
    setStatus("submitting");
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        setError(result.errors?.[0]?.message ?? "Card entry failed");
        setStatus("ready");
        return;
      }
      const resp = await fetch("/api/square/update-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: result.token,
          cardholderName: cardholderName.trim() || undefined,
        }),
      });
      const data = (await resp.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!resp.ok || !data?.ok) {
        setError(data?.error ?? `Failed (${resp.status})`);
        setStatus("ready");
        return;
      }
      setStatus("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("ready");
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-tal-plum underline underline-offset-2 hover:opacity-80"
      >
        Update card
      </button>
    );
  }

  return (
    <div>
      <Script
        src={scriptSrc}
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setError("Square SDK failed to load.");
          setStatus("error");
        }}
      />
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Name on card</span>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            autoComplete="cc-name"
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">New card details</span>
          <div
            id="update-card-container"
            className="rounded border border-gray-300 p-3"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {status === "done" ? (
          <p className="text-sm text-green-700">Card updated.</p>
        ) : (
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={status !== "ready"}
              className="rounded-full bg-tal-plum px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "submitting" ? "Saving…" : "Save new card"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                cardRef.current?.destroy().catch(() => undefined);
                cardRef.current = null;
                setStatus("loading");
                setError(null);
                setCardholderName("");
              }}
              className="rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
