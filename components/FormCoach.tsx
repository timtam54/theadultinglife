"use client";

import { useEffect, useRef, useState } from "react";
import { AiConsentGate } from "@/components/AiConsentGate";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useAiConsent } from "@/hooks/useAiConsent";
import { FORM_COACHES } from "@/lib/form-coaches";
import type { PageQuestionRow } from "@/lib/db/types";

/*
 * "Plan it with AI" for folder forms listed in lib/form-coaches.ts. A chat
 * that asks the questions the form needs, then drafts the answers. The draft
 * is shown for review and handed to the form as a new, unsaved entry — the
 * person still checks it and presses Save.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FormCoachButton({
  subcategoryId,
  questions,
  targetUserId,
  onApply,
  className = "",
}: {
  subcategoryId: string;
  questions: PageQuestionRow[];
  targetUserId?: string;
  /** Receives the drafted answers, keyed by question id. */
  onApply: (answers: Record<string, string>) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const coach = FORM_COACHES[subcategoryId];
  if (!coach) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium " +
          className
        }
      >
        <span aria-hidden>✨</span>
        {coach.buttonLabel}
      </button>
      {open && (
        <FormCoachDialog
          subcategoryId={subcategoryId}
          questions={questions}
          targetUserId={targetUserId}
          onClose={() => setOpen(false)}
          onApply={(answers) => {
            setOpen(false);
            onApply(answers);
          }}
        />
      )}
    </>
  );
}

function FormCoachDialog({
  subcategoryId,
  questions,
  targetUserId,
  onClose,
  onApply,
}: {
  subcategoryId: string;
  questions: PageQuestionRow[];
  targetUserId?: string;
  onClose: () => void;
  onApply: (answers: Record<string, string>) => void;
}) {
  const coach = FORM_COACHES[subcategoryId];
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: coach.opening }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const consent = useAiConsent();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, draft]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    if (!(await consent.requestConsent("form-coach"))) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setThinking(true);
    try {
      const res = await fetch("/api/form-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategoryId, userId: targetUserId, messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        answers?: Record<string, string> | null;
        message?: string;
      };
      if (!res.ok || !data.reply) {
        throw new Error(data.message ?? "The AI couldn’t reply just now — try again.");
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
      if (data.answers) setDraft(data.answers);
    } catch (e) {
      setMessages(messages);
      setInput(content);
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setThinking(false);
    }
  }

  // Show the draft in the form's own field order.
  const drafted = draft ? questions.filter((q) => draft[q.id]) : [];
  const labelFor = (q: PageQuestionRow, v: string) =>
    Array.isArray(q.options) ? (q.options.find((o) => o.value === v)?.label ?? v) : v;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-coach-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[88vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div>
            <h3 id="form-coach-title" className="font-display text-lg text-tal-plum">
              {coach.title}
            </h3>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              Answer in your own words. Nothing is saved until you add the draft and press Save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-tal-cream-soft/40">
          {messages.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap " +
                  (m.role === "user"
                    ? "bg-black text-white rounded-br-md"
                    : "bg-white border border-tal-line text-tal-plum rounded-bl-md")
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white border border-tal-line px-4 py-2.5 text-sm text-tal-plum-soft">
                Thinking…
              </div>
            </div>
          )}
          {draft && (
            <div className="rounded-2xl border-2 border-tal-forest/40 bg-white p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-tal-forest font-semibold">
                Your draft
              </div>
              <dl className="space-y-2">
                {drafted.map((q) => (
                  <div key={q.id}>
                    <dt className="text-[10px] uppercase tracking-widest text-tal-plum-soft">{q.label}</dt>
                    <dd className="text-sm text-tal-plum whitespace-pre-line">{labelFor(q, draft[q.id])}</dd>
                  </div>
                ))}
              </dl>
              <AiDisclaimer variant="inline" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-5 py-2 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</p>
        )}

        <div className="border-t border-tal-line px-5 py-3 space-y-2">
          {draft && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-tal-plum-soft">
                Want changes? Keep chatting and ask for a new draft.
              </span>
              <button
                type="button"
                onClick={() => onApply(draft)}
                className="h-10 px-4 rounded-xl bg-tal-forest text-white text-sm font-medium"
              >
                Add to my form
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Type your answer…"
              aria-label="Your answer"
              className="flex-1 resize-none rounded-xl border border-tal-line bg-white px-3 py-2 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
            />
            <div className="flex flex-col gap-1.5">
              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
              {!draft && messages.length > 2 && (
                <button
                  type="button"
                  onClick={() => void send("Please draft it now with what we have so far.")}
                  disabled={thinking}
                  className="h-8 px-3 rounded-lg border border-tal-line text-xs text-tal-plum hover:bg-tal-cream-soft disabled:opacity-50"
                >
                  Draft it now
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      {consent.pendingKind && (
        <AiConsentGate
          kind={consent.pendingKind}
          onGranted={consent.onGranted}
          onCancel={consent.onCancel}
        />
      )}
    </div>
  );
}
