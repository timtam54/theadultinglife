"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlannerEventRow } from "@/lib/db/types";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enAU } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { "en-AU": enAU };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description: string | null;
}

// Wrap the base Calendar in the drag-and-drop HOC. The addon's types are
// intentionally loose; cast to any at the boundary and re-narrow via the
// event handlers below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DnDCalendar = withDragAndDrop(Calendar as any) as any;

interface DnDArgs {
  event: CalEvent;
  start: Date | string;
  end: Date | string;
}

interface EditorState {
  mode: "create" | "edit";
  eventId?: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
}

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
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s: string): Date {
  return new Date(s);
}
function toCalEvent(row: PlannerEventRow): CalEvent {
  return {
    id: row.id,
    title: row.title,
    start: new Date(row.start_at),
    end: new Date(row.end_at),
    description: row.description,
  };
}

export function DailyPlanner({ userDisplayName }: { userDisplayName: string }) {
  const [date, setDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<View>(Views.DAY);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pull a wide-enough range for whatever view is showing. Day view uses
  // the current day; week uses that week; month uses that month.
  const range = useMemo(() => {
    if (view === Views.MONTH) {
      const s = new Date(date.getFullYear(), date.getMonth(), 1);
      const e = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (view === Views.WEEK) {
      const s = startOfWeek(date, { weekStartsOn: 1 });
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    return { start: startOfDay(date).toISOString(), end: endOfDay(date).toISOString() };
  }, [date, view]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/planner?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
      );
      if (!res.ok) throw new Error("load_failed");
      const { events: rows } = (await res.json()) as { events: PlannerEventRow[] };
      setEvents(rows.map(toCalEvent));
    } catch {
      setError("Couldn't load events.");
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Click empty slot / drag on empty area → create.
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      setEditor({
        mode: "create",
        title: "",
        description: "",
        startAt: start,
        endAt: end,
      });
    },
    []
  );

  // Click an existing event → edit.
  const handleSelectEvent = useCallback((ev: CalEvent) => {
    setEditor({
      mode: "edit",
      eventId: ev.id,
      title: ev.title,
      description: ev.description ?? "",
      startAt: ev.start,
      endAt: ev.end,
    });
  }, []);

  // Drag an event to a new time slot.
  const handleEventDrop = useCallback(
    async ({ event, start, end }: DnDArgs) => {
      const s = new Date(start);
      const e = new Date(end);
      setEvents((prev) =>
        prev.map((x) => (x.id === event.id ? { ...x, start: s, end: e } : x))
      );
      const res = await fetch(`/api/planner/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startAt: s.toISOString(), endAt: e.toISOString() }),
      });
      if (!res.ok) {
        setError("Couldn't move that event.");
        void refresh();
      }
    },
    [refresh]
  );

  // Resize an event's end time (or start, if you drag from the top).
  const handleEventResize = useCallback(
    async ({ event, start, end }: DnDArgs) => {
      const s = new Date(start);
      const e = new Date(end);
      setEvents((prev) =>
        prev.map((x) => (x.id === event.id ? { ...x, start: s, end: e } : x))
      );
      const res = await fetch(`/api/planner/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startAt: s.toISOString(), endAt: e.toISOString() }),
      });
      if (!res.ok) {
        setError("Couldn't resize that event.");
        void refresh();
      }
    },
    [refresh]
  );

  async function save() {
    if (!editor) return;
    const title = editor.title.trim();
    if (!title) {
      setError("Give the event a title.");
      return;
    }
    if (editor.endAt.getTime() <= editor.startAt.getTime()) {
      setError("End must be after start.");
      return;
    }
    setError(null);
    const body = JSON.stringify({
      title,
      description: editor.description.trim() || null,
      startAt: editor.startAt.toISOString(),
      endAt: editor.endAt.toISOString(),
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
      setError("Couldn't save that event.");
      return;
    }
    setEditor(null);
    void refresh();
  }

  async function remove() {
    if (!editor || editor.mode !== "edit" || !editor.eventId) return;
    const res = await fetch(`/api/planner/${editor.eventId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete that event.");
      return;
    }
    setEditor(null);
    void refresh();
  }

  return (
    <section aria-label={`${userDisplayName}'s daily planner`} className="rbc-wrap">
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div
        className="rounded-2xl border border-tal-line bg-white p-2 sm:p-4"
        style={{ height: "70vh", minHeight: 560 }}
      >
        <DnDCalendar
          localizer={localizer}
          culture="en-AU"
          events={events}
          startAccessor={(e: CalEvent) => e.start}
          endAccessor={(e: CalEvent) => e.end}
          titleAccessor={(e: CalEvent) => e.title}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={setView}
          defaultView={Views.DAY}
          views={[Views.DAY, Views.WEEK, Views.MONTH]}
          step={30}
          timeslots={2}
          selectable
          resizable
          popup
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(ev: CalEvent) => handleSelectEvent(ev)}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          scrollToTime={(() => {
            const d = new Date();
            d.setHours(7, 0, 0, 0);
            return d;
          })()}
          formats={{
            timeGutterFormat: (d: Date) =>
              format(d, "h:mm a").replace(":00", "").toLowerCase(),
          }}
        />
        {loading && (
          <div className="text-xs text-tal-plum-soft mt-2">Loading…</div>
        )}
      </div>

      {editor && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planner-editor-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditor(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h2
              id="planner-editor-title"
              className="font-display text-xl text-tal-plum mb-4"
            >
              {editor.mode === "create" ? "New event" : "Edit event"}
            </h2>

            <label className="block mb-3">
              <span className="text-xs text-tal-plum-soft">Title</span>
              <input
                autoFocus
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
                className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                placeholder="e.g. School run"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-xs text-tal-plum-soft">Start</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(editor.startAt)}
                  onChange={(e) =>
                    setEditor({ ...editor, startAt: fromLocalInput(e.target.value) })
                  }
                  className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-tal-plum-soft">End</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(editor.endAt)}
                  onChange={(e) =>
                    setEditor({ ...editor, endAt: fromLocalInput(e.target.value) })
                  }
                  className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                />
              </label>
            </div>

            <label className="block mb-4">
              <span className="text-xs text-tal-plum-soft">Notes</span>
              <textarea
                value={editor.description}
                onChange={(e) =>
                  setEditor({ ...editor, description: e.target.value })
                }
                rows={3}
                className="mt-1 w-full rounded-lg border border-tal-line px-3 py-2 text-sm"
              />
            </label>

            {error && (
              <div className="mb-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-between gap-2">
              {editor.mode === "edit" ? (
                <button
                  type="button"
                  onClick={remove}
                  className="h-9 px-3 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum-soft hover:text-tal-plum"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
