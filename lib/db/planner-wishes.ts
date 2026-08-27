import { createServiceClient } from "@/lib/supabase/server";

export type WishAudience =
  | "general"
  | "spouse"
  | "children"
  | "relatives"
  | "friends"
  | "pets"
  | "other";

export interface PlannerWishRow {
  user_id: string;
  audience: WishAudience;
  body: string;
  updated_at: string;
}

export async function getPlannerWish(
  userId: string,
  audience: WishAudience
): Promise<PlannerWishRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_wishes")
    .select("*")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();
  if (error) throw error;
  return (data as PlannerWishRow | null) ?? null;
}

export async function upsertPlannerWish(
  userId: string,
  audience: WishAudience,
  body: string
): Promise<PlannerWishRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("planner_wishes")
    .upsert(
      {
        user_id: userId,
        audience,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,audience" }
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("upsertPlannerWish failed");
  return data as PlannerWishRow;
}
