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
import type { Session } from "@/lib/auth/session";

// Builds the content for each kind of app document, ready for the shared
// branded PDF layout (lib/services/doc-pdf). Used by both "Download PDF"
// (/api/export/doc) and "Share PDF" (/api/export/doc/email), so a document
// is identical whichever button is pressed. Access is checked here.

export type DocKind = "section" | "emergency" | "family" | "planner" | "planner-section" | "planner-shared" | "meal-plan";

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

  throw new DocNotFound();
}
