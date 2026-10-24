"use client";

/*
 * Settings-page section for the app-lock PIN. The PIN is required for
 * everyone who signs in (AppPinSetupGate makes them choose one), so this
 * only offers "Change PIN". The "off" state remains as a fallback.
 *
 * Uses the same PIN-pad look as AppLockGate for consistency. A new PIN
 * is entered twice (confirm). PinDialog is also used by AppPinSetupGate.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  hasPin: boolean;
  setAt: string | null;
}

type DialogMode = null | "set" | "change";

export function AppPinSection({ hasPin, setAt }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<DialogMode>(null);

  return (
    <div>
      {hasPin ? (
        <div>
          <div className="text-sm text-tal-plum mb-1">
            <span className="font-medium">App PIN is on.</span> You&apos;ll be
            asked for it every time you open the app and after 15 minutes of
            inactivity.
          </div>
          {setAt && (
            <div className="text-xs text-tal-plum-soft mb-3">
              Set {new Date(setAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("change")}
              className="h-10 px-4 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Change PIN
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-tal-plum mb-3">
            <span className="font-medium">App PIN is off.</span> Set a
            4-digit PIN to keep The Adulting Life locked when you&apos;re
            not using it.
          </div>
          <button
            type="button"
            onClick={() => setMode("set")}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Set a 4-digit PIN
          </button>
        </div>
      )}

      {mode && (
        <PinDialog
          mode={mode}
          onClose={() => setMode(null)}
          onDone={() => {
            setMode(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

export function PinDialog({
  mode,
  onClose,
  onDone,
  required = false,
}: {
  mode: "set" | "change";
  onClose: () => void;
  onDone: () => void;
  /** First-time setup the person can't skip: no Cancel, no click-away. */
  required?: boolean;
}) {
  // Step 1 = new PIN, step 2 = confirm the same PIN.
  const [step, setStep] = useState<1 | 2>(1);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pin = step === 1 ? pin1 : pin2;
  const setPin = step === 1 ? setPin1 : setPin2;

  function appendDigit(d: string) {
    if (busy || pin.length >= 4) return;
    setError(null);
    const next = pin + d;
    setPin(next);
    // Submit once, on the 4th digit.
    if (next.length === 4) setTimeout(() => submit(next), 60);
  }
  function backspace() {
    if (busy) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  }

  async function submit(entered: string) {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (entered !== pin1) {
      setError("The two PINs don't match. Try again.");
      setStep(1);
      setPin1("");
      setPin2("");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/security/pin/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pin1 }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && body.ok) {
        onDone();
        return;
      }
      setError("Couldn't set PIN. Try again.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
    setStep(1);
    setPin1("");
    setPin2("");
  }

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const title =
    step === 1
      ? mode === "change"
        ? "Enter a new 4-digit PIN"
        : "Choose a 4-digit PIN"
      : "Confirm your PIN";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !required) onClose();
      }}
    >
      <div className="w-full max-w-xs rounded-3xl bg-white shadow-2xl p-6">
        <div className="text-center mb-5">
          <h3 className="font-display text-lg text-tal-plum leading-tight">
            {title}
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            {required && step === 1
              ? "To keep your information safe, set a PIN for The Adulting Life. You'll be asked for it every time you open the app."
              : "You'll be asked for this every time you open the app."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                "inline-block w-3.5 h-3.5 rounded-full " +
                (i < pin.length
                  ? "bg-tal-plum"
                  : "bg-tal-cream-soft border border-tal-line")
              }
              aria-hidden
            />
          ))}
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => appendDigit(String(d))}
              disabled={busy}
              className="h-14 rounded-2xl bg-tal-cream-soft text-tal-plum text-2xl font-semibold hover:bg-tal-cream active:scale-95 transition-all disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={backspace}
            disabled={busy || pin.length === 0}
            className="h-14 rounded-2xl bg-white text-tal-plum-soft hover:text-tal-plum text-sm disabled:opacity-40 flex items-center justify-center"
            aria-label="Backspace"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12l6-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M12 9l4 6M16 9l-4 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => appendDigit("0")}
            disabled={busy}
            className="h-14 rounded-2xl bg-tal-cream-soft text-tal-plum text-2xl font-semibold hover:bg-tal-cream active:scale-95 transition-all disabled:opacity-40"
          >
            0
          </button>
          {required ? (
            <span aria-hidden />
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-14 rounded-2xl bg-white text-tal-plum-soft hover:text-tal-plum text-xs font-medium disabled:opacity-40"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
