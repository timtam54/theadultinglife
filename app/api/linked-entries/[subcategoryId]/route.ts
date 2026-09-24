import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { createServiceClient } from "@/lib/supabase/server";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import { apiError } from "@/lib/api-error";

// GET /api/linked-entries/[subcategoryId]?labelFields=id1,id2&targetUserId=…
//
// Returns the current user's (or targetUserId's) repeater entries from the
// given subcategory, formatted as { instance_id, label } for use in a
// linked_entry dropdown. Label is built by joining the requested field
// values with " — ". Empty label falls back to "Entry <n>".
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ subcategoryId: string }> }
) {
  try {
    const session = await requireSession();
    const { subcategoryId } = await ctx.params;
    const url = new URL(req.url);
    const labelFieldsRaw = url.searchParams.get("labelFields") ?? "";
    const labelFields = labelFieldsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const rawTargetUserId = url.searchParams.get("targetUserId")?.trim();
    let effectiveUserId = session.user.id;
    if (rawTargetUserId && rawTargetUserId !== session.user.id) {
      const ok = await isUserInFamilyGroup(
        rawTargetUserId,
        session.user.familyGroupId
      );
      if (!ok) {
        return NextResponse.json(
          { error: "target_user_not_in_family" },
          { status: 403 }
        );
      }
      effectiveUserId = rawTargetUserId;
    }

    // All questions on the source folder — needed for shape + label ordering.
    const questions = await listQuestionsBySubcategory(subcategoryId);
    if (questions.length === 0) {
      return NextResponse.json({ entries: [] });
    }
    const questionIds = questions.map((q) => q.id);

    // Load every answer this user has on those questions.
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("question_responses")
      .select("question_id, instance_id, value")
      .eq("user_id", effectiveUserId)
      .in("question_id", questionIds);
    if (error) throw error;

    // Bucket by instance_id → { question_id → value }.
    const byInstance = new Map<string, Record<string, string>>();
    for (const row of (data ?? []) as {
      question_id: string;
      instance_id: string;
      value: string | null;
    }[]) {
      if (!row.value) continue;
      const inst = row.instance_id || "default";
      if (!byInstance.has(inst)) byInstance.set(inst, {});
      byInstance.get(inst)![row.question_id] = row.value;
    }

    // Build labels + include raw answers so callers can do their own
    // matching (e.g. auto-linking a Bank Statement to the Bank Account it
    // belongs to by comparing BSB + account number).
    const entries: {
      instance_id: string;
      label: string;
      answers: Record<string, string>;
    }[] = [];
    let idx = 1;
    const sortedIds = Array.from(byInstance.keys()).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
    // Format each label part per its question type so address JSON blobs,
    // dropdown values, dates etc. render as human-readable strings — not
    // {"address":"…","lat":…,"lon":…}.
    const questionById = new Map(questions.map((q) => [q.id, q]));
    for (const instId of sortedIds) {
      const answers = byInstance.get(instId) ?? {};
      const parts = labelFields
        .map((qid) => {
          const raw = (answers[qid] ?? "").trim();
          if (!raw) return "";
          return formatQuestionValue(questionById.get(qid), raw).trim();
        })
        .filter(Boolean);
      const label = parts.length > 0 ? parts.join(" — ") : `Entry ${idx}`;
      entries.push({ instance_id: instId, label, answers });
      idx += 1;
    }
    return NextResponse.json({ entries });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:linked-entries[subcategoryId].GET", e);
  }
}
