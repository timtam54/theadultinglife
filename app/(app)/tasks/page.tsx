import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listTasksForUser } from "@/lib/db/tasks";
import { listRecords } from "@/lib/db/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { TasksList } from "@/components/TasksList";
import { loadOnboardingSummary } from "@/lib/services/onboarding";
import { dashboardThumbnail } from "@/lib/thumbnails";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Your running list of things to do.",
};

export default async function TasksPage() {
  const session = await requireSession();
  const [tasks, records, onboarding] = await Promise.all([
    listTasksForUser(session.user.id),
    listRecords(session.user.id),
    loadOnboardingSummary(session.user.id, session.user.familyGroupId),
  ]);
  const recordOptions = records.map((r) => ({
    id: r.id,
    title: r.title,
    categoryId: r.category_id,
    categoryLabel: CATEGORY_LABELS[r.category_id],
  }));

  const openTaskCount = tasks.filter((t) => !t.completed_at).length;
  const openCount = openTaskCount + onboarding.outstandingCount;

  return (
    <div>
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dashboardThumbnail("tasks")}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover shrink-0"
          />
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Tasks
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {openCount === 0 ? "You're all caught up" : "Your list"}
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">
            {openCount === 0
              ? "nothing open"
              : `${openCount} thing${openCount === 1 ? "" : "s"} to do`}
          </span>
        </div>
      </div>

      {onboarding.outstandingCount > 0 && (
        <section className="rounded-2xl border border-tal-line bg-white p-5 mb-6">
          <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-display text-lg text-tal-plum">
              Setup steps
            </h2>
            <span className="text-xs text-tal-plum-soft">
              {onboarding.doneCount} of {onboarding.totalCount} done · {onboarding.pct}%
            </span>
          </div>
          <ul className="space-y-2">
            {onboarding.tasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={t.href}
                  className={
                    "flex items-center gap-3 rounded-xl border p-3 transition " +
                    (t.done
                      ? "border-tal-line bg-tal-cream-soft/60"
                      : "border-tal-line bg-white hover:shadow-sm")
                  }
                >
                  <span
                    className={
                      "inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 " +
                      (t.done
                        ? "bg-emerald-500 text-white"
                        : "border border-tal-line bg-white")
                    }
                    aria-hidden
                  >
                    {t.done && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="m6 12 4 4 8-9"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={
                      "text-sm " +
                      (t.done ? "text-tal-plum-soft line-through" : "text-tal-plum")
                    }
                  >
                    {t.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TasksList initialTasks={tasks} records={recordOptions} />
    </div>
  );
}
