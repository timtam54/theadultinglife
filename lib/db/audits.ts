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

export type AuditSortColumn = "created_at" | "username" | "page" | "action";
export type AuditSortDir = "asc" | "desc";
export type AuditLimit = 200 | 500 | 2000;

export const AUDIT_SORT_COLUMNS: readonly AuditSortColumn[] = [
  "created_at",
  "username",
  "page",
  "action",
] as const;
export const AUDIT_LIMITS: readonly AuditLimit[] = [200, 500, 2000] as const;

export interface SearchAuditsInput {
  query?: string;
  limit?: AuditLimit;
  sortColumn?: AuditSortColumn;
  sortDir?: AuditSortDir;
}

// Escape %, _, and \ so a search term like "50%" is treated literally.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function searchAudits({
  query,
  limit = 200,
  sortColumn = "created_at",
  sortDir = "desc",
}: SearchAuditsInput): Promise<AuditRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("audits").select("*");

  const trimmed = query?.trim();
  if (trimmed) {
    const pat = `%${escapeIlike(trimmed)}%`;
    // PostgREST .or() takes a comma-separated list; ilike is fine with the pattern.
    q = q.or(
      [
        `username.ilike.${pat}`,
        `page.ilike.${pat}`,
        `action.ilike.${pat}`,
        `ip_address.ilike.${pat}`,
      ].join(",")
    );
  }

  const { data, error } = await q
    .order(sortColumn, { ascending: sortDir === "asc" })
    .limit(limit);
  if (error) throw error;
  return (data as AuditRow[] | null) ?? [];
}
