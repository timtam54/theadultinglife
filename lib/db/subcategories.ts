import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, SubcategoryRow } from "./types";

/** Every catalogue subcategory across all users. Admin-only surface. */
export async function listAllCatalogueSubcategories(): Promise<SubcategoryRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .is("user_id", null)
    .is("template_group", null)
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

/** Bulk lookup by ID list. Returns whatever's found, silently drops misses. */
export async function listSubcategoriesByIds(
  ids: string[]
): Promise<SubcategoryRow[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

export async function listSubcategoriesForUser(
  userId: string,
  categoryId?: CategoryId
): Promise<SubcategoryRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("subcategories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("template_group", null);
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data, error } = await q.order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

export async function searchSubcategoriesForUser(
  userId: string,
  search: string
): Promise<SubcategoryRow[]> {
  const trimmed = search.trim();
  if (!trimmed) return [];
  const supabase = createServiceClient();
  const safe = trimmed
    .replace(/[%_]/g, (c) => `\\${c}`)
    .replace(/[(),*]/g, " ");
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("template_group", null)
    .or(`name.ilike.${pattern},hint.ilike.${pattern}`)
    .order("sort_order", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

export async function listSubcategoriesByTemplateGroup(
  group: string
): Promise<SubcategoryRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("template_group", group)
    .is("user_id", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

export async function getSubcategoryForUser(
  userId: string,
  id: string
): Promise<SubcategoryRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("id", id)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  return (data as SubcategoryRow | null) ?? null;
}

export async function createUserSubcategory(input: {
  id: string;
  userId: string;
  categoryId: CategoryId;
  name: string;
  sortOrder: number;
}): Promise<SubcategoryRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .insert({
      id: input.id,
      user_id: input.userId,
      category_id: input.categoryId,
      name: input.name,
      tal_form: false,
      sort_order: input.sortOrder,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createUserSubcategory failed");
  return data as SubcategoryRow;
}

export async function listTemplatesForUser(
  userId: string
): Promise<SubcategoryRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .or(
      `visibility.eq.catalogue,and(visibility.eq.user_private,created_by.eq.${userId})`
    )
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SubcategoryRow[]) ?? [];
}

export async function createTemplateSubcategory(input: {
  id: string;
  name: string;
  categoryId: CategoryId;
  visibility: "catalogue" | "user_private";
  createdBy: string;
  hint: string | null;
  sortOrder: number;
}): Promise<SubcategoryRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .insert({
      id: input.id,
      category_id: input.categoryId,
      name: input.name,
      hint: input.hint,
      tal_form: true,
      sort_order: input.sortOrder,
      scope: "per_user_list",
      repeatable: false,
      visibility: input.visibility,
      created_by: input.createdBy,
      user_id: input.visibility === "user_private" ? input.createdBy : null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("createTemplateSubcategory failed");
  }
  return data as SubcategoryRow;
}

export async function countRecordsBySubcategory(
  userId: string
): Promise<Map<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("records")
    .select("subcategory_id")
    .eq("user_id", userId);
  if (error) throw error;
  const out = new Map<string, number>();
  for (const r of (data ?? []) as { subcategory_id: string | null }[]) {
    if (!r.subcategory_id) continue;
    out.set(r.subcategory_id, (out.get(r.subcategory_id) ?? 0) + 1);
  }
  return out;
}

export async function countFilesBySubcategory(
  userId: string
): Promise<Map<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("file_objects")
    .select("subcategory_id")
    .eq("user_id", userId);
  if (error) throw error;
  const out = new Map<string, number>();
  for (const r of (data ?? []) as { subcategory_id: string | null }[]) {
    if (!r.subcategory_id) continue;
    out.set(r.subcategory_id, (out.get(r.subcategory_id) ?? 0) + 1);
  }
  return out;
}
