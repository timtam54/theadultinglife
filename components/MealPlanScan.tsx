"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import type { MealPlanScanResult } from "@/lib/services/meal-plan-scan";
import { ScanDemoButton } from "@/components/ScanDemoButton";
import { CoachChat } from "@/components/CoachChat";

/*
 * "Scan a meal plan" for the meal planner: the photo/PDF is saved to the
 * folder's Documents (so it's kept even if nothing is imported), AI reads it
 * into days × meals, and the user reviews and edits the result before it is
 * written into the grid.
 */

const SUBCATEGORY_ID = "health.meal_planning";
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const SLOTS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "snack1", label: "Snack 1" },
  { id: "lunch", label: "Lunch" },
  { id: "snack2", label: "Snack 2" },
  { id: "dinner", label: "Dinner" },
] as const;
type SlotId = (typeof SLOTS)[number]["id"];
type ScanDay = MealPlanScanResult["days"][number];

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayOf = (label: string) =>
  WEEKDAYS.indexOf(label.trim().slice(0, 3).toLowerCase());
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Calendar date for each scanned day, starting from `start`. Days labelled
 * with a weekday ("Monday", "Wed") land on the next matching weekday, so a
 * plan that skips days stays aligned; anything else just follows on.
 */
function mapDates(days: ScanDay[], start: Date): Date[] {
  const out: Date[] = [];
  let cursor = start;
  days.forEach((day, i) => {
    const wd = weekdayOf(day.label);
    if (wd >= 0) {
      let d = i === 0 ? cursor : addDays(cursor, 1);
      while (d.getDay() !== wd) d = addDays(d, 1);
      cursor = d;
    } else if (i > 0) {
      cursor = addDays(cursor, 1);
    }
    out.push(cursor);
  });
  return out;
}

/** Where a scanned plan should start if it doesn't carry its own dates. */
function defaultStart(days: ScanDay[], weekStart: Date): Date {
  const wd = days[0] ? weekdayOf(days[0].label) : -1;
  if (wd < 0) return weekStart;
  let d = weekStart;
  while (d.getDay() !== wd) d = addDays(d, 1);
  return d;
}

export function MealPlanScanButton({
  userId,
  weekStart,
  onImported,
}: {
  userId: string;
  /** Monday of the week being viewed — the default place to put the plan. */
  weekStart: Date;
  onImported: (firstDate: Date, dayCount: number, saved: number) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<MealPlanScanResult | null>(null);
  const [reviewSource, setReviewSource] = useState<"scan" | "ai">("scan");

  async function handleFile(file: File) {
    setError(null);
    setBusy("Uploading…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subcategoryId", SUBCATEGORY_ID);
      form.append("targetUserId", userId);
      form.append("allowDuplicate", "1");
      const up = await fetch("/api/files", { method: "POST", body: form });
      if (!up.ok) throw new Error("Couldn’t upload the file — try again.");
      const { file: saved } = (await up.json()) as { file: { id: string } };
      // The document is now in this folder whatever happens next.
      router.refresh();

      setBusy("Reading your meal plan…");
      const res = await fetch("/api/meal-plan/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: saved.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        scan?: MealPlanScanResult;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.scan) {
        throw new Error(
          data.message ??
            (data.error === "unsupported_mime_type"
              ? "That file type can’t be read — use a photo or a PDF."
              : "Couldn’t read the meal plan. The file has been saved to Documents below.")
        );
      }
      if (data.scan.days.length === 0) {
        throw new Error(
          "No meals could be read from that file. It has been saved to Documents below."
        );
      }
      setReviewSource("scan");
      setReview(data.scan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy != null}
        onClick={() => inputRef.current?.click()}
        title="Photograph or upload a meal plan. It's saved to Documents, and AI can fill the planner from it."
        className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
      >
        {busy ?? "Scan a meal plan"}
      </button>
      {!busy && <ScanDemoButton subcategoryId={SUBCATEGORY_ID} scanLabel="Scan a meal plan" />}
      {error && (
        <span role="alert" className="basis-full text-xs text-red-700 sm:text-right">
          {error}
        </span>
      )}
      {review && (
        <ScanReview
          source={reviewSource}
          scan={review}
          weekStart={weekStart}
          userId={userId}
          onClose={() => setReview(null)}
          onImported={(first, count, saved) => {
            setReview(null);
            onImported(first, count, saved);
          }}
        />
      )}
    </>
  );
}

/** "Plan my week with AI": a chat that plans meals around the household,
 *  then opens the same review screen a scanned plan uses. */
export function MealPlanCoachButton({
  userId,
  weekStart,
  onImported,
}: {
  userId: string;
  weekStart: Date;
  onImported: (firstDate: Date, dayCount: number, saved: number) => void;
}) {
  const [coaching, setCoaching] = useState(false);
  const [review, setReview] = useState<MealPlanScanResult | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setCoaching(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
      >
        <span aria-hidden>✨</span>
        Plan my week with AI
      </button>
      {coaching && (
        <CoachChat<MealPlanScanResult>
          title="Plan my week with AI"
          opening="Hi! I'll plan a week of meals that suits your household, then you can check it and add it to the planner. To start — who's eating this week, and are there any dietary needs or allergies I should know about?"
          consentKind="form-coach"
          applyLabel="Review and add to planner"
          onClose={() => setCoaching(false)}
          onApply={(plan) => {
            setCoaching(false);
            setReview(plan);
          }}
          requestTurn={async (messages) => {
            const res = await fetch("/api/meal-plan/coach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, messages }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              reply?: string;
              plan?: MealPlanScanResult | null;
              message?: string;
            };
            if (!res.ok || !data.reply) {
              throw new Error(data.message ?? "The AI couldn’t reply just now — try again.");
            }
            return { reply: data.reply, result: data.plan ?? null };
          }}
          renderResult={(plan) => (
            <div className="space-y-2">
              <ul className="space-y-1.5 text-sm text-tal-plum">
                {plan.days.map((d, i) => (
                  <li key={i}>
                    <span className="font-medium">{d.label}:</span>{" "}
                    {SLOTS.map((sl) => d[sl.id])
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
              {plan.warnings.length > 0 && (
                <ul className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 space-y-0.5">
                  {plan.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] italic text-tal-plum-soft">
                Shopping list included. Always check labels for allergens.
              </p>
            </div>
          )}
        />
      )}
      {review && (
        <ScanReview
          source="ai"
          scan={review}
          weekStart={weekStart}
          userId={userId}
          onClose={() => setReview(null)}
          onImported={(first, count, saved) => {
            setReview(null);
            onImported(first, count, saved);
          }}
        />
      )}
    </>
  );
}

function ScanReview({
  scan,
  weekStart,
  userId,
  onClose,
  onImported,
  source = "scan",
}: {
  /** "ai" when the plan came from "Plan my week with AI" rather than a scan. */
  source?: "scan" | "ai";
  scan: MealPlanScanResult;
  weekStart: Date;
  userId: string;
  onClose: () => void;
  onImported: (firstDate: Date, dayCount: number, saved: number) => void;
}) {
  const hasOwnDates = scan.days.every((d) => d.date && !Number.isNaN(Date.parse(d.date)));
  const [useOwnDates, setUseOwnDates] = useState(hasOwnDates);
  const [start, setStart] = useState(() => dateKey(defaultStart(scan.days, weekStart)));
  const [days, setDays] = useState(scan.days);
  const [notes, setNotes] = useState(scan.notes ?? "");
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates =
    useOwnDates && hasOwnDates
      ? days.map((d) => parseISO(d.date as string))
      : mapDates(days, parseISO(start));

  function edit(i: number, slot: SlotId, value: string) {
    setDays((ds) => ds.map((d, j) => (j === i ? { ...d, [slot]: value || null } : d)));
  }

  async function apply() {
    setSaving(true);
    setError(null);
    const entries: { date: string; slot: string; body: string }[] = [];
    days.forEach((d, i) => {
      for (const s of SLOTS) {
        const body = d[s.id]?.trim();
        if (body) entries.push({ date: dateKey(dates[i]), slot: s.id, body });
      }
    });
    if (notes.trim()) {
      // Weekly notes live on the Monday of the plan's first week.
      const first = dates[0];
      const monday = addDays(first, -((first.getDay() + 6) % 7));
      entries.push({ date: dateKey(monday), slot: "notes", body: notes.trim() });
    }
    try {
      const res = await fetch("/api/meal-plan/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, overwrite, entries }),
      });
      if (!res.ok) throw new Error("save_failed");
      const { saved } = (await res.json()) as { saved: number };
      onImported(dates[0], days.length, saved);
    } catch {
      setError("Couldn’t add the meals — check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-scan-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line">
          <h3 id="meal-scan-title" className="font-display text-lg text-tal-plum">
            {source === "ai" ? "Check your AI meal plan" : "Check your scanned meal plan"}
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            {source === "ai"
              ? `AI has planned ${days.length} day${days.length === 1 ? "" : "s"} for you. Change anything you like, choose the week it goes in, then add it to the planner. The shopping list goes in that week's notes. Please check labels for allergens.`
              : `AI has read ${days.length} day${days.length === 1 ? "" : "s"} from your plan. Fix anything it got wrong, choose where it goes, then add it to the planner. The original is saved in Documents.`}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-end gap-4 flex-wrap">
            {hasOwnDates && (
              <label className="flex items-center gap-2 text-sm text-tal-plum h-10">
                <input
                  type="checkbox"
                  checked={useOwnDates}
                  onChange={(e) => setUseOwnDates(e.target.checked)}
                />
                Use the dates on the plan
              </label>
            )}
            {!(useOwnDates && hasOwnDates) && (
              <label className="block">
                <span className="block text-sm text-tal-plum mb-1.5">First day of the plan</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => e.target.value && setStart(e.target.value)}
                  className="h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-tal-plum h-10">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
              />
              Replace meals already in the planner
            </label>
          </div>

          {scan.warnings.length > 0 && (
            <ul className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 list-disc pl-8 space-y-0.5">
              {scan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div className="rounded-xl border border-tal-line overflow-hidden">
            <div className="hidden md:grid grid-cols-[10rem_repeat(5,minmax(0,1fr))] bg-black text-white text-xs font-medium">
              <div className="px-3 py-2">Day</div>
              {SLOTS.map((s) => (
                <div key={s.id} className="px-3 py-2">
                  {s.label}
                </div>
              ))}
            </div>
            {days.map((d, i) => (
              <div
                key={i}
                className="border-t border-tal-line first:border-t-0 md:grid md:grid-cols-[10rem_repeat(5,minmax(0,1fr))]"
              >
                <div className="px-3 py-2 bg-tal-cream-soft/60">
                  <div className="text-sm font-medium text-tal-plum">
                    {format(dates[i], "EEE d MMM")}
                  </div>
                  <div className="text-xs text-tal-plum-soft">On plan: {d.label}</div>
                </div>
                {SLOTS.map((s) => (
                  <label key={s.id} className="block px-2 py-1.5 md:border-l border-tal-line">
                    <span className="md:hidden block text-[10px] uppercase tracking-widest text-tal-plum-soft">
                      {s.label}
                    </span>
                    <textarea
                      rows={2}
                      value={d[s.id] ?? ""}
                      onChange={(e) => edit(i, s.id, e.target.value)}
                      aria-label={`${s.label}, ${format(dates[i], "EEEE d MMM")}`}
                      className="block w-full resize-none rounded-lg border border-tal-line bg-amber-50/60 px-2 py-1 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>

          <label className="block">
            <span className="block text-sm text-tal-plum mb-1.5">
              Notes / prep (goes in the first week&apos;s notes)
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl border border-tal-line bg-white px-3 py-2 text-sm text-tal-plum"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-tal-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={saving}
            className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add to planner"}
          </button>
        </div>
      </div>
    </div>
  );
}
