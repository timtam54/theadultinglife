import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  listRemindersForFamily,
  type Reminder,
} from "@/lib/services/reminders";
import { CustomReminderRow } from "@/components/CustomReminderRow";
import { truncateForRow } from "@/lib/ui/truncate";

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
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
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
              r.source === "custom" ? (
                <CustomReminderRow
                  key={r.id}
                  id={r.id.replace(/^custom:/, "")}
                  title={r.title}
                  status={r.status}
                  dueLabel={formatDue(r)}
                  recurrence={r.recurrence ?? null}
                  linkedRecord={
                    r.linkedRecord
                      ? {
                          title: r.linkedRecord.title,
                          href: `/records/${r.linkedRecord.categoryId}/r/${r.linkedRecord.id}`,
                        }
                      : null
                  }
                />
              ) : (
                <ReminderRow key={r.id} r={r} />
              )
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-tal-plum mb-3">Upcoming</h2>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              r.source === "custom" ? (
                <CustomReminderRow
                  key={r.id}
                  id={r.id.replace(/^custom:/, "")}
                  title={r.title}
                  status={r.status}
                  dueLabel={formatDue(r)}
                  recurrence={r.recurrence ?? null}
                  linkedRecord={
                    r.linkedRecord
                      ? {
                          title: r.linkedRecord.title,
                          href: `/records/${r.linkedRecord.categoryId}/r/${r.linkedRecord.id}`,
                        }
                      : null
                  }
                />
              ) : (
                <ReminderRow key={r.id} r={r} />
              )
            ))}
          </ul>
        </section>
      )}

      {all.length === 0 && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-tal-cream-soft text-tal-plum mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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
          </div>
          <div className="font-display text-xl text-tal-plum mb-1">
            Nothing on the horizon
          </div>
          <p className="text-sm text-tal-plum-soft mb-4 max-w-md mx-auto">
            Add a reminder for anything with a date — a car service, a booking,
            a renewal — and we&apos;ll nudge you 7 days before.
          </p>
          <Link
            href="/reminders/new"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add your first reminder
          </Link>
        </div>
      )}
    </div>
  );
}

function ReminderRow({ r }: { r: Reminder }) {
  return (
    <li className="min-w-0">
      <Link
        href={r.href}
        className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm min-w-0"
      >
        <div className="min-w-0 flex-1">
          <div className="font-medium text-tal-plum break-all" title={r.title}>
            {truncateForRow(r.title, 40)}
          </div>
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
  const dateStr = new Date(r.dueDate).toLocaleDateString("en-AU", {
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
