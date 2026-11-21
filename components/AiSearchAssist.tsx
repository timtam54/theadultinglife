"use client";

import { useEffect, useState } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { AiConsentGate, hasConsented } from "@/components/AiConsentGate";
import type { SearchAssistMatch } from "@/lib/services/search-assist";

// Shown when the organiser search finds nothing: TAL AI suggests where to go
// (a typo like "pasport", or a question like "how do I add a will"). Asks for
// AI consent the first time, like the other AI features.
export function AiSearchAssist({ query }: { query: string }) {
  const [state, setState] = useState<"idle" | "consent" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ answer: string; matches: SearchAssistMatch[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setError(null);
    const res = await fetch("/api/search/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: query }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as
      | { answer?: string; matches?: SearchAssistMatch[]; message?: string; error?: string }
      | null;
    if (!res?.ok || !body) {
      setError(body?.message ?? "TAL AI couldn't search just now. Please try again.");
      setState("error");
      return;
    }
    setResult({ answer: body.answer ?? "", matches: body.matches ?? [] });
    setState("done");
  }

  // Already agreed on this device: ask TAL AI straight away.
  useEffect(() => {
    if (!hasConsented("search-assist")) return;
    const t = setTimeout(() => void run(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="rounded-2xl border border-tal-line bg-white p-5">
      <p className="text-tal-plum">
        Nothing matched &ldquo;{query}&rdquo; in your folders.
      </p>
      {state === "idle" && (
        <button
          type="button"
          onClick={() => setState("consent")}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"
        >
          <span aria-hidden>✨</span> Ask TAL AI to find it
        </button>
      )}
      {state === "consent" && (
        <AiConsentGate kind="search-assist" onGranted={() => void run()} onCancel={() => setState("idle")} />
      )}
      {state === "loading" && <p className="mt-3 text-sm text-tal-plum-soft">TAL AI is looking for it…</p>}
      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {state === "done" && result && (
        <div className="mt-4">
          <p className="flex gap-2 text-sm text-tal-plum">
            <span aria-hidden>✨</span>
            <span>{result.answer}</span>
          </p>
          {result.matches.length > 0 && (
            <ul className="mt-3 space-y-2">
              {result.matches.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="tal-hover-card flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-tal-plum">{m.name}</div>
                      <div className="text-xs text-tal-plum-soft">
                        {m.where} · {m.why}
                      </div>
                    </div>
                    <span className="text-tal-plum-soft" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs italic text-tal-plum-soft">Suggested by TAL AI — a guide only.</p>
        </div>
      )}
    </div>
  );
}
