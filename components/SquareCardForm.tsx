"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

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

interface Props {
  onSuccess?: (result: { subscriptionId: string; status?: string }) => void;
}

export function SquareCardForm({ onSuccess }: Props) {
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
    if (!scriptReady || cardRef.current) return;
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
        await card.attach("#square-card-container");
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
  }, [scriptReady, appId, locationId]);

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
      const resp = await fetch("/api/square/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: result.token,
          cardholderName: cardholderName.trim() || undefined,
        }),
      });
      const data = (await resp.json().catch(() => null)) as
        | { ok?: boolean; subscriptionId?: string; status?: string; error?: string }
        | null;
      if (!resp.ok || !data?.ok) {
        setError(data?.error ?? `Failed (${resp.status})`);
        setStatus("ready");
        return;
      }
      setStatus("done");
      onSuccess?.({
        subscriptionId: data.subscriptionId!,
        status: data.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("ready");
    }
  };

  return (
    <div className="max-w-md">
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
          <span className="mb-1 block text-sm font-medium">Card details</span>
          <div
            id="square-card-container"
            className="rounded border border-gray-300 p-3"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {status === "done" ? (
          <p className="text-sm text-green-700">Subscription active.</p>
        ) : (
          <button
            type="submit"
            disabled={status !== "ready"}
            className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {status === "submitting" ? "Processing…" : "Subscribe"}
          </button>
        )}
      </form>
    </div>
  );
}
