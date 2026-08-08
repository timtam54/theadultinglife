"use client";

import { useState } from "react";

// Square's sandbox test card. Only shown when running against sandbox.
// Cannot be programmatically injected into the card iframe (PCI-sandboxed by
// Square), so we show it and let the user copy each field.
const TEST_CARD = {
  number: "4111 1111 1111 1111",
  exp: "12/28",
  cvv: "111",
  zip: "12345",
};

export function SandboxCardNotice() {
  const isSandbox =
    (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "sandbox") !== "production";

  if (!isSandbox) return null;

  return (
    <div className="mb-4 rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-4">
      <div className="flex items-start gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="mt-0.5 flex-shrink-0 text-yellow-700"
          aria-hidden
        >
          <path
            d="M12 2 3 20h18L12 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17" r="1.1" fill="currentColor" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-900">
            Test mode &mdash; sandbox only
          </p>
          <p className="mt-1 text-xs text-yellow-800">
            This form is connected to Square&rsquo;s <strong>Sandbox</strong>{" "}
            environment. Real credit cards will be rejected. Use the test card
            below.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TestField label="Card number" value={TEST_CARD.number} />
        <TestField label="Expiry" value={TEST_CARD.exp} />
        <TestField label="CVV" value={TEST_CARD.cvv} />
        <TestField label="Postcode" value={TEST_CARD.zip} />
      </div>
    </div>
  );
}

function TestField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — user can still read the value
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center justify-between rounded bg-white px-3 py-2 text-left hover:bg-yellow-100 transition-colors"
      aria-label={`Copy ${label}`}
    >
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-yellow-700">
          {label}
        </div>
        <div className="font-mono text-sm text-gray-900">{value}</div>
      </div>
      <span className="text-xs text-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
