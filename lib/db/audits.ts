import { createServiceClient } from "@/lib/supabase/server";
import type { AuditRow } from "./types";

export async function insertAudit(input: {
  userId: string | null;
  username: string;
  page: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("audits").insert({
    user_id: input.userId,
    username: input.username,
    page: input.page,
    action: input.action,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
  });
  if (error) throw error;
}

export async function listAudits(limit = 1000): Promise<AuditRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("audits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuditRow[] | null) ?? [];
}
