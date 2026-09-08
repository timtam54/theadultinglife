"use client";

/*
 * Blocking consent gate. Rendered inside the (app) layout.
 *
 * Behaviour:
 *  - Reads whether the current user has accepted T&Cs and Privacy Policy.
 *  - If T&Cs are unaccepted, shows the Terms dialog first.
 *  - Once T&Cs are accepted (or already accepted), if Privacy is unaccepted,
 *    shows the Privacy dialog next.
 *  - Both dialogs block the whole app (fixed overlay, no way to dismiss
 *    without accepting).
 *  - "Accept" is disabled until the user ticks the checkbox.
 */

import { useEffect, useRef, useState } from "react";
import { TermsContent } from "./TermsContent";
import { PrivacyContent } from "./PrivacyContent";

interface Props {
  needsTerms: boolean;
  needsPrivacy: boolean;
}

export function LegalConsentGate({ needsTerms, needsPrivacy }: Props) {
  const [showTerms, setShowTerms] = useState(needsTerms);
  const [showPrivacy, setShowPrivacy] = useState(needsPrivacy && !needsTerms);

  if (!showTerms && !showPrivacy) return null;

  return (
    <>
      {showTerms && (
        <ConsentDialog
          title="Terms & Conditions"
          intro="Before you use The Adulting Life, please read and accept the Terms & Conditions."
          endpoint="/api/account/accept-terms"
          checkboxLabel="I have read and agree to the Terms & Conditions."
          onAccepted={() => {
            setShowTerms(false);
            // If privacy is also needed, open it next.
            if (needsPrivacy) setShowPrivacy(true);
          }}
        >
          <TermsContent />
        </ConsentDialog>
      )}
      {showPrivacy && !showTerms && (
        <ConsentDialog
          title="Privacy Policy"
          intro="Please read and accept the Privacy Policy — it explains how your information is stored and used."
          endpoint="/api/account/accept-privacy"
          checkboxLabel="I have read and agree to the Privacy Policy."
          onAccepted={() => {
            setShowPrivacy(false);
            // Reload so the server layout re-runs and any downstream
            // redirects (age gate, hello) fire correctly.
            window.location.reload();
          }}
        >
          <PrivacyContent />
        </ConsentDialog>
      )}
    </>
  );
}

function ConsentDialog({
  title,
  intro,
  endpoint,
  checkboxLabel,
  onAccepted,
  children,
}: {
  title: string;
  intro: string;
  endpoint: string;
  checkboxLabel: string;
  onAccepted: () => void;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prevent the underlying app from scrolling while the dialog is open —
  // otherwise the trap-focus feel breaks.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function accept() {
    if (!checked || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? body?.error ?? "accept_failed");
      }
      onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "accept_failed");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-tal-line bg-tal-cream-soft">
          <h2
            id="legal-dialog-title"
            className="font-display text-2xl text-tal-plum leading-tight"
          >
            {title}
          </h2>
          <p className="text-sm text-tal-plum-soft mt-1">{intro}</p>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {children}
        </div>

        <footer className="px-6 py-4 border-t border-tal-line bg-white space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={busy}
              className="mt-1 h-5 w-5 rounded border-tal-line text-tal-plum focus:ring-2 focus:ring-tal-plum/30"
            />
            <span className="text-sm text-tal-plum leading-snug">
              {checkboxLabel}
            </span>
          </label>
          {error && (
            <div
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={accept}
              disabled={!checked || busy}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? (
                "Saving…"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12l5 5 9-11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Accept and continue
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
