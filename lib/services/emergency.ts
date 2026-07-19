import { listUsersInFamilyGroup } from "@/lib/db/users";
import { listRecords } from "@/lib/db/records";
import type { RecordRow, UserRow } from "@/lib/db/types";

// Curated list of subcategories most useful in an emergency.
// Ordered by "most useful when the phone rings".
export const EMERGENCY_SUBCATEGORIES: {
  id: string;
  label: string;
  category: "personal" | "health" | "admin";
}[] = [
  { id: "personal.emergency_contacts", label: "Emergency contacts", category: "personal" },
  { id: "personal.general_information", label: "General info", category: "personal" },
  { id: "health.medical_advisers", label: "Doctors & medical advisers", category: "health" },
  { id: "health.medication_list", label: "Current medications", category: "health" },
  { id: "health.health_insurance_cards", label: "Medicare & health card", category: "health" },
  { id: "health.health_insurance", label: "Health insurance", category: "health" },
  { id: "personal.licences_ids", label: "Licence & ID", category: "personal" },
  { id: "personal.advanced_health_directive", label: "Advanced health directive", category: "personal" },
  { id: "personal.will_funeral", label: "Will & funeral instructions", category: "personal" },
  { id: "personal.power_of_attorney", label: "Power of attorney", category: "personal" },
  { id: "health.life_insurance", label: "Life insurance", category: "health" },
  { id: "admin.home_insurance", label: "Home insurance", category: "admin" },
  { id: "admin.vehicle_insurance", label: "Vehicle insurance", category: "admin" },
];

export interface EmergencyRecord {
  id: string;
  userId: string;
  userName: string;
  subcategoryId: string;
  subcategoryLabel: string;
  title: string;
  fields: RecordRow["fields"];
  notes: string | null;
  expiryDate: string | null;
  categoryId: string;
}

export interface EmergencySection {
  subcategoryId: string;
  label: string;
  category: "personal" | "health" | "admin";
  records: EmergencyRecord[];
}

function displayName(u: UserRow): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Family member"
  );
}

export async function buildEmergencyView(
  familyGroupId: string
): Promise<{ sections: EmergencySection[]; totalRecords: number; users: UserRow[] }> {
  const users = await listUsersInFamilyGroup(familyGroupId);
  const nameById = new Map(users.map((u) => [u.id, displayName(u)]));

  const perUserRecords = await Promise.all(
    users.map((u) => listRecords(u.id))
  );
  const flat: EmergencyRecord[] = [];
  for (let i = 0; i < users.length; i++) {
    for (const r of perUserRecords[i]) {
      flat.push({
        id: r.id,
        userId: r.user_id,
        userName: nameById.get(r.user_id) ?? "",
        subcategoryId: r.subcategory_id ?? "",
        subcategoryLabel: "",
        title: r.title,
        fields: r.fields,
        notes: r.notes,
        expiryDate: r.expiry_date,
        categoryId: r.category_id,
      });
    }
  }

  const sections: EmergencySection[] = EMERGENCY_SUBCATEGORIES.map((meta) => ({
    subcategoryId: meta.id,
    label: meta.label,
    category: meta.category,
    records: flat
      .filter((r) => r.subcategoryId === meta.id)
      .map((r) => ({ ...r, subcategoryLabel: meta.label })),
  }));

  const totalRecords = sections.reduce((a, s) => a + s.records.length, 0);
  return { sections, totalRecords, users };
}
