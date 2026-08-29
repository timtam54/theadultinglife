import { createServiceClient } from "@/lib/supabase/server";

export type PrivacyRequestKind =
  | "access"
  | "correct"
  | "export"
  | "delete"
  | "complaint"
  | "other";

export type PrivacyRequestStatus =
  | "new"
  | "in_progress"
  | "responded"
  | "closed";

export interface PrivacyRequestRow {
  id: number;
  user_id: string | null;
  email: string;
  request_kind: PrivacyRequestKind;
  message: string;
  status: PrivacyRequestStatus;
  admin_notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPrivacyRequest(input: {
  userId: string | null;
  email: string;
  kind: PrivacyRequestKind;
  message: string;
}): Promise<PrivacyRequestRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      user_id: input.userId,
      email: input.email,
      request_kind: input.kind,
      message: input.message,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createPrivacyRequest failed");
  return data as PrivacyRequestRow;
}

export async function listPrivacyRequests(
  status?: PrivacyRequestStatus
): Promise<PrivacyRequestRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("privacy_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as PrivacyRequestRow[]) ?? [];
}

export async function getPrivacyRequest(
  id: number
): Promise<PrivacyRequestRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PrivacyRequestRow | null) ?? null;
}

export async function updatePrivacyRequest(
  id: number,
  patch: {
    status?: PrivacyRequestStatus;
    adminNotes?: string | null;
    respondedAt?: string | null;
  }
): Promise<PrivacyRequestRow> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.adminNotes !== undefined) update.admin_notes = patch.adminNotes;
  if (patch.respondedAt !== undefined) update.responded_at = patch.respondedAt;
  const { data, error } = await supabase
    .from("privacy_requests")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updatePrivacyRequest failed");
  return data as PrivacyRequestRow;
}
