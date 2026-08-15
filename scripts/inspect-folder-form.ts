/*
 * Inspect the page_questions rows for one subcategory.
 * Usage: npx tsx scripts/inspect-folder-form.ts personal.birth_certificates
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
    process.env[line.slice(0, idx).trim()] ??= line.slice(idx + 1).trim();
  }
}
loadEnv();

const id = process.argv[2];
if (!id) {
  console.error("Usage: npx tsx scripts/inspect-folder-form.ts <subcategory_id>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const r = await supabase
    .from("page_questions")
    .select("id, page_group, label, question_type, row_order")
    .eq("subcategory_id", id)
    .order("row_order");
  if (r.error) throw r.error;
  console.log(`${(r.data ?? []).length} row(s) for ${id}:`);
  for (const row of r.data ?? []) console.log(" ", row);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
