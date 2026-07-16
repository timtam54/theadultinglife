import { createServiceClient } from "@/lib/supabase/server";
import type { FamilyGroupRow } from "./types";

export async function getFamilyGroup(
  id: string
): Promise<FamilyGroupRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("family_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as FamilyGroupRow | null) ?? null;
}

export async function markAllUsersAdded(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("family_groups")
    .update({ all_users_added_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function unmarkAllUsersAdded(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("family_groups")
    .update({ all_users_added_at: null })
    .eq("id", id);
  if (error) throw error;
}
