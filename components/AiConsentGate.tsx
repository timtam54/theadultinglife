"use client";

import { useCallback, useEffect, useState } from "react";

export type AiConsentKind =
  | "scan-document"
  | "scan-receipt"
  | "polish-text"
  | "transcribe-audio"
  | "read-form-image";

const STORAGE_PREFIX = "tal.ai-consent.";

const COPY: Record<
  AiConsentKind,
  { title: string; body: string; action: string }
> = {
  "scan-document": {
    title: "AI will read this document",
    body: "The photo or PDF you upload will be sent to OpenAI so it can pull out fields like name, number and expiry date. It isn't used to train their models. You can always type the details in by hand instead.",
    action: "Continue with AI",
  },
  "scan-receipt": {
    title: "AI will read this receipt",
    body: "The receipt image is sent to OpenAI to extract supplier, date, amount and GST. You confirm every field before it's saved. It isn't used to train their models.",
    action: "Continue with AI",
  },
  "polish-text": {
    title: "AI will polish your text",
    body: "The words you've typed will be sent to OpenAI so it can suggest tidier wording. Nothing is saved on their side.",
    action: "Continue",
  },
  "transcribe-audio": {
    title: "AI will transcribe your voice",
    body: "Your recorded audio is sent to OpenAI Whisper to turn speech into text. The audio isn't kept afterwards.",
    action: "Continue",
  },
  "read-form-image": {
    title: "AI will read this form",
    body: "The form photo is sent to OpenAI to extract the answers so it can pre-fill the fields. You review everything before saving.",
    action: "Continue with AI",
  },
};

function storageKey(kind: AiConsentKind): string {
  return `${STORAGE_PREFIX}${kind}`;
}

export function hasConsented(kind: AiConsentKind): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(kind)) === "1";
}

export function clearAllConsents(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  for (const k of keys) window.localStorage.removeItem(k);
}

interface Props {
  kind: AiConsentKind;
  onGranted: () => void;
  onCancel: () => void;
}

/**
 * Renders a consent modal for a given AI feature the first time it's used on
 * this device. If consent was previously granted, calls onGranted immediately
 * and renders nothing. If the user cancels, calls onCancel.
 */
export function AiConsentGate({ kind, onGranted, onCancel }: Props) {
  const [decided, setDecided] = useState(false);
  const [dontAsk, setDontAsk] = useState(true);
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    if (hasConsented(kind)) {
      setDecided(true);
      onGranted();
    } else {
      setPrompted(true);
    }
    // Fire-once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const accept = useCallback(() => {
    if (dontAsk && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(kind), "1");
    }
    setDecided(true);
    setPrompted(false);
    onGranted();
  }, [dontAsk, kind, onGranted]);

  const cancel = useCallback(() => {
    setPrompted(false);
    onCancel();
  }, [onCancel]);

  if (decided || !prompted) return null;

  const copy = COPY[kind];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={cancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="ai-consent-title"
          className="font-display text-lg text-tal-plum mb-2"
        >
          {copy.title}
        </h3>
        <p className="text-sm text-tal-plum-soft mb-4">{copy.body}</p>
        <label className="flex items-center gap-2 text-xs text-tal-plum-soft mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={(e) => setDontAsk(e.target.checked)}
            className="rounded border-tal-line"
          />
          Don&apos;t ask me again on this device
        </label>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={accept}
            className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium"
          >
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
