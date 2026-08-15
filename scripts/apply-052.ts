/*
 * Apply supabase/migrations/052_missing_folder_forms.sql directly via the
 * service role key. Uses the `exec_sql` RPC if available; otherwise falls back
 * to executing each statement via the pg REST endpoint.
 *
 * Usage: npx tsx scripts/apply-052.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

console.log(`Supabase URL: ${url}`);

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/052_missing_folder_forms.sql"),
  "utf8"
);

async function main() {
  // Try the standard exec RPC. Some projects expose this, some don't.
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
