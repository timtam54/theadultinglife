import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listUserRecords } from "@/lib/services/records";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { buildWorkbook, xlsxResponse } from "@/lib/services/excel-export";
import type { PageQuestionRow, UserRow } from "@/lib/db/types";

function displayName(u: UserRow): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Family member"
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Ctx = { params: Promise<{ subcategory: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { subcategory } = await ctx.params;
  const session = await requireSession();
  const folder = await getUserSubcategory(session.user.id, subcategory);
  if (!folder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  // Does this folder have any page_questions? If so, form-mode export.
  const { data: qData, error: qErr } = await supabase
    .from("page_questions")
    .select("*")
    .eq("subcategory_id", subcategory)
    .order("row_order", { ascending: true })
    .order("col_start", { ascending: true });
  if (qErr) throw qErr;
  const questions = (qData as PageQuestionRow[]) ?? [];

  const heading = [
    `${folder.name} — The Adulting Life`,
    `Exported ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`,
  ];

  if (questions.length > 0) {
    // FORM MODE — rows keyed by (user_id, instance_id).
    const users =
      folder.scope === "per_user" || folder.scope === "per_user_list"
        ? await listUsersInFamilyGroup(session.user.familyGroupId)
        : [
            {
              id: session.user.id,
              first_name: session.user.firstName,
              last_name: session.user.lastName,
              name: session.user.name,
              email: session.user.email,
            } as UserRow,
          ];
    const userIds = users.map((u) => u.id);
    const nameById = new Map(users.map((u) => [u.id, displayName(u)]));

    const { data: rData, error: rErr } = await supabase
      .from("question_responses")
      .select("user_id, question_id, instance_id, value")
      .in("user_id", userIds)
      .in("question_id", questions.map((q) => q.id));
    if (rErr) throw rErr;
    const responses = (rData ?? []) as {
      user_id: string;
      question_id: string;
      instance_id: string;
      value: string | null;
    }[];

    // Group into rows: one row per (user_id + instance_id).
    const bucket = new Map<string, Record<string, string>>();
    for (const r of responses) {
      if (!r.value) continue;
      const key = `${r.user_id}|${r.instance_id}`;
      const row = bucket.get(key) ?? {
        __user: nameById.get(r.user_id) ?? "",
      };
      row[r.question_id] = r.value;
      bucket.set(key, row);
    }

    const columns = [
      { header: "Family member", key: "__user", width: 22 },
      ...questions.map((q) => ({
        header: q.label,
        key: q.id,
        width: 24,
      })),
    ];
    const rows = Array.from(bucket.values()).map((r) => {
      const out: Record<string, string> = {};
      for (const c of columns) out[c.key] = r[c.key] ?? "";
      return out;
    });

    const body = await buildWorkbook([
      { name: folder.name.slice(0, 31) || "Folder", columns, rows, heading },
    ]);
    return xlsxResponse(body, `${folder.name || "folder"}.xlsx`);
  }

  // LIST MODE — one row per record.
  const records = await listUserRecords(session.user.id, {
    categoryId: folder.category_id,
    subcategoryId: folder.id,
  });
  const columns = [
    { header: "Title", key: "title", width: 32 },
    { header: "Expiry", key: "expiry", width: 14 },
    { header: "Notes", key: "notes", width: 40 },
    { header: "Tags", key: "tags", width: 20 },
    { header: "Created", key: "created", width: 14 },
  ];
  const rows = records.map((r) => ({
    title: r.title ?? "",
    expiry: fmtDate(r.expiry_date),
    notes: r.notes ?? "",
    tags: (r.tags ?? []).join(", "),
    created: fmtDate(r.created_at),
  }));
  const body = await buildWorkbook([
    { name: folder.name.slice(0, 31) || "Folder", columns, rows, heading },
  ]);
  return xlsxResponse(body, `${folder.name || "folder"}.xlsx`);
}
