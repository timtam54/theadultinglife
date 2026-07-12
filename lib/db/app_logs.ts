import { createServiceClient } from "@/lib/supabase/server";
import type { AppLogRow, LogLevel } from "./types";

export interface InsertLogInput {
  level: LogLevel;
  source: string;
  message: string;
  userId: string | null;
  familyGroupId: string | null;
  requestId: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
}

export async function insertLog(input: InsertLogInput): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("app_logs").insert({
    level: input.level,
    source: input.source,
    message: input.message,
    user_id: input.userId,
    family_group_id: input.familyGroupId,
    request_id: input.requestId,
    stack: input.stack,
    metadata: input.metadata,
  });
  if (error) throw error;
}

export interface ListLogsOptions {
  level?: LogLevel;
  source?: string;
  limit?: number;
}

export async function listLogs(opts: ListLogsOptions = {}): Promise<AppLogRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("app_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 500);
  if (opts.level) query = query.eq("level", opts.level);
  if (opts.source) query = query.ilike("source", `%${opts.source}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data as AppLogRow[] | null) ?? [];
}
