"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { helpSlugToRoute } from "@/lib/help/route-to-slug";

interface Citation {
  slug: string;
  title: string;
  pdfPage: number | null;
  source: "pdf" | "ai";
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

const STARTER_PROMPTS = [
  "Help me write an email to my landlord",
  "What information belongs in an emergency contact record?",
  "Explain how the Australian financial year works",
  "How should I organise my tax paperwork?",
];

const CHAT_INTRO =
  "TAL AI gives general guidance and wording help — not legal, financial, tax or medical advice.";

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function TalAiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function send(promptOverride?: string) {
    const text = (promptOverride ?? input).trim();
    if (!text || streaming) return;
    if (!promptOverride) setInput("");
    setError(null);
    const next: Message[] = [
      ...messages,
      { id: makeId(), role: "user", content: text },
      { id: makeId(), role: "assistant", content: "" },
    ];
    setMessages(next);
    setStreaming(true);

    try {
      const res = await fetch("/api/tal-ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`chat_failed_${res.status}`);
      }

      // Citations arrive on a header before the streamed text — decode once
      // and stamp them onto the assistant message so the UI can render them
      // alongside the answer as it streams in.
      const citationsHeader = res.headers.get("x-tal-citations");
      let citations: Citation[] = [];
      if (citationsHeader) {
        try {
          const decoded =
            typeof atob === "function"
              ? atob(citationsHeader)
              : Buffer.from(citationsHeader, "base64").toString("utf8");
          citations = JSON.parse(decoded) as Citation[];
        } catch {
          // Ignore malformed header — chat still works, just without citations.
        }
      }
      if (citations.length > 0) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, citations };
          return copy;
        });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: acc };
          return copy;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "chat_failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  async function reportMessage(m: Message) {
    if (reportedIds.has(m.id) || reportBusyId) return;
    setReportBusyId(m.id);
    try {
      const res = await fetch("/api/tal-ai/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "unhelpful_or_unsafe",
          messageId: m.id,
          messageText: m.content,
        }),
      });
      if (res.ok) {
        setReportedIds((prev) => {
          const next = new Set(prev);
          next.add(m.id);
          return next;
        });
      }
    } finally {
      setReportBusyId(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="rounded-2xl border border-tal-line bg-white overflow-hidden flex flex-col h-[70vh]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 space-y-4"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-2">
            <div className="max-w-md">
              <p className="text-tal-plum font-medium mb-1">
                Ask TAL AI for a hand with life admin.
              </p>
              <p className="text-tal-plum-soft text-sm">
                {CHAT_INTRO} Always check important decisions with the right
                professional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-left text-xs rounded-full border border-tal-line bg-tal-cream-soft/60 hover:bg-white text-tal-plum px-3 py-1.5"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "flex " + (m.role === "user" ? "justify-end" : "justify-start")
            }
          >
            <div className="max-w-[80%] flex flex-col gap-1">
              <div
                className={
                  "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap " +
                  (m.role === "user"
                    ? "bg-black text-white"
                    : "bg-tal-cream-soft text-tal-plum")
                }
              >
                {m.content || (
                  <span className="inline-flex items-center gap-1 text-tal-plum-soft">
                    <span className="w-1.5 h-1.5 rounded-full bg-tal-plum-soft animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-tal-plum-soft animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-tal-plum-soft animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                )}
              </div>
              {m.role === "assistant" && m.content && m.citations && m.citations.length > 0 && (
                <div className="pl-1 flex flex-wrap gap-1.5 max-w-full">
                  <span className="text-[11px] text-tal-plum-soft self-center">
                    From the guide:
                  </span>
                  {m.citations.map((c) => {
                    const href = helpSlugToRoute(c.slug);
                    const chip = (
                      <span
                        key={c.slug}
                        className="inline-flex items-center gap-1 text-[11px] rounded-full border border-tal-line bg-white px-2 py-0.5 text-tal-plum hover:bg-tal-cream-soft"
                        title={
                          c.pdfPage
                            ? `Organiser page ${c.pdfPage} · ${Math.round(c.similarity * 100)}% match`
                            : `${Math.round(c.similarity * 100)}% match`
                        }
                      >
                        {c.title}
                      </span>
                    );
                    return href ? (
                      <Link key={c.slug} href={href} className="no-underline">
                        {chip}
                      </Link>
                    ) : (
                      chip
                    );
                  })}
                </div>
              )}
              {m.role === "assistant" && m.content && (
                <>
                  <div className="pl-1">
                    <AiDisclaimer variant="inline" />
                  </div>
                  <div className="flex items-center gap-2 pl-1">
                    {reportedIds.has(m.id) ? (
                      <span className="text-[11px] text-tal-plum-soft italic">
                        Reported — thanks for the feedback
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reportMessage(m)}
                        disabled={reportBusyId === m.id}
                        className="text-[11px] text-tal-plum-soft hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-60"
                        title="Report this answer as unhelpful or unsafe"
                      >
                        <ThumbsDownIcon />
                        {reportBusyId === m.id ? "Reporting…" : "Report"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-5 py-2 text-xs text-red-700 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      <div className="border-t border-tal-line p-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask something…"
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border border-tal-line bg-white px-3 py-2 text-sm focus:outline-none focus:border-tal-plum disabled:opacity-60 max-h-40"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
      <div className="border-t border-tal-line px-5 py-2">
        <AiDisclaimer variant="inline" />
      </div>
    </div>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 14V4h10l3 6v4h-5l1 5a2 2 0 0 1-2 2l-4-8H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        transform="rotate(180 12 12)"
      />
    </svg>
  );
}
