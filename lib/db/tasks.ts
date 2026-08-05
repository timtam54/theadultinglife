import { createServiceClient } from "@/lib/supabase/server";
import type { TaskRow } from "./types";

export async function listTasksForUser(userId: string): Promise<TaskRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TaskRow[]) ?? [];
}

export async function getTask(
  userId: string,
  id: string
): Promise<TaskRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as TaskRow | null) ?? null;
}

export async function createTask(input: {
  userId: string;
  familyGroupId: string;
  title: string;
  dueDate?: string | null;
  recordId?: string | null;
}): Promise<TaskRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      title: input.title,
      due_date: input.dueDate ?? null,
      record_id: input.recordId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createTask failed");
  return data as TaskRow;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: {
    title?: string;
    dueDate?: string | null;
    recordId?: string | null;
    completedAt?: string | null;
    dismissedAt?: string | null;
  }
): Promise<TaskRow> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.recordId !== undefined) update.record_id = patch.recordId;
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
  if (patch.dismissedAt !== undefined) update.dismissed_at = patch.dismissedAt;
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateTask failed");
  return data as TaskRow;
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
