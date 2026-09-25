import { createServiceClient } from "@/lib/supabase/server";
import { PLANNER_SUBCATEGORY_IDS } from "@/lib/templates/peace-of-mind-v2";
import { listPlannerLetters } from "@/lib/db/planner-letters";
import { listPlannerApologies } from "@/lib/db/planner-apologies";
import {
  getPlannerLastWords,
} from "@/lib/db/planner-last-words";
import type { ItemKind } from "@/lib/db/item-access";
import type { WishAudience } from "@/lib/db/planner-wishes";

export interface ShareableItem {
  key: string; // stable id — sub::kind::itemId
  groupLabel: string;
  itemLabel: string;
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
}

const WISH_AUDIENCES: readonly WishAudience[] = [
  "general",
  "spouse",
  "children",
  "relatives",
  "friends",
  "pets",
  "other",
];

function wishLabel(a: WishAudience): string {
  switch (a) {
    case "general":
      return "Wishes — general";
    case "spouse":
      return "Wishes — spouse / partner";
    case "children":
      return "Wishes — children";
    case "relatives":
      return "Wishes — relatives";
    case "friends":
      return "Wishes — friends";
    case "pets":
      return "Wishes — pets";
    case "other":
      return "Wishes — other";
  }
}

// Enumerate every Planner-shareable thing an owner has content for. Used
// by the "Share all" dialog on Settings — the owner picks a grantee, ticks
// the items they want to include, and each row becomes an item_access_grant.
export async function listShareableItemsForOwner(
  ownerUserId: string
): Promise<ShareableItem[]> {
  const supabase = createServiceClient();
  const items: ShareableItem[] = [];

  // Load folder name once per referenced subcategory so we can label rows.
  const subIds = Array.from(PLANNER_SUBCATEGORY_IDS);
  const { data: subs } = await supabase
    .from("subcategories")
    .select("id, name")
    .in("id", subIds);
  const nameById = new Map<string, string>(
    ((subs as { id: string; name: string }[]) ?? []).map((s) => [s.id, s.name])
  );

  // Repeater entries (per instance) — planner-linked folders with any
  // non-default question_responses under this owner.
  const { data: instanceRows } = await supabase
    .from("question_responses")
    .select("instance_id, question_id, page_questions!inner(subcategory_id)")
    .eq("user_id", ownerUserId)
    .neq("instance_id", "default")
    .in("page_questions.subcategory_id", subIds);
  const seenInstances = new Set<string>();
  for (const r of (instanceRows as
    | {
        instance_id: string;
        question_id: string;
        page_questions: { subcategory_id: string };
      }[]
    | null) ?? []) {
    const subId = r.page_questions?.subcategory_id;
    if (!subId) continue;
    const key = `${subId}::instance::${r.instance_id}`;
    if (seenInstances.has(key)) continue;
    seenInstances.add(key);
    const label = nameById.get(subId) ?? subId;
    items.push({
      key,
      groupLabel: label,
      itemLabel: `${label} — entry ${r.instance_id}`,
      subcategoryId: subId,
      itemKind: "instance",
      itemId: r.instance_id,
    });
  }

  // Whole-form pages (per user_form) — planner-linked folders that have
  // at least one saved response under instance_id='default'. The whole
  // form is treated as one shareable "user_form" item.
  const { data: userFormRows } = await supabase
    .from("question_responses")
    .select("question_id, page_questions!inner(subcategory_id)")
    .eq("user_id", ownerUserId)
    .eq("instance_id", "default")
    .in("page_questions.subcategory_id", subIds);
  const seenForms = new Set<string>();
  for (const r of (userFormRows as
    | {
        question_id: string;
        page_questions: { subcategory_id: string };
      }[]
    | null) ?? []) {
    const subId = r.page_questions?.subcategory_id;
    if (!subId) continue;
    if (seenForms.has(subId)) continue;
    seenForms.add(subId);
    const label = nameById.get(subId) ?? subId;
    items.push({
      key: `${subId}::user_form::${ownerUserId}`,
      groupLabel: label,
      itemLabel: `${label} — details`,
      subcategoryId: subId,
      itemKind: "user_form",
      itemId: ownerUserId,
    });
  }

  // Records (legacy list-mode folders) — one shareable per record.
  const { data: recordRows } = await supabase
    .from("records")
    .select("id, title, subcategory_id")
    .eq("user_id", ownerUserId)
    .in("subcategory_id", subIds);
  for (const r of (recordRows as
    | { id: string; title: string | null; subcategory_id: string }[]
    | null) ?? []) {
    const label = nameById.get(r.subcategory_id) ?? r.subcategory_id;
    items.push({
      key: `${r.subcategory_id}::record::${r.id}`,
      groupLabel: label,
      itemLabel: r.title || "Untitled record",
      subcategoryId: r.subcategory_id,
      itemKind: "record",
      itemId: r.id,
    });
  }

  // Files uploaded into a Planner-linked folder.
  const { data: fileRows } = await supabase
    .from("file_objects")
    .select("id, filename, subcategory_id")
    .eq("user_id", ownerUserId)
    .in("subcategory_id", subIds);
  for (const f of (fileRows as
    | { id: string; filename: string; subcategory_id: string }[]
    | null) ?? []) {
    const label = nameById.get(f.subcategory_id) ?? f.subcategory_id;
    items.push({
      key: `${f.subcategory_id}::file::${f.id}`,
      groupLabel: label,
      itemLabel: f.filename,
      subcategoryId: f.subcategory_id,
      itemKind: "file",
      itemId: f.id,
    });
  }

  // Planner-only kinds ----------------------------------------------------
  const letters = await listPlannerLetters(ownerUserId);
  for (const l of letters) {
    items.push({
      key: `::planner_letter::${l.id}`,
      groupLabel: "Letters",
      itemLabel: `Letter to ${l.recipient ?? "someone"}`,
      subcategoryId: null,
      itemKind: "planner_letter",
      itemId: String(l.id),
    });
  }

  const apologies = await listPlannerApologies(ownerUserId);
  for (const a of apologies) {
    items.push({
      key: `::planner_apology::${a.id}`,
      groupLabel: "Apologies",
      itemLabel: `Apology to ${a.recipient ?? "someone"}`,
      subcategoryId: null,
      itemKind: "planner_apology",
      itemId: String(a.id),
    });
  }

  const { data: wishRows } = await supabase
    .from("planner_wishes")
    .select("audience, body")
    .eq("user_id", ownerUserId);
  const wishBodies = new Map<string, string>(
    ((wishRows as { audience: string; body: string | null }[]) ?? []).map(
      (r) => [r.audience, r.body ?? ""]
    )
  );
  for (const aud of WISH_AUDIENCES) {
    const body = wishBodies.get(aud);
    if (!body || body.trim().length === 0) continue;
    items.push({
      key: `::planner_wish::${aud}`,
      groupLabel: "Wishes",
      itemLabel: wishLabel(aud),
      subcategoryId: null,
      itemKind: "planner_wish",
      itemId: aud,
    });
  }

  const lastWords = await getPlannerLastWords(ownerUserId);
  if (lastWords?.body && lastWords.body.trim().length > 0) {
    items.push({
      key: `::planner_last_words::${ownerUserId}`,
      groupLabel: "Last words",
      itemLabel: "Last words",
      subcategoryId: null,
      itemKind: "planner_last_words",
      itemId: ownerUserId,
    });
  }

  // Stable ordering: group first, then item label.
  items.sort((a, b) => {
    if (a.groupLabel !== b.groupLabel)
      return a.groupLabel.localeCompare(b.groupLabel);
    return a.itemLabel.localeCompare(b.itemLabel);
  });
  return items;
}
