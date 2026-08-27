import { listUsersInFamilyGroup } from "@/lib/db/users";
import { createServiceClient } from "@/lib/supabase/server";
import type { PageQuestionRow, UserRow } from "@/lib/db/types";

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

export interface EmergencyField {
  label: string;
  value: string;
}

export interface EmergencyRecord {
  id: string; // instance_id
  userId: string;
  userName: string;
  subcategoryId: string;
  subcategoryLabel: string;
  title: string; // best-effort title (first non-empty field value)
  fields: EmergencyField[];
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

// Fetch page_questions + question_responses for the given subcategories,
// then group responses by (user_id, instance_id) into "records" for the
// emergency view. Everything is form-mode now.
export async function buildEmergencyView(
  familyGroupId: string
): Promise<{ sections: EmergencySection[]; totalRecords: number; users: UserRow[] }> {
  const users = await listUsersInFamilyGroup(familyGroupId);
  const nameById = new Map(users.map((u) => [u.id, displayName(u)]));
  const userIds = users.map((u) => u.id);
  const subcategoryIds = EMERGENCY_SUBCATEGORIES.map((s) => s.id);

  if (users.length === 0) {
    return { sections: [], totalRecords: 0, users };
  }

  const supabase = createServiceClient();

  // All questions across all emergency subcategories, indexed by id + subcat.
  const { data: qData, error: qErr } = await supabase
    .from("page_questions")
    .select("*")
    .in("subcategory_id", subcategoryIds);
  if (qErr) throw qErr;
  const questions = (qData as PageQuestionRow[]) ?? [];
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const questionIdsBySubcat = new Map<string, string[]>();
  for (const q of questions) {
    if (!q.subcategory_id) continue;
    const arr = questionIdsBySubcat.get(q.subcategory_id) ?? [];
    arr.push(q.id);
    questionIdsBySubcat.set(q.subcategory_id, arr);
  }

  // All responses for those question ids for these family members.
  const allQuestionIds = questions.map((q) => q.id);
  let responses: {
    user_id: string;
    question_id: string;
    instance_id: string;
    value: string | null;
  }[] = [];
  if (allQuestionIds.length > 0) {
    const { data: rData, error: rErr } = await supabase
      .from("question_responses")
      .select("user_id, question_id, instance_id, value")
      .in("user_id", userIds)
      .in("question_id", allQuestionIds);
    if (rErr) throw rErr;
    responses = (rData ?? []) as typeof responses;
  }

  // Group into records: key = subcategory_id + user_id + instance_id.
  interface Bucket {
    userId: string;
    subcategoryId: string;
    instanceId: string;
    fields: EmergencyField[];
  }
  const bucketByKey = new Map<string, Bucket>();
  for (const r of responses) {
    if (!r.value) continue;
    const q = questionById.get(r.question_id);
    if (!q || !q.subcategory_id) continue;
    const key = `${q.subcategory_id}${r.user_id}${r.instance_id}`;
    const b = bucketByKey.get(key) ?? {
      userId: r.user_id,
      subcategoryId: q.subcategory_id,
      instanceId: r.instance_id,
      fields: [],
    };
    b.fields.push({ label: q.label, value: r.value });
    bucketByKey.set(key, b);
  }

  const sections: EmergencySection[] = EMERGENCY_SUBCATEGORIES.map((meta) => {
    const buckets = Array.from(bucketByKey.values()).filter(
      (b) => b.subcategoryId === meta.id
    );
    const records: EmergencyRecord[] = buckets.map((b) => {
      // Best-effort title: first non-empty field value (or "Untitled").
      const first = b.fields.find((f) => f.value)?.value ?? "";
      return {
        id: b.instanceId,
        userId: b.userId,
        userName: nameById.get(b.userId) ?? "",
        subcategoryId: b.subcategoryId,
        subcategoryLabel: meta.label,
        title: first || meta.label,
        fields: b.fields,
        categoryId: meta.category,
      };
    });
    return {
      subcategoryId: meta.id,
      label: meta.label,
      category: meta.category,
      records,
    };
  });

  const totalRecords = sections.reduce((a, s) => a + s.records.length, 0);
  return { sections, totalRecords, users };
}
