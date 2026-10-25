import { findUserById, isUserInFamilyGroup, listUsersInFamilyGroup } from "@/lib/db/users";
import { listGrantsByGrantee, listGrantsByOwner } from "@/lib/db/item-access";
import { listSubcategoriesForUser } from "@/lib/db/subcategories";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { buildEmergencyView } from "@/lib/services/emergency";
import { loadPlannerPeople } from "@/lib/services/planner-people";
import { loadPlannerDocument, type PlannerDocument } from "@/lib/services/planner-document";
import { loadFolderEntries } from "@/lib/services/folder-pdf";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import type { DocPdfGroup, DocPdfInput } from "@/lib/services/doc-pdf";
import { SECTION_COLOUR } from "@/lib/services/pdf-brand";
import { listMealPlanEntries, MEAL_SLOTS } from "@/lib/db/meal-plan";
import { listBudgetsForUser } from "@/lib/db/budgets";
import { BUCKETS, PERIOD_LABELS, REPEAT_LABELS, bucketTitle, summariseBudget } from "@/lib/budget";
import { listVehicleLogbooks } from "@/lib/db/vehicle-logbook";
import { COST_LABELS, LOGBOOK_COST_FIELDS, summariseLogbook, tripKm } from "@/lib/vehicle-logbook";
import { getLifeGoalProfile, listLifeGoals } from "@/lib/db/life-goals";
import type { Session } from "@/lib/auth/session";

// Builds the content for each kind of app document, ready for the shared
// branded PDF layout (lib/services/doc-pdf). Used by both "Download PDF"
// (/api/export/doc) and "Share PDF" (/api/export/doc/email), so a document
// is identical whichever button is pressed. Access is checked here.

export type DocKind = "section" | "emergency" | "family" | "planner" | "planner-section" | "planner-shared" | "meal-plan" | "budget" | "logbook" | "life-goals";

export class DocNotFound extends Error {}

function nameOf(u: { first_name: string | null; last_name: string | null; name: string | null; email: string | null } | null) {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "";
}

/** Yourself, or a family member you're allowed to see. */
async function ownerFor(session: Session, requested: string | null | undefined): Promise<string> {
  if (!requested || requested === session.user.id) return session.user.id;
  if (!(await isUserInFamilyGroup(requested, session.user.familyGroupId))) throw new DocNotFound();
  return requested;
}

function plannerGroups(doc: PlannerDocument, onlySlug?: string): DocPdfGroup[] {
  return doc.groups
    .map((g) => ({
      heading: g.title,
      sections: g.sections
        .filter((sec) => !onlySlug || sec.slug === onlySlug)
        .map((sec) => ({
          heading: sec.title,
          hint: sec.hint,
          blocks: sec.blocks.map((b) => ({
            title: b.title,
            fields: b.fields,
            body: b.body ?? null,
            note:
              [...b.images.map((i) => i.filename), ...b.files].length > 0
                ? `Attached: ${[...b.images.map((i) => i.filename), ...b.files].join(" · ")}`
                : null,
          })),
        })),
    }))
    .filter((g) => g.sections.length > 0);
}

export async function buildDoc(
  session: Session,
  kind: DocKind,
  params: Record<string, string | null | undefined>
): Promise<DocPdfInput> {
  if (kind === "section") {
    const category = params.category ?? "";
    if (!isCategoryId(category)) throw new DocNotFound();
    const ownerId = await ownerFor(session, params.user);
    const owner = await findUserById(ownerId);
    const folders = await listSubcategoriesForUser(ownerId, category);
    const sections = [];
    for (const f of folders) {
      const { entries } = await loadFolderEntries({ ownerUserId: ownerId, subcategoryId: f.id }).catch(() => ({ entries: [] }));
      sections.push({
        heading: f.name,
        hint: f.hint,
        blocks: entries.map((e) => ({ title: e.title, fields: e.fields })),
      });
    }
    const label = CATEGORY_LABELS[category];
    return {
      title: label,
      subtitle: nameOf(owner) || null,
      groups: [{ heading: `${label} — The Adulting Life Organiser`, sections }],
      emptyText: "Nothing has been filled in in this section yet.",
      accent: SECTION_COLOUR[category],
      filename: `${label}${nameOf(owner) ? ` - ${nameOf(owner)}` : ""}.pdf`,
    };
  }

  if (kind === "emergency") {
    const { sections } = await buildEmergencyView(session.user.familyGroupId);
    return {
      title: "Emergency information",
      subtitle: "Contacts, medications, insurance and important documents",
      groups: sections
        .filter((sec) => sec.records.length > 0)
        .map((sec) => ({
          heading: sec.label,
          sections: [
            {
              blocks: sec.records.map((r) => ({
                title: r.userName ? `${r.userName} — ${r.title}` : r.title,
                fields: r.fields.filter((f) => f.value && f.value !== r.title),
              })),
            },
          ],
        })),
      emptyText: "No emergency information has been added yet.",
      accent: SECTION_COLOUR.employment,
      filename: "Emergency information.pdf",
    };
  }

  if (kind === "family") {
    const users = await listUsersInFamilyGroup(session.user.familyGroupId);
    const people = await loadPlannerPeople(session.user.id, session.user.familyGroupId);
    const all = [people.self, ...people.family].filter((p): p is NonNullable<typeof p> => Boolean(p));
    const kindById = new Map(users.map((u) => [u.id, u.member_kind]));
    return {
      title: "Family members",
      subtitle: "People in this family and their key details",
      groups: [
        {
          heading: "Family members",
          sections: [
            {
              blocks: all.map((p) => ({
                title: p.name,
                fields: [{ label: "Member", value: kindById.get(p.id) === "child" ? "Child" : "Adult" }, ...p.fields],
              })),
            },
          ],
        },
      ],
      filename: "Family members.pdf",
      accent: SECTION_COLOUR.personal,
    };
  }

  if (kind === "planner" || kind === "planner-section") {
    const doc = await loadPlannerDocument({ ownerUserId: session.user.id });
    const slug = kind === "planner-section" ? params.section ?? "" : undefined;
    const groups = plannerGroups(doc, slug);
    const sectionTitle = slug
      ? (doc.groups.flatMap((g) => g.sections).find((s) => s.slug === slug)?.title ?? plannerSectionBySlug(slug)?.title ?? null)
      : null;
    return {
      title: sectionTitle ?? "Peace of Mind Planner",
      subtitle: doc.ownerName || null,
      groups,
      variant: "planner",
      emptyText: sectionTitle ? "Nothing has been added to this section yet." : "Nothing has been added to the Planner yet.",
      filename: `${sectionTitle ?? "Peace of Mind Planner"}${doc.ownerName ? ` - ${doc.ownerName}` : ""}.pdf`,
    };
  }

  if (kind === "planner-shared") {
    // ?with=<person> — what I've shared with them; ?from=<person> — what they shared with me.
    let ids: { ownerUserId: string; granteeUserId: string } | null = null;
    if (params.with) {
      const grants = await listGrantsByOwner(session.user.id);
      if (grants.some((g) => g.grantee_user_id === params.with)) ids = { ownerUserId: session.user.id, granteeUserId: params.with };
    } else if (params.from) {
      const grants = await listGrantsByGrantee(session.user.id);
      if (grants.some((g) => g.owner_user_id === params.from)) ids = { ownerUserId: params.from, granteeUserId: session.user.id };
    }
    if (!ids) throw new DocNotFound();
    const doc = await loadPlannerDocument(ids);
    return {
      title: "Peace of Mind Planner",
      subtitle: doc.ownerName || null,
      intro: doc.preparedFor
        ? `Prepared for ${doc.preparedFor} — the information ${doc.ownerName || "the owner"} has chosen to share with them.`
        : null,
      groups: plannerGroups(doc),
      variant: "planner",
      emptyText: "Nothing has been shared yet.",
      filename: `Peace of Mind Planner - for ${doc.preparedFor ?? "trusted person"}.pdf`,
    };
  }

  if (kind === "meal-plan") {
    // ?user=<person>&start=yyyy-MM-dd&end=yyyy-MM-dd — the range on screen.
    const ownerId = await ownerFor(session, params.user);
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const start = params.start ?? "";
    const end = params.end ?? "";
    if (!iso.test(start) || !iso.test(end) || end < start) throw new DocNotFound();
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
    if (days > 62) throw new DocNotFound();
    const [owner, rows] = await Promise.all([findUserById(ownerId), listMealPlanEntries(ownerId, start, end)]);
    const meal = new Map(rows.map((r) => [`${r.plan_date}|${r.slot}`, r.body]));
    const slotLabel: Record<string, string> = { breakfast: "Breakfast", snack1: "Snack 1", lunch: "Lunch", snack2: "Snack 2", dinner: "Dinner" };
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-AU", { timeZone: "UTC", ...o });

    // One group per week (Monday start), one block per day, then the week's notes.
    const groups: DocPdfGroup[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.parse(start) + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000);
      const heading = `Week of ${fmt(monday, { day: "numeric", month: "short", year: "numeric" })}`;
      let g = groups[groups.length - 1];
      if (!g || g.heading !== heading) {
        g = { heading, sections: [{ blocks: [] }] };
        groups.push(g);
      }
      g.sections[0].blocks.push({
        title: fmt(d, { weekday: "long", day: "numeric", month: "short" }),
        fields: MEAL_SLOTS.map((slot) => ({ label: slotLabel[slot], value: meal.get(`${key}|${slot}`) ?? "" })),
      });
      const notes = meal.get(`${monday.toISOString().slice(0, 10)}|notes`);
      if (d.getUTCDay() === 0 || i === days - 1) {
        if (notes) g.sections[0].blocks.push({ title: "Notes / prep", body: notes });
      }
    }
    const range =
      start === end
        ? fmt(new Date(Date.parse(start)), { weekday: "long", day: "numeric", month: "short", year: "numeric" })
        : `${fmt(new Date(Date.parse(start)), { day: "numeric", month: "short" })} – ${fmt(new Date(Date.parse(end)), { day: "numeric", month: "short", year: "numeric" })}`;
    return {
      title: "Meal Plan",
      subtitle: [nameOf(owner), range].filter(Boolean).join(" · "),
      groups,
      emptyText: "No meals have been planned for these dates yet.",
      filename: `Meal Plan - ${range}.pdf`,
      accent: SECTION_COLOUR.health,
    };
  }

  if (kind === "budget") {
    // ?user=<person>&id=<budget> — the budget on screen.
    const ownerId = await ownerFor(session, params.user);
    const [owner, budgets] = await Promise.all([findUserById(ownerId), listBudgetsForUser(ownerId)]);
    const b = budgets.find((x) => x.id === params.id);
    if (!b) throw new DocNotFound();
    const sum = summariseBudget(b, b.lines);
    const period = PERIOD_LABELS[b.period];
    const money = (n: number | null | undefined) =>
      n == null ? "" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
    const date = (iso: string | null) =>
      iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "";
    const lineFields = (section: string) =>
      b.lines
        .filter((l) => l.section === section && (l.amount != null || l.label))
        .map((l) => ({
          label: l.label || "—",
          value: [
            money(l.amount),
            l.due_date ? `due ${date(l.due_date)}` : "",
            l.repeats ? REPEAT_LABELS[l.repeats].toLowerCase() : "",
            l.notes ?? "",
          ]
            .filter(Boolean)
            .join(" · "),
        }));
    return {
      title: b.name || "My budget",
      subtitle: [nameOf(owner), `${period} budget`, b.start_date ? `from ${date(b.start_date)}` : ""].filter(Boolean).join(" · "),
      groups: [
        {
          heading: "Summary",
          sections: [
            {
              blocks: [
                {
                  fields: [
                    { label: "Total income", value: money(sum.totalIncome) || "Not entered yet" },
                    ...BUCKETS.map((bk) => ({
                      label: `${bucketTitle(b, bk)} (${sum.buckets[bk].pct}%)`,
                      value: `${money(sum.buckets[bk].assigned)} of ${money(sum.buckets[bk].suggested) || "—"}${
                        sum.buckets[bk].left != null ? ` · ${money(sum.buckets[bk].left)} left` : ""
                      }`,
                    })),
                    { label: "Left to assign", value: money(sum.leftToAssign) || "—" },
                  ],
                },
              ],
            },
          ],
        },
        { heading: "Money coming in", sections: [{ blocks: [{ fields: lineFields("income") }] }] },
        ...BUCKETS.map((bk) => ({
          heading: bucketTitle(b, bk),
          sections: [{ blocks: [{ fields: lineFields(bk) }] }],
        })),
      ].map((g) => ({ ...g, sections: g.sections.map((sec) => ({ ...sec, blocks: sec.blocks.filter((bl) => bl.fields.length) })) })),
      emptyText: "Nothing has been added to this budget yet.",
      filename: `${b.name || "Budget"} - ${period}.pdf`,
      accent: SECTION_COLOUR.admin,
    };
  }

  if (kind === "logbook") {
    // ?user=<person>&id=<logbook> — the logbook on screen.
    const ownerId = await ownerFor(session, params.user);
    const [owner, books] = await Promise.all([findUserById(ownerId), listVehicleLogbooks(ownerId)]);
    const l = books.find((x) => x.id === params.id);
    if (!l) throw new DocNotFound();
    const sum = summariseLogbook(l);
    const year = `${l.tax_year}–${String((l.tax_year + 1) % 100).padStart(2, "0")}`;
    const date = (iso: string | null) =>
      iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "";
    const km = (n: number | null) => (n == null ? "" : `${n.toLocaleString("en-AU")} km`);
    const money = (n: number | null) => (n == null ? "" : Number(n).toLocaleString("en-AU", { style: "currency", currency: "AUD" }));
    const yesNo = (v: boolean | null) => (v == null ? "" : v ? "Yes" : "No");
    const nonEmpty = (f: { label: string; value: string }[]) => f.filter((x) => x.value);
    return {
      title: "Vehicle Logbook",
      subtitle: [nameOf(owner), l.vehicle_label, `${year} tax year`].filter(Boolean).join(" · "),
      groups: [
        {
          heading: "Logbook period",
          sections: [
            {
              blocks: [
                {
                  fields: nonEmpty([
                    { label: "Vehicle", value: l.vehicle_label },
                    { label: "Logbook start", value: date(l.logbook_start) },
                    { label: "Logbook end", value: date(l.logbook_end) },
                    { label: "Days recorded", value: sum.daysRecorded == null ? "" : String(sum.daysRecorded) },
                    { label: "Odometer at start", value: km(l.odo_start) },
                    { label: "Odometer at end", value: km(l.odo_end) },
                    { label: "Total kilometres", value: km(sum.totalKm) },
                    { label: "Work kilometres", value: km(sum.workKm) },
                    { label: "Private kilometres", value: km(sum.privateKm) },
                    { label: "Work-use percentage", value: sum.workUsePct == null ? "Not yet — " + sum.workUseBlockers.join("; ") : `${sum.workUsePct.toFixed(1)}%` },
                    { label: "Reflects usual work travel", value: yesNo(l.reflects_usual) },
                    { label: "All work trips recorded", value: yesNo(l.all_trips_recorded) },
                  ]),
                },
              ],
            },
          ],
        },
        {
          heading: "Car expenses for the year",
          sections: [
            {
              blocks: [
                {
                  fields: nonEmpty([
                    ...LOGBOOK_COST_FIELDS.map((f) => ({ label: COST_LABELS[f], value: money(l[f]) })),
                    { label: "Total costs", value: money(sum.totalCosts) },
                    { label: "Estimated deduction", value: money(sum.estimatedDeduction) },
                    { label: "Kilometres for the whole year", value: km(sum.annualKm) },
                  ]),
                },
              ],
            },
          ],
        },
        {
          heading: `Trips (${l.trips.length})`,
          sections: [
            {
              blocks: l.trips
                .filter((t) => t.start_date || t.from_to || t.reason)
                .map((t) => ({
                  title: [date(t.start_date), t.end_date && t.end_date !== t.start_date ? `– ${date(t.end_date)}` : ""].filter(Boolean).join(" ") || "Trip",
                  fields: nonEmpty([
                    { label: "From / to", value: t.from_to ?? "" },
                    { label: "Reason", value: t.reason ?? "" },
                    { label: "Type", value: t.trip_type === "work" ? "Work" : t.trip_type === "private" ? "Private" : "" },
                    { label: "Odometer", value: t.odo_start != null || t.odo_end != null ? `${t.odo_start ?? "?"} → ${t.odo_end ?? "?"}` : "" },
                    { label: "Kilometres", value: km(tripKm(t)) },
                  ]),
                })),
            },
          ],
        },
      ],
      emptyText: "Nothing has been recorded in this logbook yet.",
      filename: `Vehicle Logbook - ${l.vehicle_label} ${year}.pdf`,
      accent: SECTION_COLOUR.admin,
    };
  }

  if (kind === "life-goals") {
    // ?user=<person> — the whole Life Goals & Plans page.
    const ownerId = await ownerFor(session, params.user);
    const [owner, profile, goals] = await Promise.all([findUserById(ownerId), getLifeGoalProfile(ownerId), listLifeGoals(ownerId)]);
    const date = (iso: string | null) =>
      iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "";
    const statusLabel: Record<string, string> = { not_started: "Not started", in_progress: "In progress", done: "Done" };
    const nonEmpty = (f: { label: string; value: string }[]) => f.filter((x) => x.value);
    const ordered = [...goals].sort((a, b) => (a.id === profile?.focus_goal_id ? -1 : b.id === profile?.focus_goal_id ? 1 : 0));
    return {
      title: "Life Goals & Plans",
      subtitle: nameOf(owner) || null,
      groups: [
        {
          heading: "The life I want to build",
          sections: [
            {
              blocks: [
                {
                  fields: nonEmpty([
                    { label: "What would I like my life to look and feel like?", value: profile?.life_vision ?? "" },
                    { label: "What is going well?", value: profile?.going_well ?? "" },
                    { label: "What needs to change?", value: profile?.needs_change ?? "" },
                  ]),
                },
              ].filter((b) => b.fields.length),
            },
          ],
        },
        ...ordered.map((g) => ({
          heading: `${g.id === profile?.focus_goal_id ? "★ " : ""}${g.title || "Goal"}`,
          sections: [
            {
              blocks: [
                {
                  fields: nonEmpty([
                    { label: "Life area", value: g.life_area ?? "" },
                    { label: "Why is this important to me?", value: g.why ?? "" },
                    { label: "How will I know I have achieved it?", value: g.success_measure ?? "" },
                    { label: "My target date", value: date(g.target_date) },
                    { label: "My next check-in", value: date(g.checkin_date) },
                    { label: "What might get in the way?", value: g.obstacles ?? "" },
                    { label: "What will help me keep going?", value: g.supports ?? "" },
                  ]),
                },
                ...g.steps
                  .filter((st) => st.action)
                  .map((st, i) => ({
                    title: `Step ${i + 1}: ${st.action}`,
                    fields: nonEmpty([
                      { label: "Status", value: statusLabel[st.status] ?? "" },
                      { label: "Due date", value: date(st.due_date) },
                      { label: "What I need / who can help", value: st.needs ?? "" },
                      { label: "Notes", value: st.notes ?? "" },
                    ]),
                  })),
              ].filter((b) => b.fields.length || ("title" in b && b.title)),
            },
          ],
        })),
      ],
      emptyText: "No goals have been added yet.",
      filename: `Life Goals & Plans${nameOf(owner) ? ` - ${nameOf(owner)}` : ""}.pdf`,
      accent: SECTION_COLOUR.health,
    };
  }

  throw new DocNotFound();
}
