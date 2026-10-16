"use client";

import { useEffect, useState } from "react";
import {
  SCAN_DEMOS,
  SCAN_DEMO_RESULTS_URL,
  type ScanDemo,
  type ScanDemoResult,
} from "@/lib/scan-demos";

/*
 * "How does this work?" button shown beside a folder's scan control. Plays a
 * short walkthrough with the folder's sample document from public/SampleDocs:
 * press scan → pick the file → AI reads it → the fields it filled in. The
 * results are pre-generated, so nothing is uploaded, sent to AI or saved.
 */

const STEPS = [
  { title: "Tap the scan button", ms: 2400 },
  { title: "Choose your document", ms: 2000 },
  { title: "AI reads it for you", ms: 2800 },
  { title: "Check it and save", ms: 0 },
] as const;

const SLOT_LABELS = [
  ["breakfast", "Breakfast"],
  ["snack1", "Snack 1"],
  ["lunch", "Lunch"],
  ["snack2", "Snack 2"],
  ["dinner", "Dinner"],
] as const;

let resultsPromise: Promise<Record<string, ScanDemoResult>> | null = null;
function loadResults() {
  resultsPromise ??= fetch(SCAN_DEMO_RESULTS_URL)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => {
      resultsPromise = null;
      return {};
    });
  return resultsPromise;
}

export function ScanDemoButton({
  subcategoryId,
  scanLabel,
  className = "",
}: {
  subcategoryId: string;
  /** Wording of the real button, so the demo matches what the user sees. */
  scanLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const demo = SCAN_DEMOS[subcategoryId];
  if (!demo) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="See a quick demo of scanning with a sample document"
        className={
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft " +
          className
        }
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-tal-cream text-xs font-semibold"
        >
          ?
        </span>
        How does this work?
      </button>
      {open && (
        <ScanDemoTour
          subcategoryId={subcategoryId}
          demo={demo}
          scanLabel={scanLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ScanDemoTour({
  subcategoryId,
  demo,
  scanLabel,
  onClose,
}: {
  subcategoryId: string;
  demo: ScanDemo;
  scanLabel: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [result, setResult] = useState<ScanDemoResult | null | undefined>(undefined);
  const filename = demo.sample.split("/").pop() ?? "Sample document";
  const isPdf = filename.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let cancelled = false;
    void loadResults().then((all) => {
      if (!cancelled) setResult(all[subcategoryId] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [subcategoryId]);

  useEffect(() => {
    const ms = STEPS[step].ms;
    if (!playing || !ms) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), ms);
    return () => clearTimeout(t);
  }, [step, playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = (
    <div className="relative h-full min-h-64 rounded-xl border border-tal-line bg-white overflow-hidden">
      {isPdf ? (
        <iframe
          src={`${demo.sample}#toolbar=0&navpanes=0&view=FitH`}
          title={`Sample document: ${filename}`}
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={demo.sample}
          alt={`Sample document: ${filename}`}
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}
      {step === 2 && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-tal-plum/5">
          <div className="scan-demo-line absolute left-0 right-0 h-1.5 bg-tal-forest/70 shadow-[0_0_18px_6px_rgba(47,92,92,0.35)]" />
        </div>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-demo-title"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div>
            <h3 id="scan-demo-title" className="font-display text-lg text-tal-plum">
              How scanning works
            </h3>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              A demo using a sample document. Nothing is uploaded or saved to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo"
            className="h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum"
          >
            ×
          </button>
        </div>

        <ol className="px-5 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep(i);
                }}
                className={
                  "w-full text-left rounded-xl px-3 py-2 text-xs transition-colors " +
                  (i === step
                    ? "bg-black text-white"
                    : i < step
                      ? "bg-tal-cream text-tal-plum"
                      : "bg-tal-cream-soft text-tal-plum-soft")
                }
              >
                <span className="block text-[10px] uppercase tracking-widest opacity-70">
                  Step {i + 1}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="min-h-64 flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-tal-plum max-w-md">
                In the folder, press <strong>{scanLabel}</strong>. On a phone you can take a
                photo straight away; on a computer you pick a file.
              </p>
              <div className="relative">
                <span className="scan-demo-press inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-medium shadow-sm">
                  {scanLabel}
                </span>
                <span aria-hidden className="scan-demo-pointer absolute text-2xl">
                  👆
                </span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="min-h-64 flex items-center justify-center">
              <div className="w-full max-w-md rounded-xl border border-tal-line shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-tal-cream-soft text-xs text-tal-plum-soft">
                  Choose a photo or PDF
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-tal-cream px-3 py-2 ring-2 ring-tal-forest/40">
                    <span aria-hidden>{isPdf ? "📄" : "🖼️"}</span>
                    <span className="text-sm text-tal-plum truncate">{filename}</span>
                  </div>
                  <div className="h-2 rounded-full bg-tal-cream-soft overflow-hidden">
                    <div className="scan-demo-progress h-full bg-tal-forest" />
                  </div>
                  <div className="text-xs text-tal-plum-soft">Uploading…</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-h-80">
              {preview}
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-tal-cream animate-pulse">
                  ✨
                </span>
                <p className="text-sm text-tal-plum max-w-xs">
                  AI reads the document and picks out the details your folder asks for.
                  This usually takes a few seconds.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="h-80 lg:h-auto">{preview}</div>
              <div>
                <p className="text-sm text-tal-plum mb-3">
                  {demo.kind === "list"
                    ? "Each item becomes its own entry. Check them, fix anything, then save."
                    : demo.kind === "meals"
                      ? "The meals land in the planner grid. Check them, choose the week, then add them."
                      : "These details are filled into the form. Check them, fix anything, then save."}
                </p>
                <DemoResult result={result} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-tal-line flex items-center justify-between gap-3 flex-wrap">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Demo only — nothing saved
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setStep((s) => Math.max(s - 1, 0));
              }}
              disabled={step === 0}
              className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-40"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => s + 1);
                }}
                className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setPlaying(true);
                  }}
                  className="h-9 px-3 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium"
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .scan-demo-pointer { right: -14px; bottom: -30px; animation: scan-demo-tap 2.4s ease-in-out forwards; }
        .scan-demo-press { animation: scan-demo-press 2.4s ease-in-out forwards; }
        .scan-demo-progress { width: 0; animation: scan-demo-fill 1.8s ease-out forwards; }
        .scan-demo-line { top: 0; animation: scan-demo-sweep 1.4s ease-in-out infinite alternate; }
        @keyframes scan-demo-tap { 0% { transform: translate(60px, 60px); opacity: 0; } 45% { transform: translate(0, 0); opacity: 1; } 60% { transform: translate(0, 0) scale(0.85); } 75%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes scan-demo-press { 0%, 55% { transform: scale(1); } 62% { transform: scale(0.94); box-shadow: 0 0 0 6px rgba(47, 92, 92, 0.25); } 75%, 100% { transform: scale(1); } }
        @keyframes scan-demo-fill { to { width: 100%; } }
        @keyframes scan-demo-sweep { from { top: 0; } to { top: calc(100% - 6px); } }
        @media (prefers-reduced-motion: reduce) {
          .scan-demo-pointer, .scan-demo-press, .scan-demo-progress, .scan-demo-line { animation: none; }
          .scan-demo-progress { width: 100%; }
        }
      `}</style>
    </div>
  );
}

function DemoResult({ result }: { result: ScanDemoResult | null | undefined }) {
  if (result === undefined) {
    return <p className="text-sm text-tal-plum-soft">Loading the sample results…</p>;
  }
  if (result === null) {
    return (
      <p className="text-sm text-tal-plum-soft">
        Sample results aren&apos;t available for this folder yet.
      </p>
    );
  }
  if (result.kind === "fields") {
    return (
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {result.fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
              {f.label}
            </dt>
            <dd className="mt-0.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-tal-plum break-words">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if (result.kind === "list") {
    return (
      <div className="overflow-x-auto rounded-xl border border-tal-line">
        <table className="w-full text-sm">
          <thead className="bg-black text-white text-xs">
            <tr>
              {result.columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-t border-tal-line">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-tal-plum align-top">
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-tal-line">
        <table className="w-full text-sm">
          <thead className="bg-black text-white text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Day</th>
              {SLOT_LABELS.map(([, label]) => (
                <th key={label} className="px-3 py-2 text-left font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.days.map((d, i) => (
              <tr key={i} className="border-t border-tal-line align-top">
                <td className="px-3 py-2 font-medium text-tal-plum whitespace-nowrap">{d.label}</td>
                {SLOT_LABELS.map(([slot]) => (
                  <td key={slot} className="px-3 py-2 text-tal-plum bg-amber-50/60">
                    {d[slot] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.notes && (
        <p className="text-xs text-tal-plum-soft">
          <span className="font-medium text-tal-plum">Notes / prep:</span> {result.notes}
        </p>
      )}
    </div>
  );
}
