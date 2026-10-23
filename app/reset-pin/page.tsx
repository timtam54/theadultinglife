"use client";

// Opened from the "Forgot PIN?" email. Checks the one-time link, then lets
// the person choose a new 4-digit app PIN (entered twice).

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

const inputClass =
  "w-full h-12 rounded-xl border border-tal-line px-3 text-center text-2xl tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-tal-plum/40";

function ResetPinInner() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done">(
    token ? "loading" : "invalid"
  );
  const [signedInHere, setSignedInHere] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch("/api/security/pin/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => null);
      setState(res?.ok ? "ready" : "invalid");
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("Your PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("The two PINs don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/security/pin/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        signedInHere?: boolean;
      };
      if (res.ok && json.ok) {
        setSignedInHere(Boolean(json.signedInHere));
        setState("done");
        return;
      }
      if (json.error === "invalid_or_expired") {
        setState("invalid");
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-tal-cream-soft px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo iconClassName="h-20 w-20 lg:h-24 lg:w-24 shadow-sm" className="justify-center" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-tal-line p-8">
          {state === "loading" && (
            <p className="text-center text-tal-plum-soft">Checking your link…</p>
          )}

          {state === "invalid" && (
            <div className="text-center space-y-4">
              <h2 className="font-display text-xl font-semibold text-tal-plum">
                This link isn&apos;t valid
              </h2>
              <p className="text-tal-plum-soft">
                It may have already been used or expired. Open The Adulting Life
                and choose &ldquo;Forgot PIN?&rdquo; to get a fresh one.
              </p>
              <a
                href="/dashboard"
                className="inline-block h-12 leading-12 px-6 rounded-xl bg-black text-white font-medium transition"
              >
                Open The Adulting Life
              </a>
            </div>
          )}

          {state === "done" && (
            <div className="text-center space-y-4">
              <h2 className="font-display text-xl font-semibold text-tal-plum">
                Your new PIN is set
              </h2>
              <p className="text-tal-plum-soft">
                {signedInHere
                  ? "You're all set."
                  : "Go back to The Adulting Life and unlock it with your new PIN."}
              </p>
              <a
                href="/dashboard"
                className="inline-block h-12 leading-12 px-6 rounded-xl bg-black text-white font-medium transition"
              >
                Open The Adulting Life
              </a>
            </div>
          )}

          {state === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-tal-plum text-center">
                Choose a new PIN
              </h2>
              <div>
                <label htmlFor="pin" className="block text-sm mb-1">
                  New 4-digit PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={pin}
                  onChange={(e) => setPin(digitsOnly(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm mb-1">
                  Confirm PIN
                </label>
                <input
                  id="confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(digitsOnly(e.target.value))}
                  className={inputClass}
                />
              </div>

              {error && (
                <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-black text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={null}>
      <ResetPinInner />
    </Suspense>
  );
}
