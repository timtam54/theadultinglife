/*
 * Print every catalogue subcategory whose /admin/folder-forms entry either has
 * no fields at all, or only the auto-generated "Placeholder field" row.
 *
 * Usage: npx tsx scripts/list-incomplete-folder-forms.ts
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
  console.error("Missing Supabase env vars");
  process.exit(1);
}

interface SubRow {
  id: string;
  category_id: string;
  name: string;
}
interface QRow {
  subcategory_id: string | null;
  label: string | null;
}

async function main() {
  const supabase = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });

  const subs = await supabase
    .from("subcategories")
    .select("id, category_id, name")
    .is("user_id", null)
    .is("template_group", null)
    .order("category_id")
    .order("sort_order");
  if (subs.error) throw subs.error;
  const allSubs = (subs.data ?? []) as SubRow[];

  // Page through page_questions — Supabase caps default select at 1000 rows.
  const rows: QRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const qs = await supabase
      .from("page_questions")
      .select("subcategory_id, label")
      .range(from, from + pageSize - 1);
    if (qs.error) throw qs.error;
    const batch = (qs.data ?? []) as QRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const counts = new Map<string, { total: number; placeholders: number }>();
  for (const r of rows) {
    if (!r.subcategory_id) continue;
    const entry = counts.get(r.subcategory_id) ?? {
      total: 0,
      placeholders: 0,
    };
    entry.total += 1;
    if (r.label === "Placeholder field") entry.placeholders += 1;
    counts.set(r.subcategory_id, entry);
  }

  const incomplete = allSubs.filter((s) => {
    const c = counts.get(s.id);
    if (!c) return true;
    return c.total === c.placeholders;
  });

  console.log(`Loaded ${rows.length} page_questions rows total.\n`);

  if (incomplete.length === 0) {
    console.log("Every folder has customised fields.");
    return;
  }

  console.log(
    `${incomplete.length} folder${incomplete.length === 1 ? "" : "s"} without customised fields:\n`
  );
  let lastCat = "";
  for (const s of incomplete) {
    if (s.category_id !== lastCat) {
      console.log(`\n[${s.category_id}]`);
      lastCat = s.category_id;
    }
    const c = counts.get(s.id);
    const state = !c ? "no rows" : `${c.placeholders} placeholder`;
    console.log(`  ${s.id.padEnd(48)}  ${s.name.padEnd(36)}  (${state})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
