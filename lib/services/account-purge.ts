import { createServiceClient } from "@/lib/supabase/server";
import { deleteUserFile } from "@/lib/supabase/storage";

// Fully purges a family group and everything belonging to any of its users.
// Called only by the superuser 30+ days after the primary user set deleted_at.
//
// Order matters: delete Supabase Storage blobs FIRST (we need file_objects.storage_path
// to know what to remove), then rely on ON DELETE CASCADE for most tables when
// the users rows go. Family group row goes last.

export interface PurgeResult {
  familyGroupId: string;
  usersDeleted: number;
  storageBlobsDeleted: number;
  storageBlobsFailed: number;
}

export async function purgeFamilyGroup(
  familyGroupId: string
): Promise<PurgeResult> {
  const supabase = createServiceClient();

  // 1. Get every user in this family group.
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id")
    .eq("family_group_id", familyGroupId);
  if (usersErr) throw usersErr;
  const userIds = ((users ?? []) as { id: string }[]).map((u) => u.id);

  // 2. Get every uploaded blob path to remove from Supabase Storage.
  //    file_objects.user_id has ON DELETE CASCADE so the rows will go with
  //    users, but the blobs themselves must be deleted separately.
  let storageBlobsDeleted = 0;
  let storageBlobsFailed = 0;
  if (userIds.length > 0) {
    const { data: files } = await supabase
      .from("file_objects")
      .select("storage_path")
      .in("user_id", userIds);
    for (const f of ((files ?? []) as { storage_path: string }[])) {
      try {
        await deleteUserFile(f.storage_path);
        storageBlobsDeleted += 1;
      } catch {
        storageBlobsFailed += 1;
      }
    }
  }

  // 3. Delete every user in the group. FK cascades handle records,
  //    question_responses, file_objects rows, planner_* rows,
  //    item_access_grants (both owner and grantee sides), progress, quiz
  //    results, folder_dismissals, etc.
  if (userIds.length > 0) {
    const { error: delUsersErr } = await supabase
      .from("users")
      .delete()
      .in("id", userIds);
    if (delUsersErr) throw delUsersErr;
  }

  // 4. Finally drop the family group row. Anything that references it via
  //    ON DELETE CASCADE (folder_notes etc.) goes with it.
  const { error: delGroupErr } = await supabase
    .from("family_groups")
    .delete()
    .eq("id", familyGroupId);
  if (delGroupErr) throw delGroupErr;

  return {
    familyGroupId,
    usersDeleted: userIds.length,
    storageBlobsDeleted,
    storageBlobsFailed,
  };
}
