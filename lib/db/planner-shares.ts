import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export interface PlannerShareRow {
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

// 24 bytes → 32-char base64url → ~192 bits of entropy.
function newToken(): string {
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Returns the user's current share, only if it's still active
// (not revoked, not expired). Null otherwise.
export async function getActivePlannerShare(
  userId: string
): Promise<PlannerShareRow | null> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("planner_shares")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (error) throw error;
  return (data as PlannerShareRow | null) ?? null;
}

// Public lookup by token. Used by /share/planner/[token].
// Returns null for unknown, expired or revoked tokens (never leaks the reason).
export async function getPlannerShareByToken(
  token: string
): Promise<PlannerShareRow | null> {
  if (!token || token.length < 20) return null;
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("planner_shares")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (error) throw error;
  return (data as PlannerShareRow | null) ?? null;
}

// Creates (or replaces) the user's share link. One row per user via PK, so
// upsert deterministically rotates the token + expiry.
export async function upsertPlannerShare(input: {
  userId: string;
  expiresAt: string;
}): Promise<PlannerShareRow> {
  const supabase = createServiceClient();
  const row = {
    user_id: input.userId,
    token: newToken(),
    expires_at: input.expiresAt,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };
  const { data, error } = await supabase
    .from("planner_shares")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("upsertPlannerShare failed");
  return data as PlannerShareRow;
}

// Soft-revoke: keeps the row so the token can't be reused by a race, but
// marks it as revoked. The public lookup filters `revoked_at IS NULL`.
export async function revokePlannerShare(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("planner_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw error;
}
