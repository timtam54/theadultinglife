"use client";

/*
 * Full-screen lock overlay. Shown when the current user has an app-lock
 * PIN set AND the session is not currently unlocked (see `isAppLocked`
 * in lib/auth/session.ts). The layout renders this in place of app
 * content when locked — the user cannot see anything until they enter
 * their PIN.
 *
 * PIN pad: numeric 3x4 grid (1-9, then backspace / 0 / submit). Auto-
 * submits on the 4th digit. Shakes on wrong PIN. After too many wrong
 * attempts the server returns 429 with a lockout message; we surface
 * that and offer a "Sign out" escape hatch that re-authenticates via
 * OAuth to reset the lockout.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AppLockGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);

  // Prevent underlying scroll while the lock is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function appendDigit(d: string) {
    if (busy || locked) return;
    setError(null);
    setPin((p) => {
      const next = (p + d).slice(0, 4);
      if (next.length === 4) {
        setTimeout(() => submit(next), 60);
      }
      return next;
    });
  }

  function backspace() {
    if (busy || locked) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  }

  async function submit(fullPin: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/security/pin/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        attemptsLeft?: number;
        message?: string;
      };
      if (res.ok && body.ok) {
        // Refresh so the server layout re-reads the session (now with
        // unlockedAt set) and drops the lock overlay.
        router.refresh();
        return;
      }
      if (res.status === 429) {
        setLocked(true);
        setError(
          body.message ??
            "Too many wrong attempts. Sign out and sign back in to reset."
        );
        return;
      }
      if (typeof body.attemptsLeft === "number") {
        setAttemptsLeft(body.attemptsLeft);
        setError(
          `Wrong PIN. ${body.attemptsLeft} attempt${
            body.attemptsLeft === 1 ? "" : "s"
          } left before lockout.`
        );
      } else {
        setError("Wrong PIN.");
      }
      setPin("");
      // Trigger shake
      if (shakeRef.current) {
        shakeRef.current.classList.remove("tal-shake");
        void shakeRef.current.offsetWidth;
        shakeRef.current.classList.add("tal-shake");
      }
    } catch {
      setError("Network error. Try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* non-fatal */
    }
    window.location.href = "/login";
  }

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
      className="fixed inset-0 z-[10000] bg-tal-cream-soft flex items-center justify-center p-4"
    >
      <style>{`
        @keyframes talShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .tal-shake { animation: talShake 320ms ease-in-out; }
      `}</style>
      <div
        ref={shakeRef}
        className="w-full max-w-xs rounded-3xl bg-white shadow-2xl p-6"
      >
        <div className="text-center mb-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-tal-plum text-white flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2
            id="lock-title"
            className="font-display text-2xl text-tal-plum leading-tight"
          >
            Enter your PIN
          </h2>
          <p className="text-xs text-tal-plum-soft mt-1">
            The Adulting Life is locked. Enter your 4-digit PIN to unlock.
          </p>
        </div>

        {/* PIN dot display */}
        <div
          className="flex items-center justify-center gap-3 mb-5"
          aria-label={`PIN entry: ${pin.length} of 4 digits`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                "inline-block w-3.5 h-3.5 rounded-full transition-colors " +
                (i < pin.length
                  ? "bg-tal-plum"
                  : "bg-tal-cream-soft border border-tal-line")
              }
              aria-hidden
            />
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-center"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => appendDigit(String(d))}
              disabled={busy || locked}
              className="h-14 rounded-2xl bg-tal-cream-soft text-tal-plum text-2xl font-semibold hover:bg-tal-cream active:scale-95 transition-all disabled:opacity-40"
              aria-label={`Digit ${d}`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={backspace}
            disabled={busy || locked || pin.length === 0}
            className="h-14 rounded-2xl bg-white text-tal-plum-soft hover:text-tal-plum text-sm font-medium disabled:opacity-40 flex items-center justify-center"
            aria-label="Backspace"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            disabled={busy || locked}
            className="h-14 rounded-2xl bg-tal-cream-soft text-tal-plum text-2xl font-semibold hover:bg-tal-cream active:scale-95 transition-all disabled:opacity-40"
            aria-label="Digit 0"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              if (pin.length === 4) submit(pin);
            }}
            disabled={busy || locked || pin.length !== 4}
            className="h-14 rounded-2xl bg-tal-plum text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center"
            aria-label="Submit PIN"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12l5 5 9-11"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-tal-plum-soft hover:text-tal-plum underline underline-offset-2"
          >
            Forgot PIN? Sign out and back in to reset.
          </button>
        </div>
        {attemptsLeft != null && !error && (
          <div className="mt-2 text-center text-[11px] text-tal-plum-soft">
            {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left
          </div>
        )}
      </div>
    </div>
  );
}
