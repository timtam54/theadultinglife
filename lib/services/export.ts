import { createServiceClient } from "@/lib/supabase/server";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { getFamilyGroup } from "@/lib/db/family-groups";

export interface OrganiserExport {
  exportedAt: string;
  version: 1;
  familyGroup: unknown;
  users: unknown[];
  records: unknown[];
  files: unknown[];
  responses: unknown[];
  progress: unknown[];
  subcategories: unknown[];
}

export async function buildOrganiserExport(
  familyGroupId: string
): Promise<OrganiserExport> {
  const supabase = createServiceClient();
  const [familyGroup, users] = await Promise.all([
    getFamilyGroup(familyGroupId),
    listUsersInFamilyGroup(familyGroupId),
  ]);
  const userIds = users.map((u) => u.id);
  const emptyResult = <T,>(x: T[] | null | undefined): T[] => x ?? [];

  const [
    { data: records },
    { data: files },
    { data: responses },
    { data: progress },
    { data: subcategories },
  ] = await Promise.all([
    supabase.from("records").select("*").in("user_id", userIds),
    supabase.from("file_objects").select("*").in("user_id", userIds),
    supabase.from("question_responses").select("*").in("user_id", userIds),
    supabase.from("progress_items").select("*").in("user_id", userIds),
    supabase.from("subcategories").select("*"),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    familyGroup,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      member_kind: u.member_kind,
      is_primary: u.is_primary,
    })),
    records: emptyResult(records),
    files: emptyResult(files),
    responses: emptyResult(responses),
    progress: emptyResult(progress),
    subcategories: emptyResult(subcategories),
  };
}
