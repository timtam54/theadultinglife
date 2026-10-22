import { listUsersInFamilyGroup } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

// People details for the Planner's "My Personal Information" and "Family
// Members" sections. Both read the Family Members roster (the users table),
// which is where these details are kept and edited — the Planner only
// shows them.

export const FAMILY_MEMBERS_HREF = "/records/personal/personal.family_members";

export interface PlannerPerson {
  id: string;
  name: string;
  fields: { label: string; value: string }[];
}

function formatDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function toPerson(u: UserRow): PlannerPerson {
  const name =
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "Family member";
  const fields = [
    { label: "Date of birth", value: u.birthday ? formatDate(u.birthday) : "" },
    { label: "Mobile", value: u.mobile_phone ?? "" },
    { label: "Home phone", value: u.home_phone ?? "" },
    { label: "Email", value: u.email ?? "" },
    { label: "Home address", value: u.home_address ?? "" },
    { label: "Mailing address", value: u.mailing_address ?? "" },
  ].filter((f) => f.value.trim().length > 0);
  return { id: u.id, name, fields };
}

/** The signed-in person ("self") and everyone else in their family group. */
export async function loadPlannerPeople(
  userId: string,
  familyGroupId: string
): Promise<{ self: PlannerPerson | null; family: PlannerPerson[] }> {
  const users = await listUsersInFamilyGroup(familyGroupId);
  const me = users.find((u) => u.id === userId);
  return {
    self: me ? toPerson(me) : null,
    family: users.filter((u) => u.id !== userId).map(toPerson),
  };
}

/** The people a section shows, by its plannerEditor tag. */
export function peopleForEditor(
  editor: "people-self" | "people-family",
  people: { self: PlannerPerson | null; family: PlannerPerson[] }
): PlannerPerson[] {
  if (editor === "people-self") return people.self ? [people.self] : [];
  return people.family;
}
