import { createServiceClient } from "@/lib/supabase/server";
import { findContent } from "@/content/learning";
import type { CategoryId } from "@/lib/db/types";

export type ActivityKind =
  | "record_added"
  | "record_updated"
  | "file_uploaded"
  | "answer_updated"
  | "lesson_completed"
  | "lesson_started"
  | "quiz_completed";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;             // e.g. "Uploaded document: Passport"
  href: string;              // where to go on click
  occurredAt: string;        // ISO timestamp
  actorUserId: string;
}

interface QueryOptions {
  limit?: number;
  sinceDays?: number;
}

export async function listRecentActivityForFamily(
  familyGroupId: string,
  opts: QueryOptions = {}
): Promise<ActivityEvent[]> {
  const supabase = createServiceClient();
  const limit = opts.limit ?? 20;
  const sinceIso = opts.sinceDays
    ? new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString()
    : null;

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

  // Fetch each source in parallel. Cap each at 3x limit so the final merged
  // list has enough headroom after sort.
  const perSourceLimit = limit * 3;

  const [recordsRes, filesRes, answersRes, progressRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("records")
        .select("id, user_id, category_id, subcategory_id, title, created_at, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .limit(perSourceLimit);
      if (sinceIso) q = q.gte("updated_at", sinceIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("file_objects")
        .select("id, user_id, subcategory_id, filename, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(perSourceLimit);
      if (sinceIso) q = q.gte("created_at", sinceIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("question_responses")
        .select("user_id, question_id, instance_id, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .limit(perSourceLimit);
      if (sinceIso) q = q.gte("updated_at", sinceIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("progress_items")
        .select("id, user_id, item_type, item_id, status, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .limit(perSourceLimit);
      if (sinceIso) q = q.gte("updated_at", sinceIso);
      return q;
    })(),
  ]);
  if (recordsRes.error) throw recordsRes.error;
  if (filesRes.error) throw filesRes.error;
  if (answersRes.error) throw answersRes.error;
  if (progressRes.error) throw progressRes.error;

  const records = (recordsRes.data ?? []) as {
    id: string;
    user_id: string;
    category_id: CategoryId;
    subcategory_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
  }[];
  const files = (filesRes.data ?? []) as {
    id: string;
    user_id: string;
    subcategory_id: string | null;
    filename: string;
    created_at: string;
  }[];
  const answers = (answersRes.data ?? []) as {
    user_id: string;
    question_id: string;
    instance_id: string;
    updated_at: string;
  }[];
  const progress = (progressRes.data ?? []) as {
    id: string;
    user_id: string;
    item_type: string;
    item_id: string;
    status: string;
    updated_at: string;
  }[];

  // Resolve subcategory + question metadata for labels.
  const subIds = new Set<string>();
  for (const r of records) if (r.subcategory_id) subIds.add(r.subcategory_id);
  for (const f of files) if (f.subcategory_id) subIds.add(f.subcategory_id);
  const questionIds = new Set(answers.map((a) => a.question_id));

  const [subsRes, questionsRes] = await Promise.all([
    subIds.size
      ? supabase
          .from("subcategories")
          .select("id, category_id, name")
          .in("id", Array.from(subIds))
      : Promise.resolve({ data: [], error: null }),
    questionIds.size
      ? supabase
          .from("page_questions")
          .select("id, subcategory_id, label")
          .in("id", Array.from(questionIds))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subsRes.error) throw subsRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const subById = new Map<
    string,
    { id: string; category_id: CategoryId; name: string }
  >();
  for (const s of (subsRes.data ?? []) as {
    id: string;
    category_id: CategoryId;
    name: string;
  }[]) {
    subById.set(s.id, s);
  }
  const questionById = new Map<
    string,
    { id: string; subcategory_id: string | null; label: string }
  >();
  for (const q of (questionsRes.data ?? []) as {
    id: string;
    subcategory_id: string | null;
    label: string;
  }[]) {
    questionById.set(q.id, q);
  }
  // Fetch any subcategories referenced by questions but not yet loaded.
  const extraSubIds = new Set<string>();
  for (const q of questionById.values()) {
    if (q.subcategory_id && !subById.has(q.subcategory_id)) {
      extraSubIds.add(q.subcategory_id);
    }
  }
  if (extraSubIds.size) {
    const extraRes = await supabase
      .from("subcategories")
      .select("id, category_id, name")
      .in("id", Array.from(extraSubIds));
    if (extraRes.error) throw extraRes.error;
    for (const s of (extraRes.data ?? []) as {
      id: string;
      category_id: CategoryId;
      name: string;
    }[]) {
      subById.set(s.id, s);
    }
  }

  const events: ActivityEvent[] = [];

  for (const r of records) {
    const created = new Date(r.created_at).getTime();
    const updated = new Date(r.updated_at).getTime();
    const kind: ActivityKind =
      Math.abs(updated - created) < 60_000 ? "record_added" : "record_updated";
    const label = kind === "record_added" ? "Added record" : "Updated record";
    events.push({
      id: `record:${r.id}:${r.updated_at}`,
      kind,
      title: `${label}: ${r.title}`,
      href: `/records/${r.category_id}/r/${r.id}`,
      occurredAt: r.updated_at,
      actorUserId: r.user_id,
    });
  }

  for (const f of files) {
    const sub = f.subcategory_id ? subById.get(f.subcategory_id) : null;
    const href = sub
      ? `/records/${sub.category_id}/${sub.id}`
      : "/records";
    events.push({
      id: `file:${f.id}`,
      kind: "file_uploaded",
      title: `Uploaded document: ${f.filename}`,
      href,
      occurredAt: f.created_at,
      actorUserId: f.user_id,
    });
  }

  // Deduplicate question_responses per (user, subcategory) so a burst of
  // saves on one form becomes one activity item.
  const answerDedup = new Map<string, (typeof answers)[number]>();
  for (const a of answers) {
    const q = questionById.get(a.question_id);
    const subId = q?.subcategory_id ?? "unknown";
    const key = `${a.user_id}|${subId}`;
    const existing = answerDedup.get(key);
    if (!existing || existing.updated_at < a.updated_at) {
      answerDedup.set(key, a);
    }
  }
  for (const a of answerDedup.values()) {
    const q = questionById.get(a.question_id);
    const sub = q?.subcategory_id ? subById.get(q.subcategory_id) : null;
    const name = sub?.name ?? q?.label ?? "form";
    const href = sub
      ? `/records/${sub.category_id}/${sub.id}`
      : "/records";
    events.push({
      id: `answer:${a.user_id}:${q?.subcategory_id ?? "x"}:${a.updated_at}`,
      kind: "answer_updated",
      title: `Updated ${name}`,
      href,
      occurredAt: a.updated_at,
      actorUserId: a.user_id,
    });
  }

  for (const p of progress) {
    if (p.item_type === "content") {
      const article = findContent(p.item_id);
      const label =
        p.status === "completed" ? "Completed lesson" : "Started lesson";
      const kind: ActivityKind =
        p.status === "completed" ? "lesson_completed" : "lesson_started";
      events.push({
        id: `progress:${p.id}`,
        kind,
        title: `${label}: ${article?.title ?? p.item_id}`,
        href: article
          ? `/learn/${article.categoryId}/article/${article.id}`
          : "/learn",
        occurredAt: p.updated_at,
        actorUserId: p.user_id,
      });
    } else if (p.item_type === "quiz" && p.status === "completed") {
      events.push({
        id: `progress:${p.id}`,
        kind: "quiz_completed",
        title: "Completed quiz",
        href: "/learn/quizzes",
        occurredAt: p.updated_at,
        actorUserId: p.user_id,
      });
    }
  }

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return events.slice(0, limit);
}
