"use client";

/*
 * Required first-time PIN setup. The app layout renders this in place of
 * app content for anyone signed in without a PIN — they can't use the app
 * until they've chosen one. Setting it emails them a heads-up (see
 * /api/security/pin/set) and unlocks the current session.
 *
 * Once the PIN is set, if this device has Face ID / fingerprint, we offer
 * to turn that on too (optional — "Not now" goes straight into the app).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PinDialog } from "@/components/security/AppPinSection";
import { faceIdAvailable, faceIdName, turnOnFaceId } from "@/lib/face-id-client";

export function AppPinSetupGate() {
  const router = useRouter();
  const [offer, setOffer] = useState<{ name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* non-fatal */
    }
    window.location.href = "/login";
  }

  async function pinDone() {
    if (await faceIdAvailable()) setOffer({ name: faceIdName() });
    else router.refresh();
  }

  async function turnOn() {
    setBusy(true);
    setError(null);
    const result = await turnOnFaceId();
    setBusy(false);
    if (result.ok) router.refresh();
    else if (!result.cancelled) setError(result.message);
  }

  if (offer) {
    return (
      <div className="fixed inset-0 z-[10000] bg-tal-cream-soft flex items-center justify-center p-4">
        <div className="w-full max-w-xs rounded-3xl bg-white shadow-2xl p-6 text-center">
          <h2 className="font-display text-xl text-tal-plum leading-tight">
            Unlock with {offer.name}?
          </h2>
          <p className="text-sm text-tal-plum-soft mt-2">
            Your PIN is set. You can also unlock The Adulting Life on this
            device with {offer.name} — your PIN still works too.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="mt-5 w-full h-12 rounded-2xl bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            {busy ? "Waiting for your device…" : `Turn on ${offer.name}`}
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            disabled={busy}
            className="mt-3 text-sm text-tal-plum-soft hover:text-tal-plum underline underline-offset-2"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-tal-cream-soft">
      <PinDialog mode="set" required onClose={() => {}} onDone={pinDone} />
      <div className="fixed bottom-6 inset-x-0 z-[10002] text-center">
        <button
          type="button"
          onClick={signOut}
          className="text-xs text-white/90 hover:text-white underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
