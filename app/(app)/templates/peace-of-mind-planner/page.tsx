import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  PLANNER_SECTIONS,
  sectionsByGroup,
} from "@/lib/templates/peace-of-mind-v2";
import { countRecordsBySubcategory } from "@/lib/services/planner";

export const metadata: Metadata = {
  title: "Peace of Mind Planner",
  description:
    "Your Peace of Mind Planner — the things your family would need to know.",
};

export default async function PeaceOfMindPlannerPage() {
  const session = await requireSession();

  const organiserSubIds = PLANNER_SECTIONS.filter(
    (s) => s.kind === "organiser" && s.organiserSubcategoryId
  ).map((s) => s.organiserSubcategoryId as string);

  const recordCounts = await countRecordsBySubcategory(
    session.user.id,
    organiserSubIds
  );

  const groups = sectionsByGroup();
  const groupOrder = Array.from(groups.keys());

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/dashboard" className="hover:text-tal-plum">
          Dashboard
        </Link>
      </div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Peace of Mind Planner
      </h1>
      <p className="text-tal-plum-soft mb-6 max-w-2xl">
        The things your family would need to know if something happened to you.
        Shared sections show the same data as your Organiser — add, edit or
        delete from either view.
      </p>

      <div className="space-y-6">
        {groupOrder.map((group) => {
          const sections = groups.get(group) ?? [];
          return (
            <section key={group}>
              <h2 className="font-display text-lg text-tal-plum mb-2">
                {group}
              </h2>
              <ul className="space-y-2">
                {sections.map((s) => {
                  const recordCount =
                    s.kind === "organiser" && s.organiserSubcategoryId
                      ? (recordCounts.get(s.organiserSubcategoryId) ?? 0)
                      : 0;
                  return (
                    <li key={s.slug}>
                      <Link
                        href={`/templates/peace-of-mind-planner/${s.slug}`}
                        className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            aria-hidden
                            className={
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                              (s.kind === "organiser"
                                ? "bg-tal-cream-soft text-tal-plum ring-1 ring-tal-line"
                                : "bg-white text-tal-plum-soft ring-1 ring-dashed ring-tal-line")
                            }
                            title={
                              s.kind === "organiser"
                                ? "Shared with Organiser"
                                : "Planner-only"
                            }
                          >
                            {s.kind === "organiser" ? "↔" : "◇"}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-tal-plum">
                              {s.title}
                            </div>
                            {s.hint && (
                              <div className="text-xs text-tal-plum-soft mt-0.5">
                                {s.hint}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {s.kind === "organiser" ? (
                            <span
                              className={
                                "text-xs " +
                                (recordCount > 0
                                  ? "text-green-700"
                                  : "text-tal-plum-soft")
                              }
                            >
                              {recordCount > 0
                                ? `${recordCount} ${recordCount === 1 ? "entry" : "entries"}`
                                : "No entries yet"}
                            </span>
                          ) : (
                            <span className="text-xs text-tal-plum-soft">
                              Planner-only
                            </span>
                          )}
                          <span className="text-sm text-tal-plum-soft">→</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
