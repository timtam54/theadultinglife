"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlannerEventRow } from "@/lib/db/types";

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function fmtDayHeading(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface EditorState {
  mode: "create" | "edit";
  eventId?: string;
  title: string;
  description: string;
  startLocal: string;
  endLocal: string;
}

export function DailyPlanner({ userDisplayName }: { userDisplayName: string }) {
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<PlannerEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayStart = useMemo(() => startOfDay(day).toISOString(), [day]);
  const dayEnd = useMemo(() => endOfDay(day).toISOString(), [day]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/planner?start=${encodeURIComponent(dayStart)}&end=${encodeURIComponent(dayEnd)}`
      );
      if (!res.ok) throw new Error("load_failed");
      const { events: rows } = (await res.json()) as { events: PlannerEventRow[] };
      setEvents(rows);
    } catch {
      setError("Couldn't load events.");
    } finally {
      setLoading(false);
    }
  }, [dayStart, dayEnd]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate(hour: number) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    setEditor({
      mode: "create",
      title: "",
      description: "",
      startLocal: toLocalInput(start.toISOString()),
      endLocal: toLocalInput(end.toISOString()),
    });
  }

  function openEdit(ev: PlannerEventRow) {
    setEditor({
      mode: "edit",
      eventId: ev.id,
      title: ev.title,
      description: ev.description ?? "",
      startLocal: toLocalInput(ev.start_at),
      endLocal: toLocalInput(ev.end_at),
    });
  }

  async function save() {
    if (!editor) return;
    const title = editor.title.trim();
    if (!title) {
      setError("Give the event a title.");
      return;
    }
    const startAt = fromLocalInput(editor.startLocal);
    const endAt = fromLocalInput(editor.endLocal);
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError("End must be after start.");
      return;
    }
    setError(null);
    const body = JSON.stringify({
      title,
      description: editor.description.trim() || null,
      startAt,
      endAt,
    });
    const res =
      editor.mode === "create"
        ? await fetch("/api/planner", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          })
        : await fetch(`/api/planner/${editor.eventId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body,
          });
    if (!res.ok) {
      setError("Save failed.");
      return;
    }
    setEditor(null);
    void refresh();
  }

  async function remove() {
    if (!editor || editor.mode !== "edit" || !editor.eventId) return;
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/planner/${editor.eventId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Delete failed.");
      return;
    }
    setEditor(null);
    void refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, -1))}
            className="h-9 w-9 rounded-xl border border-tal-line hover:bg-tal-cream-soft text-tal-plum"
            aria-label="Previous day"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setDay(startOfDay(new Date()))}
            className="h-9 px-3 rounded-xl border border-tal-line hover:bg-tal-cream-soft text-sm text-tal-plum"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, 1))}
            className="h-9 w-9 rounded-xl border border-tal-line hover:bg-tal-cream-soft text-tal-plum"
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <div className="text-sm text-tal-plum-soft">
          {userDisplayName ? `${userDisplayName} · ` : ""}
          <span className="font-medium text-tal-plum">{fmtDayHeading(day)}</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="relative rounded-2xl border border-tal-line bg-white overflow-hidden">
        <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => openCreate(h)}
              className="absolute left-14 right-0 border-t border-tal-line/60 hover:bg-tal-cream-soft/60 text-left"
              style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              aria-label={`Add event at ${h}:00`}
            />
          ))}
          {HOURS.map((h) => (
            <div
              key={`label-${h}`}
              className="absolute left-0 w-14 text-xs text-tal-plum-soft pl-2"
              style={{ top: h * HOUR_HEIGHT - 6 }}
            >
              {h === 0 ? "" : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`}
            </div>
          ))}

          {events.map((ev) => {
            const start = new Date(ev.start_at);
            const end = new Date(ev.end_at);
            const dayRef = startOfDay(day);
            const minutesFromMidnight =
              (start.getTime() - dayRef.getTime()) / 60000;
            const durationMin = Math.max(
              15,
              (end.getTime() - start.getTime()) / 60000
            );
            const top = (minutesFromMidnight / 60) * HOUR_HEIGHT;
            const height = (durationMin / 60) * HOUR_HEIGHT;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => openEdit(ev)}
                className="absolute left-16 right-2 rounded-lg bg-tal-plum text-white text-left px-3 py-1 shadow hover:bg-tal-plum-dark overflow-hidden"
                style={{ top, height }}
              >
                <div className="text-xs opacity-80">
                  {fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}
                </div>
                <div className="text-sm font-medium truncate">{ev.title}</div>
                {ev.description && height > HOUR_HEIGHT && (
                  <div className="text-xs opacity-80 line-clamp-2 mt-0.5">
                    {ev.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {loading && (
          <div className="absolute top-2 right-2 text-xs text-tal-plum-soft bg-white/80 px-2 py-0.5 rounded">
            Loading…
          </div>
        )}
      </div>

      {editor && (
        <PlannerEditorModal
          state={editor}
          onChange={setEditor}
          onSave={save}
          onDelete={editor.mode === "edit" ? remove : undefined}
          onClose={() => {
            setEditor(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function PlannerEditorModal({
  state,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  state: EditorState;
  onChange: (s: EditorState) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-editor-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="planner-editor-title"
          className="font-display text-lg text-tal-plum mb-4"
        >
          {state.mode === "create" ? "New event" : "Edit event"}
        </h3>

        <label className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
          Title
        </label>
        <input
          type="text"
          value={state.title}
          autoFocus
          onChange={(e) => onChange({ ...state, title: e.target.value })}
          className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white mb-4"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
              Start
            </label>
            <input
              type="datetime-local"
              value={state.startLocal}
              onChange={(e) => onChange({ ...state, startLocal: e.target.value })}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
              End
            </label>
            <input
              type="datetime-local"
              value={state.endLocal}
              onChange={(e) => onChange({ ...state, endLocal: e.target.value })}
              className="w-full h-11 rounded-xl border border-tal-line px-3 bg-white"
            />
          </div>
        </div>

        <label className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
          Description (optional)
        </label>
        <textarea
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-tal-line p-3 bg-white mb-4"
        />

        <div className="flex items-center justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="h-10 px-4 rounded-xl border border-red-200 text-red-700 text-sm hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
