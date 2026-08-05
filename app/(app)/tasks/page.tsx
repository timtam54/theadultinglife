import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listTasksForUser } from "@/lib/db/tasks";
import { listRecords } from "@/lib/db/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { TasksList } from "@/components/TasksList";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Your running list of things to do.",
};

export default async function TasksPage() {
  const session = await requireSession();
  const [tasks, records] = await Promise.all([
    listTasksForUser(session.user.id),
    listRecords(session.user.id),
  ]);
  const recordOptions = records.map((r) => ({
    id: r.id,
    title: r.title,
    categoryId: r.category_id,
    categoryLabel: CATEGORY_LABELS[r.category_id],
  }));

  const openCount = tasks.filter((t) => !t.completed_at).length;

  return (
    <div>
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 shrink-0"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="m8 12 3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
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
              : `${openCount} open task${openCount === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      <TasksList initialTasks={tasks} records={recordOptions} />
    </div>
  );
}
