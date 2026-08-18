import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, SubcategoryScope } from "@/lib/db/types";
import { listActiveFolderDismissals } from "@/lib/db/folder-dismissals";

export interface FolderProgress {
  scope: SubcategoryScope;
  startedCount: number;        // partially filled but not complete
  completedCount: number;      // fully filled
  targetCount: number;          // total possible (users for per_user, 1 for singleton)
  instanceCount: number;        // for family_list / user_list / per_user_list: how many rows
}

// For UI: unified "total" used by list scopes (instanceCount) vs form scopes (targetCount).
export function folderTotal(p: FolderProgress): number {
  if (
    p.scope === "user_list" ||
    p.scope === "family_list" ||
    p.scope === "per_user_list"
  ) {
    return p.instanceCount;
  }
  return p.targetCount;
}

export function folderIsComplete(p: FolderProgress): boolean {
  const total = folderTotal(p);
  return total > 0 && p.completedCount >= total;
}

export function folderIsStarted(p: FolderProgress): boolean {
  return p.startedCount > 0 || p.completedCount > 0;
}

export interface CategoryProgress {
  categoryId: CategoryId;
  totalFolders: number;
  completedFolders: number;
  startedFolders: number;
}

export interface MatrixUser {
  id: string;
  displayName: string;
  isPrimary: boolean;
  memberKind: string;
}

export interface MatrixRow {
  subcategoryId: string;
  name: string;
  hint: string | null;
  scope: SubcategoryScope;
  hasForm: boolean;
  // per user id -> "done" | "empty" (when hasForm) | "na" (no form or not applicable)
  cellByUser: Record<string, "done" | "empty" | "na">;
}

export interface MatrixData {
  users: MatrixUser[];
  rows: MatrixRow[];
}

export async function categoryMatrixForFamily(
  familyGroupId: string,
  categoryId: CategoryId
): Promise<MatrixData> {
  const supabase = createServiceClient();

  const [subsResult, usersResult] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, scope, name, hint, sort_order")
      .eq("category_id", categoryId)
      .in("scope", ["per_user", "user_list", "per_user_list"])
      .is("template_group", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("users")
      .select("id, first_name, last_name, name, email, is_primary, member_kind, order_index")
      .eq("family_group_id", familyGroupId)
      .order("is_primary", { ascending: false })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (subsResult.error) throw subsResult.error;
  if (usersResult.error) throw usersResult.error;

  const subs = (subsResult.data ?? []) as {
    id: string;
    scope: SubcategoryScope;
    name: string;
    hint: string | null;
    sort_order: number;
  }[];
  const users = (usersResult.data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    email: string | null;
    is_primary: boolean;
    member_kind: string;
    order_index: number;
  }[];

  const matrixUsers: MatrixUser[] = users.map((u) => ({
    id: u.id,
    displayName:
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      u.name ||
      u.email ||
      "Unnamed",
    isPrimary: u.is_primary,
    memberKind: u.member_kind,
  }));

  // Required questions per subcategory (only per_user rows matter for cells).
  const subIds = subs.map((s) => s.id);
  const questionsResult = subIds.length
    ? await supabase
        .from("page_questions")
        .select("id, subcategory_id, required")
        .in("subcategory_id", subIds)
    : { data: [], error: null };
  if (questionsResult.error) throw questionsResult.error;
  const allQuestions = (questionsResult.data ?? []) as {
    id: string;
    subcategory_id: string;
    required: boolean;
  }[];

  // Fallback rule: if a subcategory has no required questions, treat ALL its
  // questions as the completion criteria.
  const questionsBySub = new Map<
    string,
    { id: string; required: boolean }[]
  >();
  const hasFormBySub = new Set<string>();
  for (const q of allQuestions) {
    hasFormBySub.add(q.subcategory_id);
    const arr = questionsBySub.get(q.subcategory_id) ?? [];
    arr.push({ id: q.id, required: q.required });
    questionsBySub.set(q.subcategory_id, arr);
  }
  const requiredBySub = new Map<string, string[]>();
  for (const [subId, qs] of questionsBySub) {
    const req = qs.filter((q) => q.required).map((q) => q.id);
    requiredBySub.set(subId, req.length ? req : qs.map((q) => q.id));
  }

  const allRequiredIds = Array.from(requiredBySub.values()).flat();
  const userIds = matrixUsers.map((u) => u.id);
  const responsesResult =
    userIds.length && allRequiredIds.length
      ? await supabase
          .from("question_responses")
          .select("user_id, question_id, value")
          .in("user_id", userIds)
          .in("question_id", allRequiredIds)
      : { data: [], error: null };
  if (responsesResult.error) throw responsesResult.error;
  const responses = (responsesResult.data ?? []) as {
    user_id: string;
    question_id: string;
    value: string | null;
  }[];

  const filledByUser = new Map<string, Set<string>>();
  for (const r of responses) {
    if (r.value == null || r.value === "") continue;
    const set = filledByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.question_id);
    filledByUser.set(r.user_id, set);
  }

  // per_user_list: count of records per (user_id, subcategory_id) for the family.
  const perUserListSubIds = subs
    .filter((s) => s.scope === "per_user_list")
    .map((s) => s.id);
  const recordCountByUserSub = new Map<string, number>(); // key = user_id + '|' + sub_id
  if (perUserListSubIds.length && matrixUsers.length) {
    const uIds = matrixUsers.map((u) => u.id);
    const recRes = await supabase
      .from("records")
      .select("user_id, subcategory_id")
      .in("user_id", uIds)
      .in("subcategory_id", perUserListSubIds);
    if (recRes.error) throw recRes.error;
    for (const row of (recRes.data ?? []) as {
      user_id: string;
      subcategory_id: string | null;
    }[]) {
      if (!row.subcategory_id) continue;
      const k = `${row.user_id}|${row.subcategory_id}`;
      recordCountByUserSub.set(k, (recordCountByUserSub.get(k) ?? 0) + 1);
    }
  }

  const rows: MatrixRow[] = subs.map((s) => {
    const hasForm = hasFormBySub.has(s.id);
    const required = requiredBySub.get(s.id) ?? [];
    const cellByUser: Record<string, "done" | "empty" | "na"> = {};

    for (const u of matrixUsers) {
      if (s.scope === "user_list") {
        cellByUser[u.id] = "done";
        continue;
      }
      if (s.scope === "per_user_list") {
        const n = recordCountByUserSub.get(`${u.id}|${s.id}`) ?? 0;
        cellByUser[u.id] = n > 0 ? "done" : "empty";
        continue;
      }
      // per_user
      if (!hasForm || required.length === 0) {
        cellByUser[u.id] = "na";
        continue;
      }
      const filled = filledByUser.get(u.id);
      const done = filled && required.every((qid) => filled.has(qid));
      cellByUser[u.id] = done ? "done" : "empty";
    }

    return {
      subcategoryId: s.id,
      name: s.name,
      hint: s.hint,
      scope: s.scope,
      hasForm,
      cellByUser,
    };
  });

  return { users: matrixUsers, rows };
}

export interface HiddenSuggestion {
  subcategoryId: string;
  name: string;
  categoryId: CategoryId;
  dismissedUntil: string | null; // null = permanent
}

// Hydrates each of the user's active dismissals with the subcategory name +
// category so the "Show hidden suggestions" UI can render meaningful entries.
export async function listHiddenSuggestionsForUser(
  userId: string
): Promise<HiddenSuggestion[]> {
  const dismissals = await listActiveFolderDismissals(userId);
  if (dismissals.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, name, category_id")
    .in(
      "id",
      dismissals.map((d) => d.subcategory_id)
    )
    .is("template_group", null);
  if (error) throw error;
  const subById = new Map(
    ((data ?? []) as {
      id: string;
      name: string;
      category_id: CategoryId;
    }[]).map((s) => [s.id, s])
  );
  const out: HiddenSuggestion[] = [];
  for (const d of dismissals) {
    const sub = subById.get(d.subcategory_id);
    if (!sub) continue;
    out.push({
      subcategoryId: d.subcategory_id,
      name: sub.name,
      categoryId: sub.category_id,
      dismissedUntil: d.dismissed_until,
    });
  }
  return out;
}

export interface MissingFolder {
  categoryId: CategoryId;
  subcategoryId: string;
  name: string;
  href: string;
  state: "empty" | "started";
  reason: string | null;
}

// Emergency-critical folders come first in the "Next things to complete" list.
// Order matters — earlier IDs outrank later ones. Anything not listed here
// falls back to category + sort_order.
export const PRIORITY_SUBCATEGORY_IDS: readonly string[] = [
  "personal.emergency_contacts",
  "health.medication_list",
  "health.my_health_plan",
  "health.health_insurance",
  "health.life_insurance",
  "personal.will_funeral",
  "personal.advanced_health_directive",
  "personal.power_of_attorney",
];
const PRIORITY_RANK = new Map(
  PRIORITY_SUBCATEGORY_IDS.map((id, i) => [id, i])
);
const PRIORITY_SET = new Set<string>(PRIORITY_SUBCATEGORY_IDS);

export function isPrioritySubcategory(id: string): boolean {
  return PRIORITY_SET.has(id);
}

// Which subcategories feed the /emergency page. Kept in sync with
// EMERGENCY_SUBCATEGORIES in lib/services/emergency.ts.
const EMERGENCY_PAGE_SUBCATEGORY_IDS = new Set<string>([
  "personal.emergency_contacts",
  "personal.general_information",
  "health.medical_advisers",
  "health.medication_list",
  "health.health_insurance_cards",
  "health.health_insurance",
  "personal.licences_ids",
  "personal.advanced_health_directive",
  "personal.will_funeral",
  "personal.power_of_attorney",
  "health.life_insurance",
  "admin.home_insurance",
  "admin.vehicle_insurance",
]);

// Extra reasons for priority folders that don't surface on the Emergency page
// but still matter for the "why is this recommended" line.
const EXTRA_REASONS: Record<string, string> = {
  "health.my_health_plan":
    "Keeps allergies, conditions and medications ready for medical staff.",
};

function reasonFor(subcategoryId: string): string | null {
  if (EMERGENCY_PAGE_SUBCATEGORY_IDS.has(subcategoryId)) {
    return "Important for your Emergency Information page.";
  }
  return EXTRA_REASONS[subcategoryId] ?? null;
}

// Assembles the top N folders across all categories that still need attention.
// Empty folders come first (never touched), then partially-filled ones. Within
// each bucket, emergency-critical folders (see PRIORITY_SUBCATEGORY_IDS) are
// surfaced before general paperwork.
//
// `viewerUserId` is the currently signed-in user; their active dismissals
// (snoozed or "Not applicable") hide non-priority folders from the list.
export async function listMissingFoldersForFamily(
  familyGroupId: string,
  viewerUserId: string,
  limit = 5
): Promise<MissingFolder[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, name, category_id, sort_order")
    .is("template_group", null)
    .is("user_id", null)
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const subs = (data ?? []) as {
    id: string;
    name: string;
    category_id: CategoryId;
    sort_order: number;
  }[];
  const nameById = new Map(subs.map((s) => [s.id, s]));

  const categories = Array.from(new Set(subs.map((s) => s.category_id)));
  const [progressByCategory, dismissals] = await Promise.all([
    Promise.all(
      categories.map((c) => folderProgressForCategory(familyGroupId, c))
    ),
    listActiveFolderDismissals(viewerUserId),
  ]);
  const dismissedIds = new Set(dismissals.map((d) => d.subcategory_id));

  const empty: MissingFolder[] = [];
  const started: MissingFolder[] = [];
  categories.forEach((categoryId, i) => {
    for (const [subcategoryId, progress] of progressByCategory[i]) {
      if (folderIsComplete(progress)) continue;
      // Skip folders the user has dismissed — but never hide priority items,
      // even if a stale dismissal row exists from before they were promoted.
      if (
        dismissedIds.has(subcategoryId) &&
        !isPrioritySubcategory(subcategoryId)
      ) {
        continue;
      }
      const sub = nameById.get(subcategoryId);
      if (!sub) continue;
      const isStarted = folderIsStarted(progress);
      const bucket = isStarted ? started : empty;
      bucket.push({
        categoryId,
        subcategoryId,
        name: sub.name,
        href: `/records/${categoryId}/${subcategoryId}`,
        state: isStarted ? "started" : "empty",
        reason: reasonFor(subcategoryId),
      });
    }
  });

  const sortByPriority = (a: MissingFolder, b: MissingFolder) => {
    const ra = PRIORITY_RANK.get(a.subcategoryId) ?? Number.POSITIVE_INFINITY;
    const rb = PRIORITY_RANK.get(b.subcategoryId) ?? Number.POSITIVE_INFINITY;
    return ra - rb;
  };
  empty.sort(sortByPriority);
  started.sort(sortByPriority);

  return [...empty, ...started].slice(0, limit);
}

export type UserFolderStatus = "complete" | "started" | "empty";

// Per-user status for a Peace of Mind Planner section. All PoM sections are
// repeater lists, so "complete" isn't meaningful (the user can always add more
// entries) — we only distinguish empty vs. started.
export async function pomSectionStatusByUser(
  familyGroupId: string,
  subcategoryId: string
): Promise<Map<string, UserFolderStatus>> {
  const supabase = createServiceClient();

  const [questionsRes, usersRes] = await Promise.all([
    supabase
      .from("page_questions")
      .select("id")
      .eq("subcategory_id", subcategoryId),
    supabase
      .from("users")
      .select("id")
      .eq("family_group_id", familyGroupId),
  ]);
  if (questionsRes.error) throw questionsRes.error;
  if (usersRes.error) throw usersRes.error;

  const users = (usersRes.data ?? []) as { id: string }[];
  const out = new Map<string, UserFolderStatus>();
  for (const u of users) out.set(u.id, "empty");

  const questionIds = (questionsRes.data ?? []).map((q) => q.id as string);
  if (!questionIds.length || !users.length) return out;

  const respRes = await supabase
    .from("question_responses")
    .select("user_id, value")
    .in("user_id", users.map((u) => u.id))
    .in("question_id", questionIds);
  if (respRes.error) throw respRes.error;

  for (const r of (respRes.data ?? []) as {
    user_id: string;
    value: string | null;
  }[]) {
    if (r.value == null || r.value === "") continue;
    out.set(r.user_id, "started");
  }
  return out;
}

// Per-user completion status for a single subcategory. Used to colour user
// pickers so people can see at a glance which family members have started or
// finished a folder.
export async function subcategoryStatusByUser(
  familyGroupId: string,
  subcategoryId: string
): Promise<Map<string, UserFolderStatus>> {
  const supabase = createServiceClient();

  const [subResult, usersResult] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, scope")
      .eq("id", subcategoryId)
      .is("template_group", null)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id")
      .eq("family_group_id", familyGroupId),
  ]);
  if (subResult.error) throw subResult.error;
  if (usersResult.error) throw usersResult.error;

  const users = (usersResult.data ?? []) as { id: string }[];
  const out = new Map<string, UserFolderStatus>();
  for (const u of users) out.set(u.id, "empty");

  const sub = subResult.data as { id: string; scope: SubcategoryScope } | null;
  if (!sub) return out;

  if (sub.scope === "user_list") {
    // Every family member is present in the list by definition.
    for (const u of users) out.set(u.id, "complete");
    return out;
  }

  if (sub.scope === "per_user_list") {
    const uIds = users.map((u) => u.id);
    if (!uIds.length) return out;
    const recRes = await supabase
      .from("records")
      .select("user_id")
      .in("user_id", uIds)
      .eq("subcategory_id", subcategoryId);
    if (recRes.error) throw recRes.error;
    for (const row of (recRes.data ?? []) as { user_id: string }[]) {
      out.set(row.user_id, "complete");
    }
    return out;
  }

  // per_user (and family_singleton, though pickers don't usually appear there).
  const questionsRes = await supabase
    .from("page_questions")
    .select("id, required")
    .eq("subcategory_id", subcategoryId);
  if (questionsRes.error) throw questionsRes.error;
  const questions = (questionsRes.data ?? []) as {
    id: string;
    required: boolean;
  }[];
  if (!questions.length) return out;

  const requiredIds = questions.filter((q) => q.required).map((q) => q.id);
  const criteriaIds = requiredIds.length
    ? requiredIds
    : questions.map((q) => q.id);
  const uIds = users.map((u) => u.id);
  if (!uIds.length) return out;

  const respRes = await supabase
    .from("question_responses")
    .select("user_id, question_id, value")
    .in("user_id", uIds)
    .in("question_id", criteriaIds);
  if (respRes.error) throw respRes.error;

  const filledByUser = new Map<string, Set<string>>();
  for (const r of (respRes.data ?? []) as {
    user_id: string;
    question_id: string;
    value: string | null;
  }[]) {
    if (r.value == null || r.value === "") continue;
    const set = filledByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.question_id);
    filledByUser.set(r.user_id, set);
  }

  for (const u of users) {
    const filled = filledByUser.get(u.id);
    if (!filled || filled.size === 0) {
      out.set(u.id, "empty");
      continue;
    }
    const hits = criteriaIds.filter((qid) => filled.has(qid)).length;
    if (hits === criteriaIds.length) out.set(u.id, "complete");
    else if (hits > 0) out.set(u.id, "started");
    else out.set(u.id, "empty");
  }
  return out;
}

export async function categoryProgressForFamily(
  familyGroupId: string
): Promise<Map<CategoryId, CategoryProgress>> {
  const supabase = createServiceClient();
  const { data: catData, error: catError } = await supabase
    .from("subcategories")
    .select("category_id")
    .is("template_group", null)
    .order("category_id");
  if (catError) throw catError;
  const categories = Array.from(
    new Set(((catData ?? []) as { category_id: CategoryId }[]).map((r) => r.category_id))
  );

  const per = await Promise.all(
    categories.map((c) => folderProgressForCategory(familyGroupId, c))
  );

  const out = new Map<CategoryId, CategoryProgress>();
  categories.forEach((c, i) => {
    const rows = Array.from(per[i].values());
    out.set(c, {
      categoryId: c,
      totalFolders: rows.length,
      completedFolders: rows.filter(folderIsComplete).length,
      startedFolders: rows.filter(folderIsStarted).length,
    });
  });
  return out;
}

interface SubcatMeta {
  id: string;
  scope: SubcategoryScope;
}

interface QuestionMeta {
  id: string;
  subcategory_id: string;
}

interface ResponseRow {
  user_id: string;
  question_id: string;
  value: string | null;
  instance_id?: string;
}

export async function folderProgressForCategory(
  familyGroupId: string,
  categoryId: CategoryId
): Promise<Map<string, FolderProgress>> {
  const supabase = createServiceClient();

  const [subsResult, usersResult] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, scope")
      .eq("category_id", categoryId)
      .is("template_group", null),
    supabase
      .from("users")
      .select("id")
      .eq("family_group_id", familyGroupId),
  ]);
  if (subsResult.error) throw subsResult.error;
  if (usersResult.error) throw usersResult.error;

  const subs = (subsResult.data ?? []) as SubcatMeta[];
  const users = (usersResult.data ?? []) as { id: string }[];
  const userIds = users.map((u) => u.id);
  const userCount = userIds.length;

  const subIds = subs.map((s) => s.id);
  const questionsResult = subIds.length
    ? await supabase
        .from("page_questions")
        .select("id, subcategory_id, required")
        .in("subcategory_id", subIds)
    : { data: [], error: null };
  if (questionsResult.error) throw questionsResult.error;
  const questions = (questionsResult.data ?? []) as (QuestionMeta & {
    required: boolean;
  })[];

  // For each subcategory, "completion criteria" = required questions, OR all
  // questions if none are marked required. This means a folder with no
  // required flags still tracks started/complete based on whether the user
  // filled anything at all.
  const criteriaBySub = new Map<string, string[]>();
  const bySub = new Map<string, (QuestionMeta & { required: boolean })[]>();
  for (const q of questions) {
    const arr = bySub.get(q.subcategory_id) ?? [];
    arr.push(q);
    bySub.set(q.subcategory_id, arr);
  }
  for (const [subId, qs] of bySub) {
    const required = qs.filter((q) => q.required).map((q) => q.id);
    criteriaBySub.set(subId, required.length ? required : qs.map((q) => q.id));
  }

  const allCriteriaIds = Array.from(criteriaBySub.values()).flat();
  const responsesResult =
    userIds.length && allCriteriaIds.length
      ? await supabase
          .from("question_responses")
          .select("user_id, question_id, value")
          .in("user_id", userIds)
          .in("question_id", allCriteriaIds)
      : { data: [], error: null };
  if (responsesResult.error) throw responsesResult.error;
  const responses = (responsesResult.data ?? []) as ResponseRow[];

  // Build: user_id -> Set of question_ids with a non-empty value.
  const filledByUser = new Map<string, Set<string>>();
  for (const r of responses) {
    if (r.value == null || r.value === "") continue;
    const set = filledByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.question_id);
    filledByUser.set(r.user_id, set);
  }

  // Instance counts:
  //   family_list    → count rows in record_instances scoped to the family group
  //   per_user_list  → count rows in records for any user in the family group
  const instanceCounts = new Map<string, number>();
  const familyListIds = subs
    .filter((s) => s.scope === "family_list")
    .map((s) => s.id);
  if (familyListIds.length) {
    const instRes = await supabase
      .from("record_instances")
      .select("subcategory_id")
      .eq("family_group_id", familyGroupId)
      .in("subcategory_id", familyListIds);
    if (instRes.error) throw instRes.error;
    for (const row of (instRes.data ?? []) as { subcategory_id: string }[]) {
      instanceCounts.set(
        row.subcategory_id,
        (instanceCounts.get(row.subcategory_id) ?? 0) + 1
      );
    }
  }

  const perUserListIds = subs
    .filter((s) => s.scope === "per_user_list")
    .map((s) => s.id);
  if (perUserListIds.length && userIds.length) {
    const recRes = await supabase
      .from("records")
      .select("subcategory_id")
      .in("user_id", userIds)
      .in("subcategory_id", perUserListIds);
    if (recRes.error) throw recRes.error;
    for (const row of (recRes.data ?? []) as { subcategory_id: string | null }[]) {
      if (!row.subcategory_id) continue;
      instanceCounts.set(
        row.subcategory_id,
        (instanceCounts.get(row.subcategory_id) ?? 0) + 1
      );
    }
  }

  const out = new Map<string, FolderProgress>();
  for (const s of subs) {
    const required = criteriaBySub.get(s.id) ?? [];

    if (s.scope === "user_list") {
      out.set(s.id, {
        scope: s.scope,
        startedCount: 0,
        completedCount: userCount,
        targetCount: userCount,
        instanceCount: userCount,
      });
      continue;
    }

    if (s.scope === "family_list" || s.scope === "per_user_list") {
      const n = instanceCounts.get(s.id) ?? 0;
      // Lists have no per-instance form completion today, so every existing
      // instance is treated as complete. Started stays 0.
      out.set(s.id, {
        scope: s.scope,
        startedCount: 0,
        completedCount: n,
        targetCount: 0,
        instanceCount: n,
      });
      continue;
    }

    if (s.scope === "family_singleton") {
      let done = false;
      let anyFilled = false;
      if (required.length > 0) {
        for (const uid of userIds) {
          const filled = filledByUser.get(uid);
          if (!filled) continue;
          const hits = required.filter((qid) => filled.has(qid)).length;
          if (hits === required.length) {
            done = true;
            break;
          }
          if (hits > 0) anyFilled = true;
        }
      }
      out.set(s.id, {
        scope: s.scope,
        startedCount: done ? 0 : anyFilled ? 1 : 0,
        completedCount: done ? 1 : 0,
        targetCount: 1,
        instanceCount: 0,
      });
      continue;
    }

    // per_user
    let completed = 0;
    let started = 0;
    if (required.length > 0) {
      for (const uid of userIds) {
        const filled = filledByUser.get(uid);
        if (!filled) continue;
        const hits = required.filter((qid) => filled.has(qid)).length;
        if (hits === required.length) completed += 1;
        else if (hits > 0) started += 1;
      }
    }
    out.set(s.id, {
      scope: s.scope,
      startedCount: started,
      completedCount: completed,
      targetCount: userCount,
      instanceCount: 0,
    });
  }

  return out;
}
