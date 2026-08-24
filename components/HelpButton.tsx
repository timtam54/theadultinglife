"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { routeToHelpSlug } from "@/lib/help/route-to-slug";

interface HelpDoc {
  slug: string;
  title: string;
  pdfPage: number | null;
  source: "pdf" | "ai";
  bodyMarkdown: string;
}

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; doc: HelpDoc }
  | { kind: "missing" }
  | { kind: "error" };

export function HelpButton() {
  const pathname = usePathname();
  const slug = pathname ? routeToHelpSlug(pathname) : null;

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  // Track which slugs are known to have no help so we can hide the button
  // (rather than re-fetching and 404ing every time the user visits).
  const missingRef = useRef<Set<string>>(new Set());
  const [hiddenForMissing, setHiddenForMissing] = useState(false);

  // When the route changes, reset state and pre-check whether help exists.
  useEffect(() => {
    setOpen(false);
    setState({ kind: "idle" });
    setHiddenForMissing(false);
    if (!slug) return;
    if (missingRef.current.has(slug)) {
      setHiddenForMissing(true);
      return;
    }
    // HEAD-style probe via GET (small payload). We only need to know if it exists.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/help/${encodeURIComponent(slug)}`, {
          method: "GET",
        });
        if (cancelled) return;
        if (res.status === 404) {
          missingRef.current.add(slug);
          setHiddenForMissing(true);
        } else if (res.ok) {
          const doc = (await res.json()) as HelpDoc;
          setState({ kind: "loaded", doc });
        }
      } catch {
        // Ignore — button remains visible; open will surface the error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const openDialog = useCallback(async () => {
    if (!slug) return;
    setOpen(true);
    if (state.kind === "loaded") return;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/help/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setState({ kind: "missing" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const doc = (await res.json()) as HelpDoc;
      setState({ kind: "loaded", doc });
    } catch {
      setState({ kind: "error" });
    }
  }, [slug, state.kind]);

  // Escape key closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!slug || hiddenForMissing) return null;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Open help for this page"
        className="tal-help-fab print:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        style={{
          background:
            "linear-gradient(135deg, rgba(140, 82, 176, 0.85) 0%, rgba(90, 130, 200, 0.85) 55%, rgba(70, 180, 200, 0.85) 100%)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow:
            "0 10px 30px rgba(90, 60, 140, 0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="1.6"
            opacity="0.55"
          />
          <path
            d="M9.4 9.2a2.6 2.6 0 015.05.85c0 1.35-.9 1.8-1.75 2.25-.7.37-1.2.72-1.2 1.55v.3"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="11.5" cy="17.1" r="1.1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tal-help-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full sm:max-w-2xl max-h-[85vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
            <header
              className="px-5 py-4 flex items-start justify-between gap-3 text-white"
              style={{
                background:
                  "linear-gradient(135deg, rgba(140, 82, 176, 1) 0%, rgba(90, 130, 200, 1) 55%, rgba(70, 180, 200, 1) 100%)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider opacity-80">
                  Help
                </div>
                <h2
                  id="tal-help-title"
                  className="font-display text-xl leading-tight truncate"
                >
                  {state.kind === "loaded" ? state.doc.title : "Loading…"}
                </h2>
                {state.kind === "loaded" && state.doc.pdfPage !== null && (
                  <div className="text-xs opacity-85 mt-0.5">
                    The Adulting Life Organiser · p{state.doc.pdfPage}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="shrink-0 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 text-sm text-tal-plum">
              {state.kind === "loading" || state.kind === "idle" ? (
                <p className="text-tal-plum-soft">Loading…</p>
              ) : state.kind === "error" ? (
                <p className="text-red-700">Couldn&apos;t load help right now.</p>
              ) : state.kind === "missing" ? (
                <p className="text-tal-plum-soft">
                  Help hasn&apos;t been written for this page yet.
                </p>
              ) : (
                <HelpBody markdown={state.doc.bodyMarkdown} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Minimal renderer for our controlled help markdown. Supports:
// - ## headings
// - paragraphs
// - `-` bullet lists
// - **bold** and *italic* inline
function HelpBody({ markdown }: { markdown: string }) {
  const blocks = splitBlocks(markdown);
  return (
    <div className="space-y-4 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.kind === "h2") {
          return (
            <h3
              key={i}
              className="font-display text-base text-tal-plum mt-2 first:mt-0"
            >
              {renderInline(b.text)}
            </h3>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function splitBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let paraBuf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      blocks.push({ kind: "p", text: paraBuf.join("\n").trim() });
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ kind: "ul", items: listBuf });
      listBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      listBuf.push(bullet[1]);
      continue;
    }
    flushList();
    paraBuf.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Bold **x**, then italic *x*. Simple non-nested handling is fine for our content.
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/;
  while (remaining.length) {
    const m = remaining.match(pattern);
    if (!m || m.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (m.index > 0) parts.push(remaining.slice(0, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    remaining = remaining.slice(m.index + token.length);
  }
  return parts;
}
