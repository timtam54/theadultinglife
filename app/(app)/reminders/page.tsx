import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import {
  listRemindersForFamily,
  type Reminder,
} from "@/lib/services/reminders";

export const metadata: Metadata = {
  title: "Reminders",
  description: "Upcoming and expired dates across your Life Admin.",
};

export default async function RemindersPage() {
  const session = await requireSession();
  const all = await listRemindersForFamily(session.user.familyGroupId);

  const expired = all.filter((r) => r.status === "expired");
  const upcoming = all.filter((r) => r.status !== "expired");

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-black to-gray-800 text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 shrink-0"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M10 19a2 2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Reminders
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {all.length === 0 ? "Nothing to remind you about" : "What's coming up"}
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">
            {expired.length > 0 && `${expired.length} expired`}
            {expired.length > 0 && upcoming.length > 0 && " · "}
            {upcoming.length > 0 && `${upcoming.length} upcoming`}
            {all.length === 0 && "all clear"}
          </span>
          <Link
            href="/reminders/new"
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-tal-plum text-sm font-medium hover:shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add reminder
          </Link>
        </div>
      </div>

      {expired.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-xl text-tal-plum mb-3">Expired</h2>
          <ul className="space-y-2">
            {expired.map((r) => (
              <ReminderRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-tal-plum mb-3">Upcoming</h2>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <ReminderRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {all.length === 0 && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          Nothing expired or expiring. As you add licences, passports and
          renewals to your Life Admin, dates will surface here automatically.
        </div>
      )}
    </div>
  );
}

function ReminderRow({ r }: { r: Reminder }) {
  return (
    <li>
      <Link
        href={r.href}
        className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="font-medium text-tal-plum truncate">{r.title}</div>
          <div className="text-xs text-tal-plum-soft mt-0.5">
            {formatDue(r)}
          </div>
        </div>
        <span
          className={
            "text-xs rounded-full px-2 py-0.5 shrink-0 " +
            (r.status === "expired"
              ? "bg-red-100 text-red-800"
              : r.status === "expiring_soon"
              ? "bg-amber-100 text-amber-900"
              : "bg-tal-cream-soft text-tal-plum-soft")
          }
        >
          {r.status === "expired"
            ? "Expired"
            : r.status === "expiring_soon"
            ? "Soon"
            : "Upcoming"}
        </span>
      </Link>
    </li>
  );
}

function formatDue(r: Reminder): string {
  const dateStr = new Date(r.dueDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (r.status === "expired") {
    const overdue = Math.abs(r.daysUntil);
    return `Expired ${overdue} day${overdue === 1 ? "" : "s"} ago · ${dateStr}`;
  }
  if (r.daysUntil === 0) return `Due today · ${dateStr}`;
  return `Due in ${r.daysUntil} day${r.daysUntil === 1 ? "" : "s"} · ${dateStr}`;
}
