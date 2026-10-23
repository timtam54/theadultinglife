"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// "Add to calendar" for the Daily Routine Planner: reads a photo / PDF of a
// routine, shows the times and activities it found so the person can fix
// anything (AI sometimes slips an entry onto the wrong line), then adds
// them to the calendar on the chosen days for the chosen number of weeks.

type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAYS: { key: Day; label: string; js: number }[] = [
  { key: "mon", label: "Mon", js: 1 },
  { key: "tue", label: "Tue", js: 2 },
  { key: "wed", label: "Wed", js: 3 },
  { key: "thu", label: "Thu", js: 4 },
  { key: "fri", label: "Fri", js: 5 },
  { key: "sat", label: "Sat", js: 6 },
  { key: "sun", label: "Sun", js: 0 },
];

interface Row {
  time: string;
  activity: string;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Each activity runs until the next one starts (max 2 hours), or 30 min
 *  for the last one. */
function buildEvents(rows: Row[], days: Set<Day>, start: string, weeks: number) {
  const sorted = rows
    .filter((r) => r.activity.trim() && /^\d{2}:\d{2}$/.test(r.time))
    .sort((a, b) => minutes(a.time) - minutes(b.time));
  const wanted = new Set(DAYS.filter((d) => days.has(d.key)).map((d) => d.js));
  const events: { title: string; startAt: string; endAt: string }[] = [];
  const [y, mo, da] = start.split("-").map(Number);
  for (let offset = 0; offset < weeks * 7; offset++) {
    const day = new Date(y, mo - 1, da + offset);
    if (!wanted.has(day.getDay())) continue;
    sorted.forEach((r, i) => {
      const from = minutes(r.time);
      const nextStart = i + 1 < sorted.length ? minutes(sorted[i + 1].time) : from + 30;
      const to = Math.min(Math.max(nextStart, from + 15), from + 120, 24 * 60 - 1);
      const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(from / 60), from % 60);
      const e = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(to / 60), to % 60);
      events.push({ title: r.activity.trim(), startAt: s.toISOString(), endAt: e.toISOString() });
    });
  }
  return events;
}

export function RoutineImportDialog({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const [state, setState] = useState<"reading" | "review" | "adding" | "done" | "error">("reading");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState<Set<Day>>(new Set(["mon", "tue", "wed", "thu", "fri"]));
  const [start, setStart] = useState(todayIso);
  const [weeks, setWeeks] = useState(1);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const fd = new FormData();
        fd.append("fileId", fileId);
        const res = await fetch("/api/planner/routine-read", { method: "POST", body: fd });
        const body = (await res.json().catch(() => ({}))) as {
          entries?: Row[];
          days?: Day[];
          message?: string;
          error?: string;
        };
        if (!live) return;
        if (!res.ok || !body.entries) {
          setError(body.message ?? "Couldn't read that routine. Try a clearer photo.");
          setState("error");
          return;
        }
        if (body.entries.length === 0) {
          setError("No timed activities were found in that file.");
          setState("error");
          return;
        }
        setRows(body.entries);
        if (body.days && body.days.length > 0) setDays(new Set(body.days));
        setState("review");
      } catch {
        if (live) {
          setError("Network error. Please try again.");
          setState("error");
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [fileId]);

  const events = state === "review" ? buildEvents(rows, days, start, weeks) : [];

  async function add() {
    setState("adding");
    setError(null);
    try {
      const res = await fetch("/api/planner/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events }),
      });
      const body = (await res.json().catch(() => ({}))) as { added?: number };
      if (!res.ok) throw new Error();
      setAdded(body.added ?? events.length);
      setState("done");
    } catch {
      setError("Couldn't add them to the calendar. Please try again.");
      setState("review");
    }
  }

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // Rendered at the top of the page (portal) so it never inherits styles
  // from where the button sits — e.g. the folder's black header, whose white
  // text made every entry invisible.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="routine-import-title"
      className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4 text-left text-tal-plum"
    >
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-tal-line">
          <h2 id="routine-import-title" className="font-display text-lg text-tal-plum">
            Add your routine to the calendar
          </h2>
          <p className="text-xs text-tal-plum-soft mt-1">
            Check each time and activity — AI can occasionally put one on the wrong line.
          </p>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {state === "reading" && <p className="text-sm text-tal-plum-soft py-8 text-center">Reading your routine…</p>}
          {state === "error" && (
            <p role="alert" className="text-sm text-red-700 py-6 text-center">
              {error}
            </p>
          )}
          {state === "done" && (
            <p role="status" className="text-sm text-tal-plum py-6 text-center">
              Added {added} {added === 1 ? "event" : "events"} to your calendar.
            </p>
          )}
          {(state === "review" || state === "adding") && (
            <>
              <ul className="space-y-2">
                {rows.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={r.time}
                      onChange={(e) => update(i, { time: e.target.value })}
                      aria-label={`Time for entry ${i + 1}`}
                      className="h-10 w-32 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum"
                    />
                    <input
                      type="text"
                      value={r.activity}
                      onChange={(e) => update(i, { activity: e.target.value })}
                      aria-label={`Activity for entry ${i + 1}`}
                      className="h-10 flex-1 min-w-0 rounded-lg border border-tal-line bg-white px-3 text-sm text-tal-plum"
                    />
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove entry ${i + 1}`}
                      className="no-hover-fx h-10 w-10 rounded-lg text-tal-plum-soft hover:bg-red-50 hover:text-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { time: "12:00", activity: "" }])}
                className="mt-3 text-sm text-tal-plum underline underline-offset-2"
              >
                + Add a line
              </button>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <fieldset className="sm:col-span-3">
                  <legend className="text-sm text-tal-plum mb-1.5">Which days</legend>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => {
                      const on = days.has(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setDays((prev) => {
                              const next = new Set(prev);
                              if (next.has(d.key)) next.delete(d.key);
                              else next.add(d.key);
                              return next;
                            })
                          }
                          className={
                            "h-9 px-3 rounded-lg border text-sm " +
                            (on ? "bg-black text-white border-black" : "bg-white text-tal-plum border-tal-line")
                          }
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="text-sm text-tal-plum">
                  Starting
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-tal-line bg-white px-2 text-tal-plum"
                  />
                </label>
                <label className="text-sm text-tal-plum">
                  For
                  <select
                    value={weeks}
                    onChange={(e) => setWeeks(Number(e.target.value))}
                    className="mt-1 block h-10 w-full rounded-lg border border-tal-line bg-white px-2 text-tal-plum"
                  >
                    <option value={1}>1 week</option>
                    <option value={2}>2 weeks</option>
                    <option value={4}>4 weeks</option>
                    <option value={8}>8 weeks</option>
                  </select>
                </label>
              </div>
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-tal-line flex items-center justify-between gap-3">
          <span className="text-xs text-tal-plum-soft">
            {(state === "review" || state === "adding") &&
              `${events.length} ${events.length === 1 ? "event" : "events"} will be added`}
          </span>
          <div className="flex gap-2">
            {state === "done" ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={state === "adding"}
                  className="h-10 px-4 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
                >
                  Cancel
                </button>
                {(state === "review" || state === "adding") && (
                  <button
                    type="button"
                    onClick={add}
                    disabled={state === "adding" || events.length === 0 || events.length > 500}
                    className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
                  >
                    {state === "adding" ? "Adding…" : "Add to calendar"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Header button on the Daily Routine Planner: take a photo or choose a
 *  file of a routine, keep it in the folder's Documents, then review and
 *  add it to the calendar. */
export function RoutineScanButton({ subcategoryId }: { subcategoryId: string }) {
  const [fileId, setFileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function choose(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subcategoryId", subcategoryId);
      fd.append("allowDuplicate", "1");
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { file?: { id: string } };
      if (!res.ok || !body.file) throw new Error();
      setFileId(body.file.id);
    } catch {
      setErr("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label
        className={
          "h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft inline-flex items-center gap-1.5 cursor-pointer " +
          (busy ? "opacity-60 pointer-events-none" : "")
        }
        title="Take a photo or choose a file of your routine — we'll read it into your calendar."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {busy ? "Uploading…" : "Scan into calendar"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void choose(f);
          }}
        />
      </label>
      {err && <span className="text-xs text-red-200">{err}</span>}
      {fileId && <RoutineImportDialog fileId={fileId} onClose={() => setFileId(null)} />}
    </>
  );
}
