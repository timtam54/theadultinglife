import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listPlannerEventsForRange } from "@/lib/db/planner";
import { PrintTrigger } from "@/components/PrintTrigger";
import { format } from "date-fns/format";
import { startOfWeek } from "date-fns/startOfWeek";
import { enAU } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Print · Planner",
  robots: { index: false, follow: false },
};

type ViewMode = "day" | "week" | "month";

function parseView(v: string | string[] | undefined): ViewMode {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === "week" || s === "month") return s;
  return "day";
}

function parseDate(v: string | string[] | undefined): Date {
  const s = Array.isArray(v) ? v[0] : v;
  if (s) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function rangeFor(view: ViewMode, date: Date): { start: Date; end: Date; label: string } {
  if (view === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: format(date, "MMMM yyyy", { locale: enAU }) };
  }
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const label = `Week of ${format(start, "d MMM yyyy", { locale: enAU })}`;
    return { start, end, label };
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: format(date, "EEEE, d MMMM yyyy", { locale: enAU }) };
}

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fmtTime(iso: string): string {
  return format(new Date(iso), "h:mm a", { locale: enAU })
    .replace(":00", "")
    .toLowerCase();
}

export default async function PlannerDayPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const view = parseView(sp.view);
  const date = parseDate(sp.date);
  const { start, end, label } = rangeFor(view, date);

  const events = await listPlannerEventsForRange(
    session.user.id,
    start.toISOString(),
    // listPlannerEventsForRange uses `<` on start_at, so bump end by 1ms to include events starting exactly at end-of-range.
    new Date(end.getTime() + 1).toISOString()
  );

  const byDay = new Map<string, typeof events>();
  for (const ev of events) {
    const key = dayKey(new Date(ev.start_at));
    const list = byDay.get(key) ?? [];
    list.push(ev);
    byDay.set(key, list);
  }

  const dayList: Date[] = [];
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    dayList.push(new Date(d));
  }

  const ownerName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
    session.user.name ||
    "";
  const printedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-tal-plum-soft">
          Planner — print preview
        </div>
        <PrintTrigger />
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl">Planner</h1>
        <p className="text-sm text-gray-700">{label}</p>
        {ownerName && (
          <p className="text-sm text-gray-700">{ownerName}</p>
        )}
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-gray-600">No events in this range.</p>
      ) : (
        <div className="space-y-6">
          {dayList.map((d) => {
            const items = byDay.get(dayKey(d)) ?? [];
            if (view === "day" || items.length > 0) {
              return (
                <section key={dayKey(d)} className="break-inside-avoid">
                  <h2 className="font-display text-lg border-b border-gray-300 pb-1 mb-2">
                    {format(d, "EEEE, d MMMM", { locale: enAU })}
                  </h2>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nothing scheduled.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((ev) => (
                        <li key={ev.id} className="flex gap-4">
                          <div className="w-32 shrink-0 text-sm tabular-nums text-gray-700">
                            {fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{ev.title}</div>
                            {ev.description && (
                              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                {ev.description}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            }
            return null;
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-gray-500">Printed {printedOn}</p>
    </div>
  );
}
