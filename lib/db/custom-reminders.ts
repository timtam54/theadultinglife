import { createServiceClient } from "@/lib/supabase/server";
import type { CustomReminderRow, Recurrence } from "./types";

export async function listCustomRemindersForFamily(
  familyGroupId: string
): Promise<CustomReminderRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("custom_reminders")
    .select("*")
    .eq("family_group_id", familyGroupId)
    .is("dismissed_at", null)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data as CustomReminderRow[]) ?? [];
}

export async function getCustomReminder(
  userId: string,
  id: string
): Promise<CustomReminderRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("custom_reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomReminderRow | null) ?? null;
}

export async function createCustomReminder(input: {
  userId: string;
  familyGroupId: string;
  title: string;
  dueDate: string;
  notes?: string | null;
  recordId?: string | null;
  recurrence?: Recurrence | null;
}): Promise<CustomReminderRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("custom_reminders")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      title: input.title,
      due_date: input.dueDate,
      notes: input.notes ?? null,
      record_id: input.recordId ?? null,
      recurrence: input.recurrence ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createCustomReminder failed");
  return data as CustomReminderRow;
}

export async function updateCustomReminder(
  userId: string,
  id: string,
  patch: {
    title?: string;
    dueDate?: string;
    notes?: string | null;
    dismissedAt?: string | null;
    notifiedAt?: string | null;
    recordId?: string | null;
    recurrence?: Recurrence | null;
    snoozedUntil?: string | null;
    completedAt?: string | null;
  }
): Promise<CustomReminderRow> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.dueDate !== undefined) {
    update.due_date = patch.dueDate;
    // Any date change re-arms the notification.
    update.notified_at = null;
  }
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.dismissedAt !== undefined) update.dismissed_at = patch.dismissedAt;
  if (patch.notifiedAt !== undefined) update.notified_at = patch.notifiedAt;
  if (patch.recordId !== undefined) update.record_id = patch.recordId;
  if (patch.recurrence !== undefined) update.recurrence = patch.recurrence;
  if (patch.snoozedUntil !== undefined) {
    update.snoozed_until = patch.snoozedUntil;
    // Snoozing also re-arms the notification so the cron picks it up again.
    update.notified_at = null;
  }
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
  const { data, error } = await supabase
    .from("custom_reminders")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateCustomReminder failed");
  return data as CustomReminderRow;
}

export async function deleteCustomReminder(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("custom_reminders")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function markCustomReminderNotified(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("custom_reminders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// For recurring reminders: after firing the notification, advance due_date to
// the next occurrence and clear notified_at so the cron re-arms.
export async function advanceRecurringReminder(
  id: string,
  currentDueDate: string,
  recurrence: Recurrence
): Promise<void> {
  const supabase = createServiceClient();
  const next = nextOccurrence(currentDueDate, recurrence);
  const { error } = await supabase
    .from("custom_reminders")
    .update({
      due_date: next,
      notified_at: null,
      snoozed_until: null,
    })
    .eq("id", id);
  if (error) throw error;
}

function nextOccurrence(iso: string, recurrence: Recurrence): string {
  const d = new Date(iso + "T00:00:00Z");
  switch (recurrence) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}
