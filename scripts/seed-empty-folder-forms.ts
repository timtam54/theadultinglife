/*
 * Seed empty page_questions rows for every catalogue subcategory that
 * doesn't yet have a form configured. One placeholder row per folder — enough
 * to make the folder show up on /admin/folder-forms, where you can then edit
 * fields via the UI.
 *
 * Usage:
 *   npx tsx scripts/seed-empty-folder-forms.ts              # dry run: list what would be seeded
 *   npx tsx scripts/seed-empty-folder-forms.ts --apply      # actually insert rows
 *   npx tsx scripts/seed-empty-folder-forms.ts --apply --category personal
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const catIndex = process.argv.indexOf("--category");
const filterCategory = catIndex >= 0 ? process.argv[catIndex + 1] : null;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "form"
  );
}

interface SubRow {
  id: string;
  category_id: string;
  name: string;
  template_group: string | null;
  user_id: string | null;
}

async function main() {
  const supabase = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });

  // 1. Every catalogue subcategory (user_id is null, not a template group).
  let subQuery = supabase
    .from("subcategories")
    .select("id, category_id, name, template_group, user_id")
    .is("user_id", null)
    .is("template_group", null)
    .order("category_id")
    .order("sort_order");
  if (filterCategory) subQuery = subQuery.eq("category_id", filterCategory);
  const subs = await subQuery;
  if (subs.error) throw subs.error;
  const allSubs = (subs.data ?? []) as SubRow[];

  // 2. Every subcategory that already has any page_questions row.
  const questions = await supabase
    .from("page_questions")
    .select("subcategory_id");
  if (questions.error) throw questions.error;
  const configured = new Set(
    (questions.data ?? [])
      .map((r) => (r as { subcategory_id: string | null }).subcategory_id)
      .filter(Boolean) as string[]
  );

  const missing = allSubs.filter((s) => !configured.has(s.id));
  if (missing.length === 0) {
    console.log("Nothing to do — every folder already has a form.");
    return;
  }

  console.log(
    `${missing.length} folder${missing.length === 1 ? "" : "s"} without a form:`
  );
  for (const s of missing) {
    console.log(`  ${s.category_id}  ${s.id.padEnd(48)}  ${s.name}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to insert placeholder rows.");
    return;
  }

  const rows = missing.map((s) => {
    // Prefix page_group with the category so `admin.other` and `personal.other`
    // don't collide on the row `id` (which is `{page_group}.placeholder`).
    const pageGroup = `${s.category_id}_${slugify(s.name)}`;
    return {
      id: `${pageGroup}.placeholder`,
      page_group: pageGroup,
      subcategory_id: s.id,
      label: "Placeholder field",
      hint: "Replace this with real fields via /admin/folder-forms.",
      question_type: "text",
      options: null,
      col_start: 1,
      col_span: 12,
      row_order: 0,
      required: false,
      placeholder: null,
    };
  });

  const ins = await supabase.from("page_questions").insert(rows);
  if (ins.error) throw ins.error;

  console.log(
    `\nInserted ${rows.length} placeholder row${rows.length === 1 ? "" : "s"}.` +
      ` Visit /admin/folder-forms to edit each form.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
