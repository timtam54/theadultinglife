"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { addDays } from "date-fns/addDays";
import { addMonths } from "date-fns/addMonths";
import { endOfMonth } from "date-fns/endOfMonth";
import { endOfWeek } from "date-fns/endOfWeek";
import { format } from "date-fns/format";
import { isSameDay } from "date-fns/isSameDay";
import { isSameMonth } from "date-fns/isSameMonth";
import { startOfMonth } from "date-fns/startOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";

/*
 * Meal planner grid for health.meal_planning — days down the side, the five
 * meal slots across the top, per Donna's template. One set of data, four
 * views (day / week / fortnight / month). Cells save on blur.
 */

const SLOTS = [
  { id: "breakfast", label: "Breakfast", short: "B" },
  { id: "snack1", label: "Snack 1", short: "S1" },
  { id: "lunch", label: "Lunch", short: "L" },
  { id: "snack2", label: "Snack 2", short: "S2" },
  { id: "dinner", label: "Dinner", short: "D" },
] as const;
type SlotId = (typeof SLOTS)[number]["id"] | "notes";

type View = "day" | "week" | "fortnight" | "month";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "fortnight", label: "Fortnight" },
  { id: "month", label: "Month" },
];

const WEEK = { weekStartsOn: 1 } as const;
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
const cellKey = (d: Date | string, slot: SlotId) =>
  `${typeof d === "string" ? d : dateKey(d)}|${slot}`;

function rangeFor(view: View, anchor: Date): { start: Date; end: Date } {
  if (view === "day") return { start: anchor, end: anchor };
  if (view === "month") {
    return {
      start: startOfWeek(startOfMonth(anchor), WEEK),
      end: endOfWeek(endOfMonth(anchor), WEEK),
    };
  }
  const start = startOfWeek(anchor, WEEK);
  return { start, end: addDays(start, view === "week" ? 6 : 13) };
}

function daysBetween(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const noopSubscribe = () => () => {};

export function MealPlanner({ userId }: { userId: string }) {
  // "Today" depends on the viewer's timezone, which the server doesn't know,
  // so the grid only renders in the browser.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) {
    return <p className="text-sm text-tal-plum-soft">Loading meal plan…</p>;
  }
  return <MealPlannerGrid userId={userId} />;
}

function MealPlannerGrid({ userId }: { userId: string }) {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [today] = useState(() => new Date());
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const { start, end } = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  // Day view also shows the week's notes, which live on that week's Monday.
  const fetchStart = dateKey(view === "day" ? startOfWeek(start, WEEK) : start);
  const fetchEnd = dateKey(end);
  const rangeKey = `${userId}|${fetchStart}|${fetchEnd}|${reloadKey}`;
  const loading = loadedKey !== rangeKey && !failed;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ userId, start: fetchStart, end: fetchEnd });
        const res = await fetch(`/api/meal-plan?${params.toString()}`);
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as {
          entries: { date: string; slot: SlotId; body: string }[];
          suggestions: string[];
        };
        if (cancelled) return;
        setEntries((prev) => {
          // Drop anything we previously held for this range, then apply the
          // fresh rows, so cleared or copied cells are reflected.
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(prev)) {
            const d = k.slice(0, 10);
            if (d < fetchStart || d > fetchEnd) next[k] = v;
          }
          for (const e of data.entries) next[cellKey(e.date, e.slot)] = e.body;
          return next;
        });
        setSuggestions(data.suggestions);
        setFailed(false);
        setLoadedKey(`${userId}|${fetchStart}|${fetchEnd}|${reloadKey}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, fetchStart, fetchEnd, reloadKey]);

  async function save(date: Date, slot: SlotId, text: string) {
    const key = cellKey(date, slot);
    const clean = text.trim();
    if ((entries[key] ?? "") === clean) return;
    setEntries((prev) => {
      const next = { ...prev };
      if (clean) next[key] = clean;
      else delete next[key];
      return next;
    });
    setStatus("Saving…");
    try {
      const res = await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: dateKey(date), slot, body: clean }),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("Saved");
      if (clean && slot !== "notes") {
        setSuggestions((prev) =>
          prev.some((s) => s.toLowerCase() === clean.toLowerCase())
            ? prev
            : [clean, ...prev]
        );
      }
    } catch {
      setStatus("Couldn’t save — check your connection and try again.");
    }
  }

  async function copy(from: Date, days: number, offsetDays: number, what: string) {
    setStatus("Copying…");
    try {
      const res = await fetch("/api/meal-plan/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fromDate: dateKey(from), days, offsetDays }),
      });
      if (!res.ok) throw new Error("copy_failed");
      const { copied } = (await res.json()) as { copied: number };
      setStatus(
        copied === 0
          ? `Nothing to copy — ${what} is already filled in or there were no meals to copy.`
          : `Copied ${copied} meal${copied === 1 ? "" : "s"} to ${what}.`
      );
      setReloadKey((k) => k + 1);
    } catch {
      setStatus("Couldn’t copy — try again.");
    }
  }

  function step(dir: 1 | -1) {
    setAnchor((a) =>
      view === "month"
        ? addMonths(a, dir)
        : addDays(a, dir * (view === "day" ? 1 : view === "week" ? 7 : 14))
    );
  }

  const title =
    view === "day"
      ? format(anchor, "EEEE d MMMM yyyy")
      : view === "month"
        ? format(anchor, "MMMM yyyy")
        : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  const weeks =
    view === "week" || view === "fortnight"
      ? Array.from({ length: view === "week" ? 1 : 2 }, (_, i) => addDays(start, i * 7))
      : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="inline-flex rounded-xl border border-tal-line bg-white p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={
                "h-8 px-3 rounded-lg text-sm font-medium transition-colors " +
                (view === v.id
                  ? "bg-black text-white"
                  : "text-tal-plum hover:bg-tal-cream-soft")
              }
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="h-9 w-9 rounded-xl border border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="h-9 w-9 rounded-xl border border-tal-line bg-white text-tal-plum hover:bg-tal-cream-soft"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-display text-xl text-tal-plum">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-tal-plum-soft" aria-live="polite">
            {loading ? "Loading…" : status}
          </span>
          {(view === "week" || view === "fortnight") && (
            <button
              type="button"
              onClick={() =>
                copy(
                  start,
                  view === "week" ? 7 : 14,
                  view === "week" ? 7 : 14,
                  view === "week" ? "next week" : "the next fortnight"
                )
              }
              className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              {view === "week"
                ? "Copy this week to next week"
                : "Copy this fortnight to the next"}
            </button>
          )}
        </div>
      </div>

      {failed && (
        <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
          Couldn&apos;t load the meal plan.{" "}
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
      )}

      {view === "month" ? (
        <MonthGrid
          days={daysBetween(start, end)}
          anchor={anchor}
          today={today}
          entries={entries}
          onPick={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      ) : view === "day" ? (
        <>
          <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
            <DayRow
              day={anchor}
              today={today}
              entries={entries}
              suggestions={suggestions}
              onSave={save}
              onCopy={copy}
              stacked
            />
          </div>
          <NotesBox
            weekStart={startOfWeek(anchor, WEEK)}
            entries={entries}
            onSave={save}
          />
        </>
      ) : (
        weeks.map((weekStart) => (
          <div key={dateKey(weekStart)} className="mb-6">
            <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
              <div className="hidden md:grid grid-cols-[9rem_repeat(5,minmax(0,1fr))] bg-black text-white text-sm font-medium">
                <div className="px-3 py-2">Day</div>
                {SLOTS.map((s) => (
                  <div key={s.id} className="px-3 py-2 text-center">
                    {s.label}
                  </div>
                ))}
              </div>
              {daysBetween(weekStart, addDays(weekStart, 6)).map((d) => (
                <DayRow
                  key={dateKey(d)}
                  day={d}
                  today={today}
                  entries={entries}
                  suggestions={suggestions}
                  onSave={save}
                  onCopy={copy}
                />
              ))}
            </div>
            <NotesBox weekStart={weekStart} entries={entries} onSave={save} />
          </div>
        ))
      )}
    </div>
  );
}

function DayRow({
  day,
  today,
  entries,
  suggestions,
  onSave,
  onCopy,
  stacked = false,
}: {
  day: Date;
  today: Date;
  entries: Record<string, string>;
  suggestions: string[];
  onSave: (date: Date, slot: SlotId, text: string) => void;
  onCopy: (from: Date, days: number, offsetDays: number, what: string) => void;
  /** Day view: always stack the meals with their labels, at any width. */
  stacked?: boolean;
}) {
  const isToday = isSameDay(day, today);
  return (
    <div
      className={
        "border-t border-tal-line first:border-t-0 " +
        (stacked ? "" : "md:grid md:grid-cols-[9rem_repeat(5,minmax(0,1fr))]")
      }
    >
      <div
        className={
          "px-3 py-2 flex items-center justify-between gap-2 " +
          (stacked ? "" : "md:block ") +
          (isToday ? "bg-tal-cream" : "bg-tal-cream-soft/60")
        }
      >
        <div>
          <div className="text-sm font-medium text-tal-plum">
            {format(day, "EEEE")}
            {isToday && (
              <span className="ml-1.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">
                Today
              </span>
            )}
          </div>
          <div className="text-xs text-tal-plum-soft">{format(day, "d MMM")}</div>
        </div>
        <select
          value=""
          aria-label={`Copy ${format(day, "EEEE d MMM")} to another day`}
          onChange={(e) => {
            if (e.target.value === "day")
              onCopy(day, 1, 1, format(addDays(day, 1), "EEEE d MMM"));
            if (e.target.value === "week")
              onCopy(day, 1, 7, format(addDays(day, 7), "EEEE d MMM"));
          }}
          className={
            "h-7 rounded-lg border border-tal-line bg-white text-xs text-tal-plum px-1 " +
            (stacked ? "" : "md:mt-1.5")
          }
        >
          <option value="">Copy to…</option>
          <option value="day">Next day</option>
          <option value="week">Same day next week</option>
        </select>
      </div>
      {SLOTS.map((s) => {
        const value = entries[cellKey(day, s.id)] ?? "";
        return (
          <div
            key={s.id}
            className={
              "border-t border-tal-line " +
              (stacked ? "" : "md:border-t-0 md:border-l")
            }
          >
            <MealCell
              // Remount when the stored value changes underneath (e.g. after
              // a copy) so the draft re-seeds from it.
              key={value}
              label={s.label}
              showLabel
              labelClassName={stacked ? "" : "md:hidden"}
              ariaLabel={`${s.label}, ${format(day, "EEEE d MMM")}`}
              value={value}
              suggestions={suggestions}
              onCommit={(text) => onSave(day, s.id, text)}
            />
          </div>
        );
      })}
    </div>
  );
}

function MealCell({
  label,
  showLabel,
  labelClassName = "",
  ariaLabel,
  value,
  suggestions,
  onCommit,
  rows = 2,
}: {
  label: string;
  showLabel?: boolean;
  labelClassName?: string;
  ariaLabel: string;
  value: string;
  suggestions?: string[];
  onCommit: (text: string) => void;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const q = draft.trim().toLowerCase();
  const matches =
    focused && suggestions && q.length >= 2
      ? suggestions
          .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
          .slice(0, 5)
      : [];
  return (
    <div className="relative h-full bg-amber-50/70 focus-within:bg-white">
      {showLabel && (
        <div
          className={
            "px-3 pt-2 text-[10px] uppercase tracking-widest text-tal-plum-soft " +
            labelClassName
          }
        >
          {label}
        </div>
      )}
      <textarea
        value={draft}
        rows={rows}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onCommit(draft);
        }}
        className="block w-full resize-none bg-transparent px-3 py-2 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-inset focus:ring-tal-plum/30"
      />
      {matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 rounded-b-lg border border-tal-line bg-white shadow-lg py-1">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                // mousedown fires before the textarea's blur, so the pick
                // lands before the half-typed draft is committed.
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraft(m);
                  onCommit(m);
                }}
                className="block w-full text-left px-3 py-1.5 text-sm text-tal-plum hover:bg-tal-cream-soft truncate"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotesBox({
  weekStart,
  entries,
  onSave,
}: {
  weekStart: Date;
  entries: Record<string, string>;
  onSave: (date: Date, slot: SlotId, text: string) => void;
}) {
  const value = entries[cellKey(weekStart, "notes")] ?? "";
  return (
    <div className="mt-3 rounded-2xl border border-tal-line overflow-hidden">
      <MealCell
        key={value}
        label={`Notes / prep — week of ${format(weekStart, "d MMM")}`}
        showLabel
        ariaLabel={`Notes and prep for the week of ${format(weekStart, "d MMM")}`}
        value={value}
        rows={3}
        onCommit={(text) => onSave(weekStart, "notes", text)}
      />
    </div>
  );
}

function MonthGrid({
  days,
  anchor,
  today,
  entries,
  onPick,
}: {
  days: Date[];
  anchor: Date;
  today: Date;
  entries: Record<string, string>;
  onPick: (d: Date) => void;
}) {
  return (
    <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <div className="grid grid-cols-7 bg-black text-white text-xs font-medium">
        {days.slice(0, 7).map((d) => (
          <div key={dateKey(d)} className="px-2 py-2 text-center">
            {format(d, "EEE")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const filled = SLOTS.filter((s) => entries[cellKey(d, s.id)]);
          const inMonth = isSameMonth(d, anchor);
          return (
            <button
              key={dateKey(d)}
              type="button"
              onClick={() => onPick(d)}
              aria-label={`${format(d, "EEEE d MMMM")} — ${filled.length} of 5 meals planned`}
              className={
                "min-h-20 md:min-h-28 border-t border-l border-tal-line first:border-l-0 [&:nth-child(7n+1)]:border-l-0 p-1.5 text-left align-top hover:bg-tal-cream-soft transition-colors " +
                (inMonth ? "" : "bg-tal-cream-soft/40 text-tal-plum-soft/70")
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    "text-xs font-medium inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full " +
                    (isSameDay(d, today) ? "bg-black text-white" : "text-tal-plum")
                  }
                >
                  {format(d, "d")}
                </span>
                {filled.length > 0 && (
                  <span className="text-[10px] text-tal-plum-soft">
                    {filled.length}/5
                  </span>
                )}
              </div>
              <div className="hidden md:block mt-1 space-y-0.5">
                {filled.map((s) => (
                  <div key={s.id} className="text-[11px] leading-tight text-tal-plum truncate">
                    <span className="text-tal-plum-soft">{s.short}</span>{" "}
                    {entries[cellKey(d, s.id)]}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
