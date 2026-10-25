import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { createServiceClient } from "@/lib/supabase/server";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import type { PageQuestionRow } from "@/lib/db/types";

// GET /api/linked-children?subcategoryId=…&targetUserId=…
//
// The reverse of a "linked entry" field: for a folder others link to (a
// school, a bank account, a loan…), the entries in those other folders that
// point at each of its entries — e.g. a school's reports and certificates.
// One request per folder page; the client picks out each entry's list.

interface Child {
  instanceId: string;
  label: string;
  file: { id: string; filename: string; mimeType: string | null } | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = request.nextUrl.searchParams;
    const parentSub = sp.get("subcategoryId") ?? "";
    let owner = session.user.id;
    const target = sp.get("targetUserId");
    if (target && target !== session.user.id) {
      if (!(await isUserInFamilyGroup(target, session.user.familyGroupId))) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      owner = target;
    }
    const sb = createServiceClient();

    // Link fields elsewhere that point at this folder.
    const { data: links } = await sb
      .from("page_questions")
      .select("id, subcategory_id")
      .eq("question_type", "linked_entry")
      .eq("linked_subcategory_id", parentSub);
    const linkQs = (links ?? []) as { id: string; subcategory_id: string }[];
    if (linkQs.length === 0) return NextResponse.json({ groups: [] });

    const childSubs = [...new Set(linkQs.map((l) => l.subcategory_id))];
    const [{ data: subs }, { data: qs }] = await Promise.all([
      sb.from("subcategories").select("id, name, category_id").in("id", childSubs),
      sb.from("page_questions").select("*").in("subcategory_id", childSubs).order("row_order"),
    ]);
    const questions = (qs ?? []) as PageQuestionRow[];
    const { data: answers } = await sb
      .from("question_responses")
      .select("question_id, instance_id, value")
      .eq("user_id", owner)
      .in("question_id", questions.map((q) => q.id));

    // child folder → instance → { question → value }
    const qById = new Map(questions.map((q) => [q.id, q]));
    const entries = new Map<string, Map<string, Record<string, string>>>();
    for (const a of (answers ?? []) as { question_id: string; instance_id: string; value: string | null }[]) {
      const q = qById.get(a.question_id);
      if (!q?.subcategory_id || !a.value || a.instance_id === "default") continue;
      const bySub = entries.get(q.subcategory_id) ?? new Map();
      const e = bySub.get(a.instance_id) ?? {};
      e[a.question_id] = a.value;
      bySub.set(a.instance_id, e);
      entries.set(q.subcategory_id, bySub);
    }

    const fileIds: string[] = [];
    for (const bySub of entries.values())
      for (const e of bySub.values())
        for (const [qid, v] of Object.entries(e)) if (qById.get(qid)?.question_type === "file") fileIds.push(v);
    const { data: files } = fileIds.length
      ? await sb.from("file_objects").select("id, filename, mime_type").in("id", fileIds)
      : { data: [] };
    const fileById = new Map(((files ?? []) as { id: string; filename: string; mime_type: string | null }[]).map((f) => [f.id, f]));

    const groups = childSubs
      .map((sub) => {
        const folder = (subs ?? []).find((s) => s.id === sub) as { id: string; name: string; category_id: string } | undefined;
        const subQs = questions.filter((q) => q.subcategory_id === sub);
        const linkIds = linkQs.filter((l) => l.subcategory_id === sub).map((l) => l.id);
        const byParent: Record<string, Child[]> = {};
        for (const [inst, e] of entries.get(sub) ?? new Map<string, Record<string, string>>()) {
          const parent = linkIds.map((id) => e[id]).find(Boolean);
          if (!parent) continue;
          const fileQ = subQs.find((q) => q.question_type === "file" && e[q.id]);
          const f = fileQ ? fileById.get(e[fileQ.id]) : undefined;
          // Label: its title, then year / term and date, else the file name.
          const title = subQs.find((q) => q.id.endsWith(".title") && e[q.id]);
          const extras = subQs
            .filter((q) => (q.id.endsWith(".period") || q.question_type === "date") && e[q.id])
            .map((q) => formatQuestionValue(q, e[q.id]));
          const label =
            [title ? e[title.id] : f?.filename ?? `Entry ${inst}`, ...extras].filter(Boolean).join(" · ");
          (byParent[parent] ??= []).push({
            instanceId: inst,
            label,
            file: f ? { id: f.id, filename: f.filename, mimeType: f.mime_type } : null,
          });
        }
        return folder
          ? { subcategoryId: sub, folderName: folder.name, categoryId: folder.category_id, byParent }
          : null;
      })
      .filter(Boolean);
    return NextResponse.json({ groups });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/linked-children] failed:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
