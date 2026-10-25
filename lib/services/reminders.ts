import { getRepeaterArchive, isDateInPast } from "@/lib/repeater-archive";
import { createServiceClient } from "@/lib/supabase/server";
import { listCustomRemindersForFamily } from "@/lib/db/custom-reminders";
import { listBillRemindersForUsers } from "@/lib/db/budgets";
import { localToday, nextDueDate } from "@/lib/budget";
import type { CategoryId, Recurrence } from "@/lib/db/types";

const UPCOMING_WINDOW_DAYS = 60;

export type ReminderSource = "record" | "question" | "custom" | "goal" | "bill";

export interface Reminder {
  source: ReminderSource;
  id: string;                    // stable key
  userId: string;                // user this reminder belongs to
  categoryId: CategoryId | null;
  subcategoryId: string | null;
  title: string;
  dueDate: string;               // YYYY-MM-DD (effective — reflects snooze)
  daysUntil: number;             // negative = expired
  status: "expired" | "expiring_soon" | "upcoming";
  href: string;                  // where to go to view/edit
  recurrence?: Recurrence | null;
  linkedRecord?: { id: string; title: string; categoryId: CategoryId } | null;
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

    // Archived entries (a past referral, an old card, a finished script)
    // no longer remind — skip any whose archive date has passed.
    const archiveFieldIds = Array.from(
      new Set(
        reminderQuestions
          .map((q) => (q.subcategory_id ? getRepeaterArchive(q.subcategory_id)?.dateFieldId : undefined))
          .filter((id): id is string => Boolean(id))
      )
    );
    if (archiveFieldIds.length && responses.length) {
      const aRes = await supabase
        .from("question_responses")
        .select("user_id, question_id, value, instance_id")
        .in("user_id", userIds)
        .in("question_id", archiveFieldIds);
      if (aRes.error) throw aRes.error;
      const archived = new Set(
        ((aRes.data ?? []) as typeof responses)
          .filter((a) => isDateInPast(a.value))
          .map((a) => `${a.user_id}|${a.question_id.split(".")[0]}|${a.instance_id}`)
      );
      responses = responses.filter(
        (r) => !archived.has(`${r.user_id}|${r.question_id.split(".")[0]}|${r.instance_id}`)
      );
    }

  // Resolve subcategory -> {category, name} for reminder-question rows.
  const subIds = Array.from(
    new Set(
      reminderQuestions
        .map((q) => q.subcategory_id)
        .filter((s): s is string => s != null)
    )
  );
  const subToCategory = new Map<string, CategoryId>();
  const subToName = new Map<string, string>();
  if (subIds.length) {
    const sRes = await supabase
      .from("subcategories")
      .select("id, category_id, name")
      .in("id", subIds);
    if (sRes.error) throw sRes.error;
    for (const row of (sRes.data ?? []) as {
      id: string;
      category_id: CategoryId;
      name: string;
    }[]) {
      subToCategory.set(row.id, row.category_id);
      subToName.set(row.id, row.name);
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
    const subName = q.subcategory_id
      ? subToName.get(q.subcategory_id) ?? null
      : null;
    const cleanedSubName = subName
      ? subName.replace(/^TAL\s*[—-]\s*/, "")
      : null;
    const docPart = cleanedSubName
      ? `${cleanedSubName} · ${q.label}`
      : q.label;
    const title = memberName ? `${memberName} — ${docPart}` : docPart;
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

  const customRows = await listCustomRemindersForFamily(familyGroupId);
  const linkedRecordIds = Array.from(
    new Set(
      customRows
        .filter((c) => !c.completed_at && c.record_id)
        .map((c) => c.record_id as string)
    )
  );
  const recordById = new Map<
    string,
    { id: string; title: string; category_id: CategoryId }
  >();
  if (linkedRecordIds.length) {
    const linkedRes = await supabase
      .from("records")
      .select("id, title, category_id")
      .in("id", linkedRecordIds);
    if (linkedRes.error) throw linkedRes.error;
    for (const row of (linkedRes.data ?? []) as {
      id: string;
      title: string;
      category_id: CategoryId;
    }[]) {
      recordById.set(row.id, row);
    }
  }
  for (const c of customRows) {
    if (c.completed_at) continue;
    const effectiveDue = c.snoozed_until ?? c.due_date;
    const days = daysFromToday(effectiveDue);
    const linked =
      c.record_id && recordById.get(c.record_id)
        ? {
            id: recordById.get(c.record_id)!.id,
            title: recordById.get(c.record_id)!.title,
            categoryId: recordById.get(c.record_id)!.category_id,
          }
        : null;
    reminders.push({
      source: "custom",
      id: `custom:${c.id}`,
      userId: c.user_id,
      categoryId: linked?.categoryId ?? null,
      subcategoryId: null,
      title: c.title,
      dueDate: effectiveDue,
      daysUntil: days,
      status: toStatus(days),
      href: linked ? `/records/${linked.categoryId}/r/${linked.id}` : "/reminders",
      recurrence: c.recurrence,
      linkedRecord: linked,
    });
  }

  reminders.push(...(await listGoalReminders(userIds)));
  reminders.push(...(await listBillReminders(userIds)));

  reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  return reminders;
}

// Life Goals & Plans dates the member ticked "Remind me" on: a goal's target
// date, its next check-in, and the due dates of unfinished action steps.
// Failures are swallowed (and logged) so a problem here — e.g. the life_goals
// tables not being migrated yet — can't take the dashboard down with it.
async function listGoalReminders(userIds: string[]): Promise<Reminder[]> {
  try {
    const supabase = createServiceClient();
    const { data: goalData, error } = await supabase
      .from("life_goals")
      .select("id, user_id, title, target_date, remind_target, checkin_date, remind_checkin")
      .in("user_id", userIds);
    if (error) throw error;
    const goals = (goalData ?? []) as {
      id: string;
      user_id: string;
      title: string;
      target_date: string | null;
      remind_target: boolean;
      checkin_date: string | null;
      remind_checkin: boolean;
    }[];
    if (goals.length === 0) return [];
    const { data: stepData, error: stepError } = await supabase
      .from("life_goal_steps")
      .select("id, goal_id, action, due_date")
      .in("goal_id", goals.map((g) => g.id))
      .eq("remind", true)
      .neq("status", "done")
      .not("due_date", "is", null);
    if (stepError) throw stepError;
    const steps = (stepData ?? []) as {
      id: string;
      goal_id: string;
      action: string;
      due_date: string;
    }[];

    const goalById = new Map(goals.map((g) => [g.id, g]));
    const out: Reminder[] = [];
    const add = (id: string, userId: string, title: string, dueDate: string) => {
      const days = daysFromToday(dueDate);
      out.push({
        source: "goal",
        id,
        userId,
        categoryId: "health",
        subcategoryId: "health.life_goals_plans",
        title,
        dueDate,
        daysUntil: days,
        status: toStatus(days),
        href: `/records/health/health.life_goals_plans?user=${encodeURIComponent(userId)}`,
      });
    };
    for (const g of goals) {
      if (g.remind_target && g.target_date) {
        add(`goal:${g.id}:target`, g.user_id, `Goal target date — ${g.title}`, g.target_date);
      }
      if (g.remind_checkin && g.checkin_date) {
        add(`goal:${g.id}:checkin`, g.user_id, `Goal check-in — ${g.title}`, g.checkin_date);
      }
    }
    for (const s of steps) {
      const g = goalById.get(s.goal_id);
      if (!g) continue;
      add(
        `goal-step:${s.id}`,
        g.user_id,
        `Goal step — ${s.action.trim() || g.title}`,
        s.due_date
      );
    }
    return out;
  } catch (e) {
    console.error("[reminders] goal reminders failed", e);
    return [];
  }
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

// Budget bills the member chose a reminder for, at their next due date
// (repeating bills roll forward on their own). Failures are swallowed and
// logged, like goal reminders, so the dashboard can't break because of them.
async function listBillReminders(userIds: string[]): Promise<Reminder[]> {
  try {
    const bills = await listBillRemindersForUsers(userIds);
    const today = localToday(null);
    return bills.map((b) => {
      const due = nextDueDate(b.due_date, b.repeats, today);
      const days = daysFromToday(due);
      const amount =
        b.amount != null
          ? ` (${b.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })})`
          : "";
      return {
        source: "bill" as const,
        id: `bill:${b.id}`,
        userId: b.user_id,
        categoryId: "admin" as const,
        subcategoryId: "admin.budgets",
        title: `Bill due — ${b.label.trim() || "Bill"}${amount}`,
        dueDate: due,
        daysUntil: days,
        status: toStatus(days),
        href: `/records/admin/admin.budgets?user=${encodeURIComponent(b.user_id)}`,
      };
    });
  } catch (e) {
    console.error("[reminders] bill reminders failed", e);
    return [];
  }
}
