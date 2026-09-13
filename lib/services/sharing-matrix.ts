import { createServiceClient } from "@/lib/supabase/server";
import { listGrantsByOwner, type ItemAccessGrantRow, type ItemKind } from "@/lib/db/item-access";
import { findUserById } from "@/lib/db/users";

// Compact matrix payload for the Sharing page: every grant this owner has
// issued, with a hydrated item label + folder path + grantee details, ready
// to render as items × people.

export interface SharingMatrixItem {
  key: string; // subcategoryId::itemKind::itemId — stable row id
  subcategoryId: string | null;
  subcategoryLabel: string | null;
  categoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
  itemLabel: string;
}

export interface SharingMatrixPerson {
  userId: string;
  name: string;
  email: string;
}

export interface SharingMatrixCell {
  itemKey: string; // matches SharingMatrixItem.key
  personId: string; // matches SharingMatrixPerson.userId
  grantId: number;
}

export interface SharingMatrix {
  items: SharingMatrixItem[];
  people: SharingMatrixPerson[];
  cells: SharingMatrixCell[];
}

function keyOf(g: {
  subcategory_id: string | null;
  item_kind: ItemKind;
  item_id: string;
}): string {
  return `${g.subcategory_id ?? ""}::${g.item_kind}::${g.item_id}`;
}

export async function loadSharingMatrix(
  ownerUserId: string
): Promise<SharingMatrix> {
  const grants = await listGrantsByOwner(ownerUserId);
  if (grants.length === 0) {
    return { items: [], people: [], cells: [] };
  }

  const supabase = createServiceClient();

  // Unique subcategory ids so we can hydrate labels + category in one round trip.
  const subIds = Array.from(
    new Set(
      grants
        .map((g) => g.subcategory_id)
        .filter((s): s is string => typeof s === "string")
    )
  );
  const subs = new Map<string, { label: string; categoryId: string }>();
  if (subIds.length > 0) {
    const { data } = await supabase
      .from("subcategories")
      .select("id, label, category_id")
      .in("id", subIds);
    for (const row of (data as { id: string; label: string; category_id: string }[]) ?? []) {
      subs.set(row.id, { label: row.label, categoryId: row.category_id });
    }
  }

  // Hydrate item labels per kind. Group by kind so we can batch queries.
  const byKind = new Map<ItemKind, ItemAccessGrantRow[]>();
  for (const g of grants) {
    const list = byKind.get(g.item_kind) ?? [];
    list.push(g);
    byKind.set(g.item_kind, list);
  }

  const labelByKey = new Map<string, string>();

  // records → records.title
  const recordGrants = byKind.get("record") ?? [];
  if (recordGrants.length > 0) {
    const ids = recordGrants.map((g) => g.item_id);
    const { data } = await supabase
      .from("records")
      .select("id, title")
      .in("id", ids);
    const byId = new Map(
      ((data as { id: string; title: string | null }[]) ?? []).map((r) => [r.id, r.title ?? "Untitled"])
    );
    for (const g of recordGrants) {
      labelByKey.set(keyOf(g), byId.get(g.item_id) ?? "Untitled record");
    }
  }

  // files → file_objects.filename
  const fileGrants = byKind.get("file") ?? [];
  if (fileGrants.length > 0) {
    const ids = fileGrants.map((g) => g.item_id);
    const { data } = await supabase
      .from("file_objects")
      .select("id, filename")
      .in("id", ids);
    const byId = new Map(
      ((data as { id: string; filename: string }[]) ?? []).map((r) => [r.id, r.filename])
    );
    for (const g of fileGrants) {
      labelByKey.set(keyOf(g), byId.get(g.item_id) ?? "File");
    }
  }

  // instance → labelled as "<subcategory> entry" (each instance is a row in a repeatable form)
  for (const g of byKind.get("instance") ?? []) {
    const subLabel = subs.get(g.subcategory_id ?? "")?.label ?? "Form";
    labelByKey.set(keyOf(g), `${subLabel} entry`);
  }

  // user_form → whole-page form for that subcategory
  for (const g of byKind.get("user_form") ?? []) {
    const subLabel = subs.get(g.subcategory_id ?? "")?.label ?? "Form";
    labelByKey.set(keyOf(g), `${subLabel} details`);
  }

  // planner_letter → planner_letters.recipient
  const letterGrants = byKind.get("planner_letter") ?? [];
  if (letterGrants.length > 0) {
    const ids = letterGrants.map((g) => Number(g.item_id)).filter((n) => Number.isFinite(n));
    const { data } = await supabase
      .from("planner_letters")
      .select("id, recipient")
      .in("id", ids);
    const byId = new Map(
      ((data as { id: number; recipient: string | null }[]) ?? []).map((r) => [String(r.id), r.recipient ?? "Letter"])
    );
    for (const g of letterGrants) {
      labelByKey.set(keyOf(g), `Letter to ${byId.get(g.item_id) ?? "someone"}`);
    }
  }

  // planner_apology → planner_apologies.recipient
  const apologyGrants = byKind.get("planner_apology") ?? [];
  if (apologyGrants.length > 0) {
    const ids = apologyGrants.map((g) => Number(g.item_id)).filter((n) => Number.isFinite(n));
    const { data } = await supabase
      .from("planner_apologies")
      .select("id, recipient")
      .in("id", ids);
    const byId = new Map(
      ((data as { id: number; recipient: string | null }[]) ?? []).map((r) => [String(r.id), r.recipient ?? "Apology"])
    );
    for (const g of apologyGrants) {
      labelByKey.set(keyOf(g), `Apology to ${byId.get(g.item_id) ?? "someone"}`);
    }
  }

  // planner_wish → item_id IS the audience label
  for (const g of byKind.get("planner_wish") ?? []) {
    labelByKey.set(keyOf(g), `Wish for ${g.item_id}`);
  }

  // planner_last_words → single entry
  for (const g of byKind.get("planner_last_words") ?? []) {
    labelByKey.set(keyOf(g), "Last words");
  }

  // Build unique items list.
  const itemMap = new Map<string, SharingMatrixItem>();
  for (const g of grants) {
    const key = keyOf(g);
    if (itemMap.has(key)) continue;
    const sub = g.subcategory_id ? subs.get(g.subcategory_id) : null;
    itemMap.set(key, {
      key,
      subcategoryId: g.subcategory_id,
      subcategoryLabel: sub?.label ?? null,
      categoryId: sub?.categoryId ?? null,
      itemKind: g.item_kind,
      itemId: g.item_id,
      itemLabel: labelByKey.get(key) ?? "Item",
    });
  }

  // People — unique grantees.
  const granteeIds = Array.from(new Set(grants.map((g) => g.grantee_user_id)));
  const people: SharingMatrixPerson[] = [];
  for (const id of granteeIds) {
    const u = await findUserById(id);
    if (!u) continue;
    people.push({
      userId: id,
      name:
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.name ||
        u.email ||
        "Unknown",
      email: u.email ?? "",
    });
  }

  const cells: SharingMatrixCell[] = grants.map((g) => ({
    itemKey: keyOf(g),
    personId: g.grantee_user_id,
    grantId: g.id,
  }));

  // Stable ordering: items grouped by folder label, then by itemLabel.
  const items = Array.from(itemMap.values()).sort((a, b) => {
    const fa = a.subcategoryLabel ?? "zzz";
    const fb = b.subcategoryLabel ?? "zzz";
    if (fa !== fb) return fa.localeCompare(fb);
    return a.itemLabel.localeCompare(b.itemLabel);
  });
  people.sort((a, b) => a.name.localeCompare(b.name));

  return { items, people, cells };
}
