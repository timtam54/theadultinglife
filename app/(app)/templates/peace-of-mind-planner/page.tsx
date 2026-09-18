import type { Metadata } from "next";
import { Suspense } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  PLANNER_SECTIONS,
  sectionsByGroup,
} from "@/lib/templates/peace-of-mind-v2";
import { countRecordsBySubcategory } from "@/lib/services/planner";
import { createServiceClient } from "@/lib/supabase/server";
import { PlannerTourLauncher } from "@/components/tour/PlannerTourLauncher";

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

  // Own records in each organiser-fed subcategory.
  const recordCounts = await countRecordsBySubcategory(
    session.user.id,
    organiserSubIds
  );

  // Grants received by this viewer, per subcategory (any item kind counts).
  const supabase = createServiceClient();
  const { data: grantRows } = await supabase
    .from("item_access_grants")
    .select("subcategory_id, item_kind")
    .eq("grantee_user_id", session.user.id);
  const grantCounts = new Map<string, number>();
  let plannerOnlyGrants = 0;
  for (const g of (grantRows ?? []) as {
    subcategory_id: string | null;
    item_kind: string;
  }[]) {
    if (g.subcategory_id) {
      grantCounts.set(
        g.subcategory_id,
        (grantCounts.get(g.subcategory_id) ?? 0) + 1
      );
    } else {
      // Planner-only grant (letters / apologies / wishes / last-words).
      plannerOnlyGrants += 1;
    }
  }

  // Grantee-only mode: user has no own Planner content in any Organiser-fed
  // section, but has been granted at least one item. In that mode we hide
  // sections that are empty for THEM and have no grants either — otherwise
  // the page is a wall of "No entries yet" rows that dwarf the couple of
  // things actually shared with them. Owner-mode users still see every
  // section as they always have.
  const hasAnyOwnOrganiserContent = Array.from(recordCounts.values()).some(
    (n) => n > 0
  );
  // Planner-only content (letters, apologies, wishes, last words) also
  // counts as owner-mode. Cheap head-count against each table.
  const [
    { count: ownLetters },
    { count: ownApologies },
    { count: ownWishes },
    { count: ownLastWords },
  ] = await Promise.all([
    supabase
      .from("planner_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_apologies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_wishes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_last_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
  ]);
  const hasAnyOwnPlannerOnlyContent =
    (ownLetters ?? 0) + (ownApologies ?? 0) + (ownWishes ?? 0) + (ownLastWords ?? 0) >
    0;
  const isGranteeOnly =
    !hasAnyOwnOrganiserContent &&
    !hasAnyOwnPlannerOnlyContent &&
    (grantCounts.size > 0 || plannerOnlyGrants > 0);

  const groups = sectionsByGroup();
  const groupOrder = Array.from(groups.keys());

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/dashboard" className="hover:text-tal-plum">
          Dashboard
        </Link>
      </div>
      <h1
        data-tour="planner-index"
        className="font-display text-3xl text-tal-plum mb-2"
      >
        Peace of Mind Planner
      </h1>
      <p className="text-tal-plum-soft mb-6 max-w-2xl">
        The things your family would need to know if something happened to you.
        Shared sections show the same data as your Organiser — add, edit or
        delete from either view.
      </p>

      {(grantCounts.size > 0 || plannerOnlyGrants > 0) && (
        <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
          <div className="text-sm font-medium text-violet-900 mb-1">
            Shared with you
          </div>
          <div className="text-xs text-violet-900/80">
            Other Adulting Life users have shared items with you. Open any
            section below marked{" "}
            <span className="font-semibold">Shared</span> to see what they
            shared.
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groupOrder.map((group) => {
          const allSections = groups.get(group) ?? [];
          // Grantee-only mode filter: drop sections that have no grants for
          // this user. Everything is empty for them anyway if they don't
          // have their own account content, and showing 30 empty rows to
          // point at 2 shared items is bad UX.
          const sections = isGranteeOnly
            ? allSections.filter((s) => {
                if (
                  s.kind === "organiser" &&
                  s.organiserSubcategoryId &&
                  (grantCounts.get(s.organiserSubcategoryId) ?? 0) > 0
                ) {
                  return true;
                }
                // Planner-only sections (letters, apologies, wishes, last
                // words) — keep only if we've received any planner-only
                // grants. We can't tell WHICH one without more queries,
                // but showing all four when at least one is shared is
                // still much better than showing everything.
                if (s.kind === "planner-only" && plannerOnlyGrants > 0) {
                  return true;
                }
                return false;
              })
            : allSections;
          // Whole group might collapse to zero visible sections; skip it.
          if (sections.length === 0) return null;
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
                  const sharedCount =
                    s.kind === "organiser" && s.organiserSubcategoryId
                      ? (grantCounts.get(s.organiserSubcategoryId) ?? 0)
                      : 0;
                  const tourAnchor =
                    s.slug === "letters"
                      ? "planner-section-letters"
                      : s.slug === "bank-accounts"
                        ? "planner-shared-sections"
                        : undefined;
                  return (
                    <li key={s.slug} data-tour={tourAnchor}>
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
                            <div className="flex items-center gap-2">
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
                              {sharedCount > 0 && (
                                <span
                                  className="text-[10px] uppercase tracking-wider font-semibold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full"
                                  title={`${sharedCount} item${sharedCount === 1 ? "" : "s"} shared with you`}
                                >
                                  {sharedCount} shared
                                </span>
                              )}
                            </div>
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
      {/* Planner-specific interactive tour — opt-in only. Fires when the
          user clicks the compass FAB or the "Replay Planner tour" button
          in Settings (both push ?planner-tour=start). We deliberately do
          NOT auto-launch on every visit — that was annoying and the
          floating tour button on the layout is discoverable enough. */}
      <Suspense fallback={null}>
        <PlannerTourLauncher shouldAutoLaunch={false} />
      </Suspense>
    </div>
  );
}
