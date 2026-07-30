import { createServiceClient } from "@/lib/supabase/server";

export interface FolderDismissalRow {
  user_id: string;
  subcategory_id: string;
  dismissed_until: string | null;
  dismissed_at: string;
}

// Fetches every currently-active dismissal for a user. A row is "active"
// when it's a permanent dismissal (dismissed_until null) or the snooze
// hasn't expired yet.
export async function listActiveFolderDismissals(
  userId: string
): Promise<FolderDismissalRow[]> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("folder_dismissals")
    .select("*")
    .eq("user_id", userId)
    .or(`dismissed_until.is.null,dismissed_until.gt.${nowIso}`);
  if (error) throw error;
  return (data as FolderDismissalRow[]) ?? [];
}

// Upsert a dismissal. Pass `dismissedUntil = null` for "Not applicable"
// (permanent hide), or a future ISO date for "Snooze until".
export async function upsertFolderDismissal(input: {
  userId: string;
  subcategoryId: string;
  dismissedUntil: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("folder_dismissals").upsert(
    {
      user_id: input.userId,
      subcategory_id: input.subcategoryId,
      dismissed_until: input.dismissedUntil,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,subcategory_id" }
  );
  if (error) throw error;
}

// Restore a dismissed folder (used by the "Show hidden suggestions" UI).
export async function deleteFolderDismissal(input: {
  userId: string;
  subcategoryId: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("folder_dismissals")
    .delete()
    .eq("user_id", input.userId)
    .eq("subcategory_id", input.subcategoryId);
  if (error) throw error;
}
