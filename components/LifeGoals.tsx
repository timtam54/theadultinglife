"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { GoalCoachButton } from "@/components/GoalCoach";
import type {
  LifeGoalProfileRow,
  LifeGoalStepRow,
  LifeGoalWithSteps,
  StepStatus,
} from "@/lib/db/life-goals";
import { confirmDialog } from "@/components/confirm-dialog";
import { PdfActions } from "@/components/PdfActions";

/*
 * Life Goals & Plans for health.life_goals_plans, per Donna's two-sheet
 * template: "My life goals" is the summary (vision, goal cards, focus,
 * check-in) and "My goal plan" is one goal in full with its action steps.
 * Every field saves when you leave it.
 */

const LIFE_AREAS = [
  "Health",
  "Money",
  "Work",
  "Learning",
  "Relationships",
  "Home",
  "Personal",
];

const STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

type Tab = "summary" | "plan";
type Profile = Omit<LifeGoalProfileRow, "user_id">;
type GoalField = Exclude<keyof LifeGoalWithSteps, "steps" | "id" | "user_id" | "family_group_id" | "created_at">;
type StepField = Exclude<keyof LifeGoalStepRow, "id" | "goal_id" | "sort_order">;

const EMPTY_PROFILE: Profile = {
  life_vision: null,
  going_well: null,
  needs_change: null,
  focus_goal_id: null,
};

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const formatDate = (iso: string | null) =>
  iso ? format(parseISO(iso), "d MMM yyyy") : null;

function progressOf(goal: LifeGoalWithSteps) {
  const total = goal.steps.length;
  const done = goal.steps.filter((s) => s.status === "done").length;
  const next = goal.steps.find((s) => s.status !== "done" && s.action.trim());
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, next };
}

export function LifeGoals({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [goals, setGoals] = useState<LifeGoalWithSteps[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/life-goals?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as {
          goals: LifeGoalWithSteps[];
          profile: LifeGoalProfileRow | null;
        };
        if (cancelled) return;
        setGoals(data.goals);
        setProfile(data.profile ?? EMPTY_PROFILE);
        setFailed(false);
        setLoaded(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  async function send(url: string, method: string, body?: unknown): Promise<Response | null> {
    setStatus("Saving…");
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("Saved");
      return res;
    } catch {
      setStatus("Couldn’t save — check your connection and try again.");
      return null;
    }
  }

  function saveProfile<K extends keyof Profile>(field: K, value: Profile[K]) {
    if (profile[field] === value) return;
    setProfile((p) => ({ ...p, [field]: value }));
    void send("/api/life-goals/profile", "PUT", { userId, [toCamel(field)]: value });
  }

  function saveGoal<K extends GoalField>(id: string, field: K, value: LifeGoalWithSteps[K]) {
    const current = goals.find((g) => g.id === id);
    if (!current || current[field] === value) return;
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    void send(`/api/life-goals/${id}`, "PATCH", { [toCamel(field)]: value });
  }

  function saveStep<K extends StepField>(
    goalId: string,
    stepId: string,
    field: K,
    value: LifeGoalStepRow[K]
  ) {
    setGoals((gs) =>
      gs.map((g) =>
        g.id === goalId
          ? { ...g, steps: g.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)) }
          : g
      )
    );
    void send(`/api/life-goals/steps/${stepId}`, "PATCH", { [toCamel(field)]: value });
  }

  async function addGoal(title: string) {
    const res = await send("/api/life-goals", "POST", { userId, title });
    if (!res) return;
    const { goal } = (await res.json()) as { goal: LifeGoalWithSteps };
    setGoals((gs) => [...gs, goal]);
    setSelectedId(goal.id);
    setTab("plan");
  }

  async function removeGoal(id: string) {
    if (!(await send(`/api/life-goals/${id}`, "DELETE"))) return;
    setGoals((gs) => gs.filter((g) => g.id !== id));
    setProfile((p) => (p.focus_goal_id === id ? { ...p, focus_goal_id: null } : p));
    setSelectedId(null);
    setTab("summary");
  }

  async function addStep(goalId: string) {
    const res = await send(`/api/life-goals/${goalId}/steps`, "POST");
    if (!res) return;
    const { step } = (await res.json()) as { step: LifeGoalStepRow };
    setGoals((gs) =>
      gs.map((g) => (g.id === goalId ? { ...g, steps: [...g.steps, step] } : g))
    );
  }

  async function removeStep(goalId: string, stepId: string) {
    if (!(await send(`/api/life-goals/steps/${stepId}`, "DELETE"))) return;
    setGoals((gs) =>
      gs.map((g) =>
        g.id === goalId ? { ...g, steps: g.steps.filter((s) => s.id !== stepId) } : g
      )
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
        Couldn&apos;t load your goals.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => {
            setFailed(false);
            setReloadKey((k) => k + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }
  if (!loaded) {
    return <p className="text-sm text-tal-plum-soft">Loading your goals…</p>;
  }

  const selected = goals.find((g) => g.id === selectedId) ?? goals[0] ?? null;
  // The focus goal leads the cards.
  const ordered = [...goals].sort(
    (a, b) =>
      Number(b.id === profile.focus_goal_id) - Number(a.id === profile.focus_goal_id)
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="inline-flex rounded-xl border border-tal-line bg-white p-1">
          {(
            [
              ["summary", "My life goals"],
              ["plan", "My goal plan"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={
                "h-9 px-4 rounded-lg text-sm font-medium transition-colors " +
                (tab === id ? "bg-black text-white" : "text-tal-plum hover:bg-tal-cream-soft")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-tal-plum-soft" aria-live="polite">
            {status}
          </span>
          <PdfActions
            downloadUrl={`/api/export/doc?${new URLSearchParams({ kind: "life-goals", user: userId })}`}
            shareUrl="/api/export/doc/email"
            shareBody={{ kind: "life-goals", user: userId }}
            shareLabel="A PDF of my life goals and plans, made by The Adulting Life"
            what="your life goals"
          />
          <GoalCoachButton
            userId={userId}
            profile={profile}
            onApplied={(message) => {
              setStatus(message);
              setTab("summary");
              setReloadKey((k) => k + 1);
            }}
          />
        </div>
      </div>

      {tab === "summary" ? (
        <div className="space-y-6">
          <Section title="The life I want to build" tone="rose">
            <AutoText
              key={profile.life_vision ?? ""}
              label="What would I like my life to look and feel like?"
              value={profile.life_vision}
              rows={4}
              onCommit={(v) => saveProfile("life_vision", v)}
            />
          </Section>

          <Section title="My goals" tone="dark">
            <div className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ordered.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  isFocus={g.id === profile.focus_goal_id}
                  onOpen={() => {
                    setSelectedId(g.id);
                    setTab("plan");
                  }}
                />
              ))}
              <AddGoalCard onAdd={addGoal} first={goals.length === 0} />
            </div>
          </Section>

          {goals.length > 0 && (
            <Section title="My focus for now" tone="amber">
              <label className="block p-4">
                <span className="block text-sm text-tal-plum mb-1.5">
                  The goal I want to focus on first
                </span>
                <select
                  value={profile.focus_goal_id ?? ""}
                  onChange={(e) => saveProfile("focus_goal_id", e.target.value || null)}
                  className="w-full sm:w-auto sm:min-w-72 h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
                >
                  <option value="">Choose a goal…</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
            </Section>
          )}

          <Section title="A moment to check in" tone="rose">
            <AutoText
              key={`w:${profile.going_well ?? ""}`}
              label="What is going well?"
              value={profile.going_well}
              onCommit={(v) => saveProfile("going_well", v)}
            />
            <div className="border-t border-tal-line" />
            <AutoText
              key={`c:${profile.needs_change ?? ""}`}
              label="What needs to change?"
              value={profile.needs_change}
              onCommit={(v) => saveProfile("needs_change", v)}
            />
          </Section>
        </div>
      ) : selected ? (
        <GoalPlan
          // Re-seed every field's draft when switching goals.
          key={selected.id}
          goal={selected}
          goals={goals}
          onSelect={setSelectedId}
          onSaveGoal={(field, value) => saveGoal(selected.id, field, value)}
          onSaveStep={(stepId, field, value) => saveStep(selected.id, stepId, field, value)}
          onAddStep={() => addStep(selected.id)}
          onRemoveStep={(stepId) => removeStep(selected.id, stepId)}
          onRemoveGoal={() => removeGoal(selected.id)}
        />
      ) : (
        <div className="rounded-2xl border border-tal-line bg-white p-6">
          <p className="text-tal-plum mb-3">
            Choose one goal. Give it a plan. Start with one small step.
          </p>
          <div className="max-w-sm">
            <AddGoalCard onAdd={addGoal} first />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "rose" | "amber" | "dark";
  children: React.ReactNode;
}) {
  const head =
    tone === "dark"
      ? "bg-black text-white"
      : tone === "amber"
        ? "bg-amber-100 text-tal-plum"
        : "bg-rose-100 text-tal-plum";
  return (
    <section className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <h2 className={"px-4 py-2.5 text-sm font-semibold uppercase tracking-wide " + head}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function GoalCard({
  goal,
  isFocus,
  onOpen,
}: {
  goal: LifeGoalWithSteps;
  isFocus: boolean;
  onOpen: () => void;
}) {
  const { total, done, pct, next } = progressOf(goal);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        "tal-hover-card text-left rounded-2xl border p-4 flex flex-col gap-3 " +
        (isFocus ? "border-amber-300 bg-amber-50" : "border-tal-line bg-tal-cream-soft/50")
      }
    >
      <div className="flex items-center gap-2 flex-wrap">
        {goal.life_area && (
          <span className="rounded-full bg-white border border-tal-line px-2.5 py-0.5 text-[11px] font-medium text-tal-plum">
            {goal.life_area}
          </span>
        )}
        {isFocus && (
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
            My focus
          </span>
        )}
      </div>
      <div className="font-display text-lg text-tal-plum leading-snug">{goal.title}</div>
      {goal.why && (
        <p className="text-sm text-tal-plum-soft line-clamp-3">{goal.why}</p>
      )}
      <div className="mt-auto space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs text-tal-plum-soft mb-1">
            <span>
              {total === 0 ? "No steps yet" : `${done} of ${total} steps done`}
            </span>
            {total > 0 && <span>{pct}%</span>}
          </div>
          <div className="h-2 rounded-full bg-white border border-tal-line overflow-hidden">
            <div className="h-full bg-tal-forest" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {goal.target_date && (
          <div className="text-xs text-tal-plum-soft">
            Target: <span className="text-tal-plum">{formatDate(goal.target_date)}</span>
          </div>
        )}
        <div className="text-xs text-tal-plum-soft">
          Next small step:{" "}
          <span className="text-tal-plum">
            {next ? next.action : total > 0 && done === total ? "All steps done" : "Add a step in the plan"}
          </span>
        </div>
        <div className="text-sm font-medium text-tal-plum">Open plan →</div>
      </div>
    </button>
  );
}

function AddGoalCard({ onAdd, first }: { onAdd: (title: string) => void; first: boolean }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        setTitle("");
        onAdd(t);
      }}
      className="rounded-2xl border border-dashed border-tal-line p-4 flex flex-col gap-3 bg-white"
    >
      <div className="font-display text-lg text-tal-plum">
        {first ? "Add your first goal" : "Add another goal"}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you want to achieve?"
        aria-label="New goal"
        className="h-10 rounded-xl border border-tal-line px-3 text-sm text-tal-plum bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="h-10 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
      >
        Add goal
      </button>
    </form>
  );
}

function GoalPlan({
  goal,
  goals,
  onSelect,
  onSaveGoal,
  onSaveStep,
  onAddStep,
  onRemoveStep,
  onRemoveGoal,
}: {
  goal: LifeGoalWithSteps;
  goals: LifeGoalWithSteps[];
  onSelect: (id: string) => void;
  onSaveGoal: <K extends GoalField>(field: K, value: LifeGoalWithSteps[K]) => void;
  onSaveStep: <K extends StepField>(stepId: string, field: K, value: LifeGoalStepRow[K]) => void;
  onAddStep: () => void;
  onRemoveStep: (stepId: string) => void;
  onRemoveGoal: () => void;
}) {
  const { total, done, pct, next } = progressOf(goal);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-tal-plum">
          Goal
          <select
            value={goal.id}
            onChange={(e) => onSelect(e.target.value)}
            className="h-10 max-w-xs rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
          >
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            void confirmDialog("Delete this goal and all its steps?\nThis can't be undone.").then((ok) => {
              if (ok) onRemoveGoal();
            });
          }}
          className="text-sm text-red-700 hover:underline"
        >
          Delete goal
        </button>
      </div>

      <Section title="My goal" tone="rose">
        <AutoText
          label="What do I want to achieve?"
          value={goal.title}
          rows={2}
          onCommit={(v) => {
            if (v) onSaveGoal("title", v);
          }}
        />
        <div className="border-t border-tal-line" />
        <AutoText
          label="Why is this important to me?"
          value={goal.why}
          onCommit={(v) => onSaveGoal("why", v)}
        />
        <div className="border-t border-tal-line" />
        <AutoText
          label="How will I know I have achieved it?"
          value={goal.success_measure}
          onCommit={(v) => onSaveGoal("success_measure", v)}
        />
        <div className="border-t border-tal-line grid gap-4 p-4 sm:grid-cols-3">
          <label className="block">
            <span className="block text-sm text-tal-plum mb-1.5">Life area</span>
            <input
              list="life-goal-areas"
              defaultValue={goal.life_area ?? ""}
              onBlur={(e) => onSaveGoal("life_area", e.target.value.trim() || null)}
              placeholder="Pick or type your own"
              className="w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
            />
            <datalist id="life-goal-areas">
              {LIFE_AREAS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <DateWithReminder
            label="My target date"
            date={goal.target_date}
            remind={goal.remind_target}
            onDate={(v) => onSaveGoal("target_date", v)}
            onRemind={(v) => onSaveGoal("remind_target", v)}
          />
          <DateWithReminder
            label="My next check-in"
            date={goal.checkin_date}
            remind={goal.remind_checkin}
            onDate={(v) => onSaveGoal("checkin_date", v)}
            onRemind={(v) => onSaveGoal("remind_checkin", v)}
          />
        </div>
      </Section>

      <Section title="My action steps" tone="dark">
        <div className="px-4 pt-3 flex items-center justify-between gap-3 text-xs text-tal-plum-soft">
          <span>{total === 0 ? "No steps yet" : `${done} of ${total} steps done`}</span>
          <div className="flex-1 max-w-xs h-2 rounded-full bg-tal-cream-soft border border-tal-line overflow-hidden">
            <div className="h-full bg-tal-forest" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ol className="p-4 space-y-3">
          {goal.steps.map((s, i) => (
            <li
              key={s.id}
              className={
                "rounded-xl border border-tal-line overflow-hidden " +
                (s.status === "done" ? "bg-emerald-50/60" : "bg-tal-cream-soft/40")
              }
            >
              <div className="grid lg:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.5fr)_11rem_9rem_minmax(0,1.5fr)_2.5rem]">
                <div className="px-3 py-2 text-sm font-semibold text-tal-plum lg:text-center">
                  <span className="lg:hidden">Step </span>
                  {i + 1}
                </div>
                <AutoText
                  compact
                  label="What I will do"
                  value={s.action}
                  onCommit={(v) => onSaveStep(s.id, "action", v ?? "")}
                />
                <AutoText
                  compact
                  label="What I need / who can help"
                  value={s.needs}
                  onCommit={(v) => onSaveStep(s.id, "needs", v)}
                />
                <div className="px-3 py-2">
                  <DateWithReminder
                    small
                    label="Due date"
                    date={s.due_date}
                    remind={s.remind}
                    onDate={(v) => onSaveStep(s.id, "due_date", v)}
                    onRemind={(v) => onSaveStep(s.id, "remind", v)}
                  />
                </div>
                <label className="block px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                    Progress
                  </span>
                  <select
                    value={s.status}
                    onChange={(e) => onSaveStep(s.id, "status", e.target.value as StepStatus)}
                    className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum"
                  >
                    {(Object.keys(STATUS_LABELS) as StepStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </label>
                <AutoText
                  compact
                  label="Notes"
                  value={s.notes}
                  onCommit={(v) => onSaveStep(s.id, "notes", v)}
                />
                <div className="px-3 py-2 flex lg:justify-center">
                  <button
                    type="button"
                    onClick={() => onRemoveStep(s.id)}
                    aria-label={`Remove step ${i + 1}`}
                    title="Remove step"
                    className="h-8 w-8 rounded-lg text-tal-plum-soft hover:bg-red-50 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onAddStep}
            className="h-10 px-4 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft"
          >
            + Add step
          </button>
        </div>
      </Section>

      <Section title="Making it possible" tone="amber">
        <AutoText
          label="What might get in the way?"
          value={goal.obstacles}
          onCommit={(v) => onSaveGoal("obstacles", v)}
        />
        <div className="border-t border-tal-line" />
        <AutoText
          label="What will help me keep going?"
          value={goal.supports}
          onCommit={(v) => onSaveGoal("supports", v)}
        />
      </Section>

      <Section title="My next small step" tone="rose">
        <p className="p-4 text-tal-plum">
          {next
            ? next.action
            : total > 0 && done === total
              ? "Every step is done — well done."
              : "Add your first action step above and it will show here."}
        </p>
      </Section>
    </div>
  );
}

function AutoText({
  label,
  value,
  onCommit,
  rows = 3,
  compact = false,
}: {
  label: string;
  value: string | null;
  onCommit: (value: string | null) => void;
  rows?: number;
  /** Step-row cell: small caps label, two rows. */
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <label className={"block " + (compact ? "px-3 py-2" : "p-4")}>
      <span
        className={
          compact
            ? "block text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1"
            : "block text-sm text-tal-plum mb-1.5"
        }
      >
        {label}
      </span>
      <textarea
        value={draft}
        rows={compact ? 2 : rows}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const clean = draft.trim() || null;
          if (clean !== (value ?? null)) onCommit(clean);
        }}
        className={
          "block w-full resize-y rounded-xl border border-tal-line bg-white text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30 " +
          (compact ? "px-2 py-1.5 rounded-lg" : "px-3 py-2")
        }
      />
    </label>
  );
}

function DateWithReminder({
  label,
  date,
  remind,
  onDate,
  onRemind,
  small = false,
}: {
  label: string;
  date: string | null;
  remind: boolean;
  onDate: (value: string | null) => void;
  onRemind: (value: boolean) => void;
  small?: boolean;
}) {
  return (
    <div>
      <label className="block">
        <span
          className={
            small
              ? "block text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1"
              : "block text-sm text-tal-plum mb-1.5"
          }
        >
          {label}
        </span>
        <input
          type="date"
          value={date ?? ""}
          onChange={(e) => onDate(e.target.value || null)}
          className={
            "w-full border border-tal-line bg-white px-2 text-sm text-tal-plum " +
            (small ? "h-9 rounded-lg" : "h-10 rounded-xl")
          }
        />
      </label>
      <label className="mt-1.5 flex items-center gap-1.5 text-xs text-tal-plum-soft">
        <input
          type="checkbox"
          checked={remind}
          disabled={!date}
          onChange={(e) => onRemind(e.target.checked)}
        />
        Remind me
      </label>
    </div>
  );
}
