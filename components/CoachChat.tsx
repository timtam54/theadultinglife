"use client";

import { useEffect, useRef, useState } from "react";
import { AiConsentGate, type AiConsentKind } from "@/components/AiConsentGate";
import { useAiConsent } from "@/hooks/useAiConsent";

/*
 * Shared chat dialog for the AI coaches (folder forms, meal planner). The
 * coach asks questions turn by turn; once a turn returns a result (a draft),
 * it is shown for review with an apply button. Nothing is saved here.
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export function CoachChat<T>({
  title,
  opening,
  consentKind,
  requestTurn,
  renderResult,
  applyLabel,
  onApply,
  onClose,
}: {
  title: string;
  /** The coach's first message (shown without calling the AI). */
  opening: string;
  consentKind: AiConsentKind;
  /** Sends the conversation; resolves with the coach's reply and a draft
   *  once it has one. Throw an Error with a user-facing message on failure. */
  requestTurn: (messages: CoachMessage[]) => Promise<{ reply: string; result: T | null }>;
  renderResult: (result: T) => React.ReactNode;
  applyLabel: string;
  onApply: (result: T) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([{ role: "assistant", content: opening }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const consent = useAiConsent();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    if (!(await consent.requestConsent(consentKind))) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setThinking(true);
    try {
      const turn = await requestTurn(next);
      setMessages((m) => [...m, { role: "assistant", content: turn.reply }]);
      if (turn.result) setResult(turn.result);
    } catch (e) {
      // Put their words back so nothing is lost.
      setMessages(messages);
      setInput(content);
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-chat-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[88vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div>
            <h3 id="coach-chat-title" className="font-display text-lg text-tal-plum">
              {title}
            </h3>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              Answer in your own words. Nothing is saved until you add the draft.
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
          {result && (
            <div className="rounded-2xl border-2 border-tal-forest/40 bg-white p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-tal-forest font-semibold">
                Your draft
              </div>
              {renderResult(result)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-5 py-2 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</p>
        )}

        <div className="border-t border-tal-line px-5 py-3 space-y-2">
          {result && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-tal-plum-soft">
                Want changes? Keep chatting and ask for a new draft.
              </span>
              <button
                type="button"
                onClick={() => onApply(result)}
                className="h-10 px-4 rounded-xl bg-tal-forest text-white text-sm font-medium"
              >
                {applyLabel}
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
              {!result && messages.length > 2 && (
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
