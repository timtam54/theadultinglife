import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId } from "@/lib/db/types";

const UPCOMING_WINDOW_DAYS = 60;

export type ReminderSource = "record" | "question";

export interface Reminder {
  source: ReminderSource;
  id: string;                    // stable key: record.id, or "question_responses:<user>:<qid>:<instance>"
  userId: string;                // user this reminder belongs to
  categoryId: CategoryId | null;
  subcategoryId: string | null;
  title: string;                 // e.g. "Passport expiry", "Drivers licence"
  dueDate: string;               // YYYY-MM-DD
  daysUntil: number;             // negative = expired
  status: "expired" | "expiring_soon" | "upcoming";
  href: string;                  // where to go to view/edit
}

function daysFromToday(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function toStatus(days: number): Reminder["status"] {
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "upcoming";
}

// Fetch all reminders for a family group. Includes:
//   1. records.expiry_date (the legacy "record" model)
//   2. question_responses to page_questions where is_reminder_date = true
export async function listRemindersForFamily(
  familyGroupId: string
): Promise<Reminder[]> {
  const supabase = createServiceClient();

  const usersRes = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("family_group_id", familyGroupId);
  if (usersRes.error) throw usersRes.error;
  const users = (usersRes.data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[];
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return [];
  const userNameById = new Map(
    users.map((u) => [
      u.id,
      [u.first_name, u.last_name].filter(Boolean).join(" ") || "Member",
    ])
  );

  const [recordsRes, questionsRes] = await Promise.all([
    supabase
      .from("records")
      .select("id, user_id, category_id, subcategory_id, title, expiry_date")
      .in("user_id", userIds)
      .not("expiry_date", "is", null),
    supabase
      .from("page_questions")
      .select("id, label, subcategory_id")
      .eq("is_reminder_date", true),
  ]);
  if (recordsRes.error) throw recordsRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const reminderQuestions = (questionsRes.data ?? []) as {
    id: string;
    label: string;
    subcategory_id: string | null;
  }[];
  const questionById = new Map(reminderQuestions.map((q) => [q.id, q]));

  let responses: {
    user_id: string;
    question_id: string;
    value: string | null;
    instance_id: string;
  }[] = [];
  if (reminderQuestions.length) {
    const rRes = await supabase
      .from("question_responses")
      .select("user_id, question_id, value, instance_id")
      .in("user_id", userIds)
      .in(
        "question_id",
        reminderQuestions.map((q) => q.id)
      );
    if (rRes.error) throw rRes.error;
    responses = (rRes.data ?? []) as typeof responses;
  }

  // Resolve subcategory -> category for reminder-question rows.
  const subIds = Array.from(
    new Set(
      reminderQuestions
        .map((q) => q.subcategory_id)
        .filter((s): s is string => s != null)
    )
  );
  const subToCategory = new Map<string, CategoryId>();
  if (subIds.length) {
    const sRes = await supabase
      .from("subcategories")
      .select("id, category_id")
      .in("id", subIds);
    if (sRes.error) throw sRes.error;
    for (const row of (sRes.data ?? []) as {
      id: string;
      category_id: CategoryId;
    }[]) {
      subToCategory.set(row.id, row.category_id);
    }
  }

  const reminders: Reminder[] = [];

  for (const r of (recordsRes.data ?? []) as {
    id: string;
    user_id: string;
    category_id: CategoryId;
    subcategory_id: string | null;
    title: string;
    expiry_date: string;
  }[]) {
    const days = daysFromToday(r.expiry_date);
    reminders.push({
      source: "record",
      id: `record:${r.id}`,
      userId: r.user_id,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id,
      title: r.title,
      dueDate: r.expiry_date,
      daysUntil: days,
      status: toStatus(days),
      href: `/records/${r.category_id}/r/${r.id}`,
    });
  }

  for (const resp of responses) {
    if (!resp.value) continue;
    const q = questionById.get(resp.question_id);
    if (!q) continue;
    const days = daysFromToday(resp.value);
    const memberName = userNameById.get(resp.user_id) ?? "";
    const title = memberName ? `${memberName} — ${q.label}` : q.label;
    const category = q.subcategory_id
      ? subToCategory.get(q.subcategory_id) ?? null
      : null;
    const href = q.subcategory_id
      ? category
        ? `/records/${category}/${q.subcategory_id}`
        : "/records"
      : "/records";
    reminders.push({
      source: "question",
      id: `q:${resp.user_id}:${resp.question_id}:${resp.instance_id}`,
      userId: resp.user_id,
      categoryId: category,
      subcategoryId: q.subcategory_id,
      title,
      dueDate: resp.value,
      daysUntil: days,
      status: toStatus(days),
      href,
    });
  }

  reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  return reminders;
}

export function filterUpcoming(all: Reminder[]): Reminder[] {
  return all.filter((r) => r.daysUntil <= UPCOMING_WINDOW_DAYS);
}

// "All good" = family-wide count of records whose expiry is either not set or
// far enough in the future to not need attention. Includes both records with
// no expiry AND records whose expiry is beyond the 60-day window.
export async function countHealthyRecordsForFamily(
  familyGroupId: string
): Promise<number> {
  const supabase = createServiceClient();

  const usersRes = await supabase
    .from("users")
    .select("id")
    .eq("family_group_id", familyGroupId);
  if (usersRes.error) throw usersRes.error;
  const userIds = ((usersRes.data ?? []) as { id: string }[]).map((u) => u.id);
  if (userIds.length === 0) return 0;

  const threshold = new Date(
    Date.now() + UPCOMING_WINDOW_DAYS * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  const [noExpiry, futureExpiry] = await Promise.all([
    supabase
      .from("records")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .is("expiry_date", null),
    supabase
      .from("records")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .gt("expiry_date", threshold),
  ]);
  if (noExpiry.error) throw noExpiry.error;
  if (futureExpiry.error) throw futureExpiry.error;

  return (noExpiry.count ?? 0) + (futureExpiry.count ?? 0);
}
