import { createServiceClient } from "@/lib/supabase/server";

export type ItemKind =
  | "instance"
  | "user_form"
  | "record"
  | "file"
  | "planner_letter"
  | "planner_apology"
  | "planner_wish"
  | "planner_last_words";

export interface ItemAccessGrantRow {
  id: number;
  owner_user_id: string;
  grantee_user_id: string;
  subcategory_id: string | null;
  item_kind: ItemKind;
  item_id: string;
  created_at: string;
}

export interface GrantKey {
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
}

// Grants the owner has issued (their outgoing shares).
export async function listGrantsByOwner(
  ownerUserId: string
): Promise<ItemAccessGrantRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("item_access_grants")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ItemAccessGrantRow[]) ?? [];
}

// Grants the grantee has received (their incoming shares).
export async function listGrantsByGrantee(
  granteeUserId: string
): Promise<ItemAccessGrantRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("item_access_grants")
    .select("*")
    .eq("grantee_user_id", granteeUserId);
  if (error) throw error;
  return (data as ItemAccessGrantRow[]) ?? [];
}

// Grants for one specific item — used by the ShareDialog to show who currently has access.
export async function listGrantsForItem(
  ownerUserId: string,
  key: GrantKey
): Promise<ItemAccessGrantRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("item_access_grants")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("item_kind", key.itemKind)
    .eq("item_id", key.itemId);
  if (key.subcategoryId === null) {
    q = q.is("subcategory_id", null);
  } else {
    q = q.eq("subcategory_id", key.subcategoryId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as ItemAccessGrantRow[]) ?? [];
}

// Grants for grantee on a specific (subcategory, item_kind) — the query the
// grantee's Planner view uses to filter shown items.
export async function listGrantedItemsForGrantee(
  granteeUserId: string,
  subcategoryId: string | null,
  itemKind: ItemKind
): Promise<ItemAccessGrantRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("item_access_grants")
    .select("*")
    .eq("grantee_user_id", granteeUserId)
    .eq("item_kind", itemKind);
  if (subcategoryId === null) {
    q = q.is("subcategory_id", null);
  } else {
    q = q.eq("subcategory_id", subcategoryId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as ItemAccessGrantRow[]) ?? [];
}

export async function grantAccess(input: {
  ownerUserId: string;
  granteeUserId: string;
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
}): Promise<ItemAccessGrantRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("item_access_grants")
    .upsert(
      {
        owner_user_id: input.ownerUserId,
        grantee_user_id: input.granteeUserId,
        subcategory_id: input.subcategoryId,
        item_kind: input.itemKind,
        item_id: input.itemId,
      },
      {
        onConflict:
          "owner_user_id,grantee_user_id,subcategory_id,item_kind,item_id",
      }
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("grantAccess failed");
  return data as ItemAccessGrantRow;
}

export async function revokeAccessById(
  ownerUserId: string,
  id: number
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("item_access_grants")
    .delete()
    .eq("owner_user_id", ownerUserId)
    .eq("id", id);
  if (error) throw error;
}

// Delete all grants pointing at an item — used when the owner deletes the item.
export async function revokeAllForItem(
  ownerUserId: string,
  key: GrantKey
): Promise<void> {
  const supabase = createServiceClient();
  let q = supabase
    .from("item_access_grants")
    .delete()
    .eq("owner_user_id", ownerUserId)
    .eq("item_kind", key.itemKind)
    .eq("item_id", key.itemId);
  if (key.subcategoryId === null) {
    q = q.is("subcategory_id", null);
  } else {
    q = q.eq("subcategory_id", key.subcategoryId);
  }
  const { error } = await q;
  if (error) throw error;
}

// Given an item_kind='record' grant, return the file_object ids attached to it.
// Used to auto-expose linked files to the grantee.
export async function fileIdsForRecord(
  recordId: string
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id")
    .eq("record_id", recordId);
  if (error) throw error;
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}
