import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { createServiceClient } from "@/lib/supabase/server";

// Copies of Scripts ↔ Medication List.
//
// GET  ?targetUserId=…  → which scripts are already on the Medication List
//      (linked, or a medication with the same name), and for each linked
//      medication its script's scan.
// POST { scriptInstanceId, targetUserId? } → put a script on the Medication
//      List: links it to a medication of the same name if there is one,
//      otherwise adds a new medication filled in from the script.

const SCRIPT_TO_MEDICATION: Record<string, string> = {
  "scripts.medication": "medication.name",
  "scripts.dosage": "medication.dosage",
  "scripts.frequency": "medication.frequency",
  "scripts.prescribing_doctor": "medication.prescribed_by",
  "scripts.date_started": "medication.start_date",
  "scripts.date_completed": "medication.end_date",
  "scripts.pharmacy": "medication.pharmacy",
  "scripts.notes": "medication.notes",
};
const LINK_Q = "medication.script";

type Entries = Map<string, Record<string, string>>;

async function ownerFor(sessionUserId: string, familyGroupId: string, requested: unknown): Promise<string | null> {
  if (typeof requested !== "string" || !requested || requested === sessionUserId) return sessionUserId;
  return (await isUserInFamilyGroup(requested, familyGroupId)) ? requested : null;
}

/** instance id → { question id → value } for one folder's questions. */
async function entries(userId: string, prefix: "scripts." | "medication."): Promise<Entries> {
  const { data } = await createServiceClient()
    .from("question_responses")
    .select("question_id, instance_id, value")
    .eq("user_id", userId)
    .like("question_id", `${prefix}%`);
  const out: Entries = new Map();
  for (const r of (data ?? []) as { question_id: string; instance_id: string; value: string | null }[]) {
    if (!r.value || r.instance_id === "default") continue;
    const e = out.get(r.instance_id) ?? {};
    e[r.question_id] = r.value;
    out.set(r.instance_id, e);
  }
  return out;
}

const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The medication a script is on: linked to it, else one with the same name. */
function medicationFor(scriptId: string, script: Record<string, string>, meds: Entries): string | null {
  for (const [id, m] of meds) if (m[LINK_Q] === scriptId) return id;
  const name = norm(script["scripts.medication"]);
  if (!name) return null;
  for (const [id, m] of meds) if (!m[LINK_Q] && norm(m["medication.name"]) === name) return id;
  return null;
}

function fail(e: unknown, where: string) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  console.error(`[api/scripts/medication-link] ${where} failed:`, e);
  return NextResponse.json({ error: "failed", message: "Something went wrong. Please try again." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const owner = await ownerFor(session.user.id, session.user.familyGroupId, request.nextUrl.searchParams.get("targetUserId"));
    if (!owner) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const [scripts, meds] = await Promise.all([entries(owner, "scripts."), entries(owner, "medication.")]);

    const onList: Record<string, string> = {};
    for (const [id, s] of scripts) {
      const med = medicationFor(id, s, meds);
      if (med) onList[id] = med;
    }

    // Each linked medication → its script's scan (if the script has one).
    const fileIds = [...meds.values()]
      .map((m) => scripts.get(m[LINK_Q] ?? "")?.["scripts.document"])
      .filter((v): v is string => Boolean(v));
    const { data: files } = fileIds.length
      ? await createServiceClient().from("file_objects").select("id, filename, mime_type").in("id", fileIds)
      : { data: [] };
    const fileById = new Map(((files ?? []) as { id: string; filename: string; mime_type: string | null }[]).map((f) => [f.id, f]));
    const scriptFor: Record<string, { scriptInstanceId: string; label: string; file: { id: string; filename: string; mimeType: string | null } | null }> = {};
    for (const [medId, m] of meds) {
      const sid = m[LINK_Q];
      const s = sid ? scripts.get(sid) : undefined;
      if (!sid || !s) continue;
      const f = s["scripts.document"] ? fileById.get(s["scripts.document"]) : undefined;
      scriptFor[medId] = {
        scriptInstanceId: sid,
        label: s["scripts.medication"] ?? "Script",
        file: f ? { id: f.id, filename: f.filename, mimeType: f.mime_type } : null,
      };
    }
    return NextResponse.json({ onList, scriptFor });
  } catch (e) {
    return fail(e, "GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as { scriptInstanceId?: unknown; targetUserId?: unknown };
    const owner = await ownerFor(session.user.id, session.user.familyGroupId, body.targetUserId);
    if (!owner) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const scriptId = typeof body.scriptInstanceId === "string" ? body.scriptInstanceId : "";

    const [scripts, meds] = await Promise.all([entries(owner, "scripts."), entries(owner, "medication.")]);
    const script = scripts.get(scriptId);
    if (!script || !script["scripts.medication"]) {
      return NextResponse.json(
        { error: "no_script", message: "Save the script with the medication's name first." },
        { status: 400 }
      );
    }

    const sb = createServiceClient();
    const existing = medicationFor(scriptId, script, meds);
    if (existing) {
      // Already on the list: make sure it points at this script.
      if (meds.get(existing)?.[LINK_Q] !== scriptId) {
        await sb
          .from("question_responses")
          .upsert({ user_id: owner, question_id: LINK_Q, instance_id: existing, value: scriptId }, { onConflict: "user_id,question_id,instance_id" });
      }
      return NextResponse.json({ ok: true, status: "linked", medicationInstanceId: existing });
    }

    const next = String(Math.max(0, ...[...meds.keys()].map((k) => Number(k)).filter(Number.isFinite)) + 1);
    const rows = Object.entries(SCRIPT_TO_MEDICATION)
      .filter(([from]) => script[from])
      .map(([from, to]) => ({ user_id: owner, question_id: to, instance_id: next, value: script[from] }));
    rows.push({ user_id: owner, question_id: LINK_Q, instance_id: next, value: scriptId });
    const { error } = await sb.from("question_responses").insert(rows);
    if (error) throw error;
    return NextResponse.json({ ok: true, status: "added", medicationInstanceId: next });
  } catch (e) {
    return fail(e, "POST");
  }
}
