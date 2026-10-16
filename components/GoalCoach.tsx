"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { AiConsentGate } from "@/components/AiConsentGate";
import { useAiConsent } from "@/hooks/useAiConsent";
import type { GoalCoachPlan } from "@/lib/services/goal-coach";

/*
 * "Plan my goals with AI" for Life Goals & Plans. A chat where the coach asks
 * what the person wants and every question the page needs, then drafts the
 * vision, goals, steps and check-in. The draft is shown for review and only
 * written to the page (through the normal life-goals endpoints) when the
 * user clicks "Add to my goals".
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExistingProfile {
  life_vision: string | null;
  going_well: string | null;
  needs_change: string | null;
  focus_goal_id: string | null;
}

const OPENING: Message = {
  role: "assistant",
  content:
    "Hi! I'll help you set up your life goals by asking a few questions, then draft a plan for you to check. To start — what would you like your life to look and feel like in a year or two? (If you already have a goal in mind, just tell me that instead.)",
};

const niceDate = (iso: string | null) => (iso ? format(parseISO(iso), "d MMM yyyy") : null);

export function GoalCoachButton({
  userId,
  profile,
  onApplied,
}: {
  userId: string;
  profile: ExistingProfile;
  /** Called after the plan has been written, so the page can reload. */
  onApplied: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
      >
        <span aria-hidden>✨</span>
        Plan my goals with AI
      </button>
      {open && (
        <GoalCoachDialog
          userId={userId}
          profile={profile}
          onClose={() => setOpen(false)}
          onApplied={(msg) => {
            setOpen(false);
            onApplied(msg);
          }}
        />
      )}
    </>
  );
}

function GoalCoachDialog({
  userId,
  profile,
  onClose,
  onApplied,
}: {
  userId: string;
  profile: ExistingProfile;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GoalCoachPlan | null>(null);
  const [included, setIncluded] = useState<boolean[]>([]);
  const [applying, setApplying] = useState(false);
  const consent = useAiConsent();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, plan]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    if (!(await consent.requestConsent("goal-coach"))) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setThinking(true);
    try {
      const res = await fetch("/api/life-goals/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        plan?: GoalCoachPlan | null;
        message?: string;
      };
      if (!res.ok || !data.reply) {
        throw new Error(data.message ?? "The AI couldn’t reply just now — try again.");
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
      if (data.plan && data.plan.goals.length > 0) {
        setPlan(data.plan);
        setIncluded(data.plan.goals.map(() => true));
      }
    } catch (e) {
      // Put their words back so nothing is lost.
      setMessages(messages);
      setInput(content);
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setThinking(false);
    }
  }

  async function apply() {
    if (!plan) return;
    setApplying(true);
    setError(null);
    const json = (url: string, method: string, body?: unknown) =>
      fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) throw new Error("save_failed");
        return r.json();
      });
    try {
      let focusId: string | null = null;
      let added = 0;
      for (const [i, g] of plan.goals.entries()) {
        if (!included[i]) continue;
        const { goal } = (await json("/api/life-goals", "POST", {
          userId,
          title: g.title,
        })) as { goal: { id: string } };
        added += 1;
        if (g.title === plan.focusGoalTitle) focusId = goal.id;
        await json(`/api/life-goals/${goal.id}`, "PATCH", {
          lifeArea: g.lifeArea,
          why: g.why,
          successMeasure: g.successMeasure,
          targetDate: g.targetDate,
          checkinDate: g.checkinDate,
          obstacles: g.obstacles,
          supports: g.supports,
        });
        for (const s of g.steps) {
          const { step } = (await json(`/api/life-goals/${goal.id}/steps`, "POST")) as {
            step: { id: string };
          };
          await json(`/api/life-goals/steps/${step.id}`, "PATCH", {
            action: s.action,
            needs: s.needs,
            dueDate: s.dueDate,
          });
        }
      }
      // Page-level answers only fill boxes that are still empty.
      const profilePatch: Record<string, string> = {};
      if (plan.lifeVision && !profile.life_vision) profilePatch.lifeVision = plan.lifeVision;
      if (plan.goingWell && !profile.going_well) profilePatch.goingWell = plan.goingWell;
      if (plan.needsChange && !profile.needs_change) profilePatch.needsChange = plan.needsChange;
      if (focusId && !profile.focus_goal_id) profilePatch.focusGoalId = focusId;
      if (Object.keys(profilePatch).length > 0) {
        await json("/api/life-goals/profile", "PUT", { userId, ...profilePatch });
      }
      onApplied(`Added ${added} goal${added === 1 ? "" : "s"} from your AI plan.`);
    } catch {
      setError(
        "Some of the plan couldn’t be saved — check your goals page and try again for anything missing."
      );
      setApplying(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-coach-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[88vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div>
            <h3 id="goal-coach-title" className="font-display text-lg text-tal-plum">
              Plan my goals with AI
            </h3>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              Answer in your own words. Nothing is saved until you add the plan to your goals.
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
            <div
              key={i}
              className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}
            >
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
          {plan && <PlanReview plan={plan} included={included} onToggle={(i) =>
            setIncluded((inc) => inc.map((v, j) => (j === i ? !v : v)))
          } profile={profile} />}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-5 py-2 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</p>
        )}

        <div className="border-t border-tal-line px-5 py-3 space-y-2">
          {plan && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-tal-plum-soft">
                Want changes? Keep chatting and ask for a new draft.
              </span>
              <button
                type="button"
                onClick={apply}
                disabled={applying || !included.some(Boolean)}
                className="h-10 px-4 rounded-xl bg-tal-forest text-white text-sm font-medium disabled:opacity-50"
              >
                {applying ? "Adding…" : "Add to my goals"}
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
              {!plan && messages.length > 2 && (
                <button
                  type="button"
                  onClick={() => void send("Please draft my plan now with what we have so far.")}
                  disabled={thinking}
                  className="h-8 px-3 rounded-lg border border-tal-line text-xs text-tal-plum hover:bg-tal-cream-soft disabled:opacity-50"
                >
                  Draft my plan
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

function PlanReview({
  plan,
  included,
  onToggle,
  profile,
}: {
  plan: GoalCoachPlan;
  included: boolean[];
  onToggle: (i: number) => void;
  profile: ExistingProfile;
}) {
  return (
    <div className="rounded-2xl border-2 border-tal-forest/40 bg-white p-4 space-y-4">
      <div className="text-xs uppercase tracking-widest text-tal-forest font-semibold">
        Your draft plan
      </div>
      {plan.lifeVision && (
        <div>
          <div className="text-xs text-tal-plum-soft">The life I want to build</div>
          <p className="text-sm text-tal-plum">{plan.lifeVision}</p>
          {profile.life_vision && (
            <p className="text-[11px] text-tal-plum-soft italic">
              You already have this filled in, so yours will be kept.
            </p>
          )}
        </div>
      )}
      {plan.goals.map((g, i) => (
        <label
          key={i}
          className={
            "block rounded-xl border p-3 cursor-pointer " +
            (included[i] ? "border-tal-line bg-tal-cream-soft/50" : "border-dashed border-tal-line opacity-60")
          }
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={included[i]}
              onChange={() => onToggle(i)}
              className="mt-1"
              aria-label={`Include ${g.title}`}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-tal-plum">{g.title}</span>
                {g.lifeArea && (
                  <span className="rounded-full bg-white border border-tal-line px-2 py-0.5 text-[11px] text-tal-plum">
                    {g.lifeArea}
                  </span>
                )}
                {g.title === plan.focusGoalTitle && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] text-amber-900">
                    My focus
                  </span>
                )}
              </div>
              <PlanLine label="Why it matters" value={g.why} />
              <PlanLine label="How I'll know" value={g.successMeasure} />
              <PlanLine
                label="Dates"
                value={
                  [
                    g.targetDate && `target ${niceDate(g.targetDate)}`,
                    g.checkinDate && `check-in ${niceDate(g.checkinDate)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              {g.steps.length > 0 && (
                <ol className="list-decimal pl-5 text-sm text-tal-plum space-y-0.5">
                  {g.steps.map((s, j) => (
                    <li key={j}>
                      {s.action}
                      {s.dueDate && (
                        <span className="text-tal-plum-soft"> — by {niceDate(s.dueDate)}</span>
                      )}
                      {s.needs && <span className="text-tal-plum-soft"> ({s.needs})</span>}
                    </li>
                  ))}
                </ol>
              )}
              <PlanLine label="What might get in the way" value={g.obstacles} />
              <PlanLine label="What will help" value={g.supports} />
            </div>
          </div>
        </label>
      ))}
      {(plan.goingWell || plan.needsChange) && (
        <div className="space-y-1">
          <PlanLine label="What is going well" value={plan.goingWell} />
          <PlanLine label="What needs to change" value={plan.needsChange} />
        </div>
      )}
      <p className="text-[11px] text-tal-plum-soft">
        You can edit everything on your goals page after adding it.
      </p>
    </div>
  );
}

function PlanLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm text-tal-plum">
      <span className="text-tal-plum-soft">{label}: </span>
      {value}
    </p>
  );
}
