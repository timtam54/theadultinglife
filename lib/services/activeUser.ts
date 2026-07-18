import { cookies } from "next/headers";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

export async function getActiveFamilyUser(
  sessionUserId: string,
  familyGroupId: string
): Promise<{ activeUserId: string; users: UserRow[] }> {
  const users = await listUsersInFamilyGroup(familyGroupId);
  const cookieStore = await cookies();
  const raw = cookieStore.get("active_family_user")?.value;
  const chosen = raw && users.find((u) => u.id === raw) ? raw : sessionUserId;
  return { activeUserId: chosen, users };
}
