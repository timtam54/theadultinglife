"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function TalAiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    const next: Message[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
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
          <div className="h-full flex items-center justify-center text-center text-tal-plum-soft text-sm">
            Ask about anything — passports, taxes, first jobs, moving out.
            <br />
            TAL AI is a plain ChatGPT passthrough.
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              "flex " + (m.role === "user" ? "justify-end" : "justify-start")
            }
          >
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap " +
                (m.role === "user"
                  ? "bg-tal-plum text-white"
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
          onClick={send}
          disabled={streaming || !input.trim()}
          className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark disabled:opacity-60"
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
