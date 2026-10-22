import { createServiceClient } from "@/lib/supabase/server";
import { deleteUserFile } from "@/lib/supabase/storage";

// Admin-only "Reset organiser": empties a family group's organiser so it can
// be filled in from scratch (e.g. Donna's demo account for walkthrough
// videos). Deletes everything people have ENTERED — folder answers,
// records, uploaded files, Planner, budgets, receipts, reminders, etc.
//
// Keeps the account and its setup: the users rows (family members and
// their details), sign-in, subscription, PIN / Face ID, welcome & Setup
// Guide progress, tours, hidden-folder choices, folder thumbnails, Learn
// progress, and audit / AI-usage logs.

// Tables keyed by user_id, deleted for every person in the group. Order
// matters only where noted.
const USER_TABLES = [
  "question_responses",
  "record_history",
  "custom_reminders",
  "tasks",
  "record_instances",
  // records before file_objects: file_objects.record_id is "set null",
  // records.source_file_id points the other way.
  "records",
  "file_objects",
  "receipts",
  "planner_letters",
  "planner_apologies",
  "planner_last_words",
  "planner_wishes",
  "planner_events",
  "planner_shares",
  "budgets", // budget_lines cascade
  "vehicle_logbooks", // trips cascade
  "meal_plan_entries",
  "life_goal_profiles",
  "life_goals", // steps cascade
  "subcategories", // custom folders only (standard folders have user_id = null)
] as const;

export interface OrganiserResetResult {
  people: number;
  filesDeleted: number;
  filesFailed: number;
  rowsDeleted: Record<string, number>;
}

export async function resetOrganiser(familyGroupId: string): Promise<OrganiserResetResult> {
  const supabase = createServiceClient();

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id")
    .eq("family_group_id", familyGroupId);
  if (usersErr) throw usersErr;
  const userIds = ((users ?? []) as { id: string }[]).map((u) => u.id);
  if (userIds.length === 0) {
    return { people: 0, filesDeleted: 0, filesFailed: 0, rowsDeleted: {} };
  }

  // 1. Uploaded blobs first — the rows hold the paths.
  const [{ data: files, error: fErr }, { data: receipts, error: rErr }] = await Promise.all([
    supabase.from("file_objects").select("storage_path").in("user_id", userIds),
    supabase.from("receipts").select("file_path").in("user_id", userIds).not("file_path", "is", null),
  ]);
  if (fErr) throw fErr;
  if (rErr) throw rErr;
  const paths = [
    ...((files ?? []) as { storage_path: string }[]).map((f) => f.storage_path),
    ...((receipts ?? []) as { file_path: string }[]).map((r) => r.file_path),
  ];
  let filesDeleted = 0;
  let filesFailed = 0;
  for (const path of paths) {
    try {
      await deleteUserFile(path);
      filesDeleted += 1;
    } catch {
      filesFailed += 1;
    }
  }

  // 2. Sharing: anything these people shared out, or was shared with them.
  const rowsDeleted: Record<string, number> = {};
  for (const col of ["owner_user_id", "grantee_user_id"]) {
    const { count, error } = await supabase
      .from("item_access_grants")
      .delete({ count: "exact" })
      .in(col, userIds);
    if (error) throw error;
    rowsDeleted.item_access_grants = (rowsDeleted.item_access_grants ?? 0) + (count ?? 0);
  }

  // 3. Everything they've entered.
  for (const table of USER_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in("user_id", userIds);
    if (error) throw new Error(`${table}: ${error.message}`);
    rowsDeleted[table] = count ?? 0;
  }

  // 4. Shared folder notes belong to the family group.
  const { count: notes, error: nErr } = await supabase
    .from("folder_notes")
    .delete({ count: "exact" })
    .eq("family_group_id", familyGroupId);
  if (nErr) throw nErr;
  rowsDeleted.folder_notes = notes ?? 0;

  return { people: userIds.length, filesDeleted, filesFailed, rowsDeleted };
}
