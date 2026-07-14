import { createServiceClient } from "@/lib/supabase/server";
import type { CategoryId, SubcategoryScope } from "@/lib/db/types";

export interface FolderProgress {
  scope: SubcategoryScope;
  completedCount: number;      // filled forms (per_user or family_singleton)
  targetCount: number;          // total possible (users for per_user, 1 for singleton)
  instanceCount: number;        // for family_list / user_list: how many rows
}

export function folderIsComplete(p: FolderProgress): boolean {
  if (p.scope === "user_list") return p.instanceCount > 0;
  if (p.scope === "family_list") return p.instanceCount > 0;
  if (p.scope === "per_user_list") return p.instanceCount > 0;
  if (p.scope === "family_singleton") {
    return p.targetCount > 0 && p.completedCount >= p.targetCount;
  }
  // per_user
  return p.targetCount > 0 && p.completedCount >= p.targetCount;
}

export function folderIsStarted(p: FolderProgress): boolean {
  if (
    p.scope === "user_list" ||
    p.scope === "family_list" ||
    p.scope === "per_user_list"
  ) {
    return p.instanceCount > 0;
  }
  return p.completedCount > 0;
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

  const requiredBySub = new Map<string, string[]>();
  const hasFormBySub = new Set<string>();
  for (const q of allQuestions) {
    hasFormBySub.add(q.subcategory_id);
    if (q.required) {
      const arr = requiredBySub.get(q.subcategory_id) ?? [];
      arr.push(q.id);
      requiredBySub.set(q.subcategory_id, arr);
    }
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
        .select("id, subcategory_id")
        .in("subcategory_id", subIds)
        .eq("required", true)
    : { data: [], error: null };
  if (questionsResult.error) throw questionsResult.error;
  const questions = (questionsResult.data ?? []) as QuestionMeta[];

  // Group required question ids by subcategory
  const requiredBySub = new Map<string, string[]>();
  for (const q of questions) {
    const arr = requiredBySub.get(q.subcategory_id) ?? [];
    arr.push(q.id);
    requiredBySub.set(q.subcategory_id, arr);
  }

  const allRequiredIds = questions.map((q) => q.id);
  const responsesResult =
    userIds.length && allRequiredIds.length
      ? await supabase
          .from("question_responses")
          .select("user_id, question_id, value")
          .in("user_id", userIds)
          .in("question_id", allRequiredIds)
      : { data: [], error: null };
  if (responsesResult.error) throw responsesResult.error;
  const responses = (responsesResult.data ?? []) as ResponseRow[];

  // Build: user_id -> Set of question_ids with a non-empty value
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
    const required = requiredBySub.get(s.id) ?? [];

    if (s.scope === "user_list") {
      out.set(s.id, {
        scope: s.scope,
        completedCount: userCount,
        targetCount: userCount,
        instanceCount: userCount,
      });
      continue;
    }

    if (s.scope === "family_list" || s.scope === "per_user_list") {
      const n = instanceCounts.get(s.id) ?? 0;
      out.set(s.id, {
        scope: s.scope,
        completedCount: 0,
        targetCount: 0,
        instanceCount: n,
      });
      continue;
    }

    if (s.scope === "family_singleton") {
      // Anchor on the first (or primary) user in the family. For MVP: check
      // if any user has all required questions answered.
      let done = false;
      if (required.length === 0) {
        done = false;
      } else {
        for (const uid of userIds) {
          const filled = filledByUser.get(uid);
          if (!filled) continue;
          if (required.every((qid) => filled.has(qid))) {
            done = true;
            break;
          }
        }
      }
      out.set(s.id, {
        scope: s.scope,
        completedCount: done ? 1 : 0,
        targetCount: 1,
        instanceCount: 0,
      });
      continue;
    }

    // per_user
    let completed = 0;
    if (required.length > 0) {
      for (const uid of userIds) {
        const filled = filledByUser.get(uid);
        if (!filled) continue;
        if (required.every((qid) => filled.has(qid))) completed += 1;
      }
    }
    out.set(s.id, {
      scope: s.scope,
      completedCount: completed,
      targetCount: userCount,
      instanceCount: 0,
    });
  }

  return out;
}
