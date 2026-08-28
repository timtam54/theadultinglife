import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";
import {
  listGrantedItemsForGrantee,
  type ItemKind,
} from "@/lib/db/item-access";
import type { PageQuestionRow } from "@/lib/db/types";

// Everything a grantee can see for one Planner section, grouped by owner.
// Loads the underlying rows from the right table based on item_kind.

export interface SharedItemBase {
  grantId: number;
  ownerUserId: string;
  ownerName: string;
  itemKind: ItemKind;
  itemId: string;
}

export interface SharedInstance extends SharedItemBase {
  itemKind: "instance";
  fields: { label: string; value: string }[];
}

export interface SharedUserForm extends SharedItemBase {
  itemKind: "user_form";
  fields: { label: string; value: string }[];
}

export interface SharedRecord extends SharedItemBase {
  itemKind: "record";
  title: string;
  expiry: string | null;
  notes: string | null;
  files: { id: string; filename: string; mimeType: string | null }[];
}

export interface SharedFile extends SharedItemBase {
  itemKind: "file";
  filename: string;
  mimeType: string | null;
}

export interface SharedPlannerText extends SharedItemBase {
  itemKind:
    | "planner_letter"
    | "planner_apology"
    | "planner_wish"
    | "planner_last_words";
  recipient: string | null;
  body: string;
}

export type SharedItem =
  | SharedInstance
  | SharedUserForm
  | SharedRecord
  | SharedFile
  | SharedPlannerText;

async function ownerName(userId: string): Promise<string> {
  const u = await findUserById(userId);
  if (!u) return "Unknown";
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Unknown"
  );
}

// Build the shared-items feed for one grantee + subcategory. Uses the section's
// underlying subcategory_id (not the Planner slug).
export async function loadSharedItemsForSection(
  granteeUserId: string,
  subcategoryId: string
): Promise<SharedItem[]> {
  const supabase = createServiceClient();

  // Pull every relevant grant kind in parallel.
  const [instances, userForms, records, files] = await Promise.all([
    listGrantedItemsForGrantee(granteeUserId, subcategoryId, "instance"),
    listGrantedItemsForGrantee(granteeUserId, subcategoryId, "user_form"),
    listGrantedItemsForGrantee(granteeUserId, subcategoryId, "record"),
    listGrantedItemsForGrantee(granteeUserId, subcategoryId, "file"),
  ]);

  const out: SharedItem[] = [];

  // ---- instances (repeatable form entries) ------------------------------
  if (instances.length > 0) {
    const { data: qData } = await supabase
      .from("page_questions")
      .select("*")
      .eq("subcategory_id", subcategoryId)
      .order("row_order")
      .order("col_start");
    const questions = (qData as PageQuestionRow[]) ?? [];
    const qById = new Map(questions.map((q) => [q.id, q]));

    for (const g of instances) {
      const { data: rData } = await supabase
        .from("question_responses")
        .select("question_id, value")
        .eq("user_id", g.owner_user_id)
        .eq("instance_id", g.item_id)
        .in("question_id", questions.map((q) => q.id));
      const responses = (rData ?? []) as { question_id: string; value: string | null }[];
      const fields = responses
        .filter((r) => r.value)
        .map((r) => ({
          label: qById.get(r.question_id)?.label ?? r.question_id,
          value: r.value ?? "",
        }));
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: "instance",
        itemId: g.item_id,
        fields,
      });
    }
  }

  // ---- user_forms (single non-repeatable form) --------------------------
  if (userForms.length > 0) {
    const { data: qData } = await supabase
      .from("page_questions")
      .select("*")
      .eq("subcategory_id", subcategoryId)
      .order("row_order")
      .order("col_start");
    const questions = (qData as PageQuestionRow[]) ?? [];
    const qById = new Map(questions.map((q) => [q.id, q]));

    for (const g of userForms) {
      const { data: rData } = await supabase
        .from("question_responses")
        .select("question_id, value")
        .eq("user_id", g.owner_user_id)
        .in("question_id", questions.map((q) => q.id));
      const responses = (rData ?? []) as { question_id: string; value: string | null }[];
      const fields = responses
        .filter((r) => r.value)
        .map((r) => ({
          label: qById.get(r.question_id)?.label ?? r.question_id,
          value: r.value ?? "",
        }));
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: "user_form",
        itemId: g.item_id,
        fields,
      });
    }
  }

  // ---- records + auto-cascaded files ------------------------------------
  for (const g of records) {
    const { data: rec } = await supabase
      .from("records")
      .select("id, title, expiry_date, notes")
      .eq("id", g.item_id)
      .maybeSingle();
    if (!rec) continue;
    const { data: attached } = await supabase
      .from("file_objects")
      .select("id, filename, mime_type")
      .eq("record_id", g.item_id);
    out.push({
      grantId: g.id,
      ownerUserId: g.owner_user_id,
      ownerName: await ownerName(g.owner_user_id),
      itemKind: "record",
      itemId: g.item_id,
      title: (rec as { title: string }).title ?? "Untitled",
      expiry: (rec as { expiry_date: string | null }).expiry_date,
      notes: (rec as { notes: string | null }).notes,
      files:
        ((attached as { id: string; filename: string; mime_type: string | null }[]) ?? []).map(
          (f) => ({ id: f.id, filename: f.filename, mimeType: f.mime_type })
        ),
    });
  }

  // ---- standalone files -------------------------------------------------
  for (const g of files) {
    const { data: f } = await supabase
      .from("file_objects")
      .select("id, filename, mime_type")
      .eq("id", g.item_id)
      .maybeSingle();
    if (!f) continue;
    const row = f as { id: string; filename: string; mime_type: string | null };
    out.push({
      grantId: g.id,
      ownerUserId: g.owner_user_id,
      ownerName: await ownerName(g.owner_user_id),
      itemKind: "file",
      itemId: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
    });
  }

  return out;
}

// Load shared items for a Planner-only section (letters / apologies / wishes /
// last-words). These have subcategory_id = null on the grant row and the
// item_kind identifies which planner_* table to read from.
export async function loadSharedPlannerItems(
  granteeUserId: string,
  kind:
    | "planner_letter"
    | "planner_apology"
    | "planner_wish"
    | "planner_last_words",
  audienceFilter?: string
): Promise<SharedPlannerText[]> {
  const supabase = createServiceClient();
  const grants = await listGrantedItemsForGrantee(granteeUserId, null, kind);
  const out: SharedPlannerText[] = [];

  for (const g of grants) {
    if (kind === "planner_letter") {
      const { data } = await supabase
        .from("planner_letters")
        .select("recipient, body")
        .eq("id", Number(g.item_id))
        .maybeSingle();
      if (!data) continue;
      const row = data as { recipient: string | null; body: string };
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: kind,
        itemId: g.item_id,
        recipient: row.recipient,
        body: row.body ?? "",
      });
    } else if (kind === "planner_apology") {
      const { data } = await supabase
        .from("planner_apologies")
        .select("recipient, body")
        .eq("id", Number(g.item_id))
        .maybeSingle();
      if (!data) continue;
      const row = data as { recipient: string | null; body: string };
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: kind,
        itemId: g.item_id,
        recipient: row.recipient,
        body: row.body ?? "",
      });
    } else if (kind === "planner_wish") {
      // For wishes the item_id IS the audience. If the caller asked for a
      // specific audience, filter to that.
      if (audienceFilter && g.item_id !== audienceFilter) continue;
      const { data } = await supabase
        .from("planner_wishes")
        .select("body")
        .eq("user_id", g.owner_user_id)
        .eq("audience", g.item_id)
        .maybeSingle();
      if (!data) continue;
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: kind,
        itemId: g.item_id,
        recipient: null,
        body: (data as { body: string }).body ?? "",
      });
    } else {
      // planner_last_words
      const { data } = await supabase
        .from("planner_last_words")
        .select("body")
        .eq("user_id", g.owner_user_id)
        .maybeSingle();
      if (!data) continue;
      out.push({
        grantId: g.id,
        ownerUserId: g.owner_user_id,
        ownerName: await ownerName(g.owner_user_id),
        itemKind: kind,
        itemId: g.item_id,
        recipient: null,
        body: (data as { body: string }).body ?? "",
      });
    }
  }
  return out;
}

// True iff the grantee has at least one grant anywhere in the app (used to
// gate the Planner nav for non-owners).
export async function granteeHasAnyGrants(
  granteeUserId: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("item_access_grants")
    .select("id", { count: "exact", head: true })
    .eq("grantee_user_id", granteeUserId)
    .limit(1);
  if (error) return false;
  return (count ?? 0) > 0;
}

// True iff the user has any of their own content in a Planner section
// (form responses, records or files under that subcategory). Used to
// decide whether to show the owner-editable form on a Planner section
// page or fall back to a grantee-only "Shared with you" view.
export async function userHasOwnContentInSubcategory(
  userId: string,
  subcategoryId: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // Check for any question_responses under this subcategory for this user.
  // We need question ids that belong to the subcategory first.
  const { data: qData } = await supabase
    .from("page_questions")
    .select("id")
    .eq("subcategory_id", subcategoryId);
  const questionIds = ((qData as { id: string }[]) ?? []).map((q) => q.id);
  if (questionIds.length > 0) {
    const { count: qrCount } = await supabase
      .from("question_responses")
      .select("question_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("question_id", questionIds)
      .not("value", "is", null)
      .limit(1);
    if ((qrCount ?? 0) > 0) return true;
  }

  const { count: recCount } = await supabase
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .limit(1);
  if ((recCount ?? 0) > 0) return true;

  const { count: fileCount } = await supabase
    .from("file_objects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("subcategory_id", subcategoryId)
    .limit(1);
  if ((fileCount ?? 0) > 0) return true;

  return false;
}
