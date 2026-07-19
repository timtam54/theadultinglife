/*
 * Generate on-brand thumbnail PNGs for Life Admin.
 *
 * Layout:
 *   public/thumbnails/categories/<id>.png       — 5 category fallbacks
 *   public/thumbnails/subcategories/<id>.png    — one per subcategory
 *
 * Usage:
 *   npx tsx scripts/generate-thumbnails.ts categories                  # all 5 categories
 *   npx tsx scripts/generate-thumbnails.ts subcategories               # all subcategories
 *   npx tsx scripts/generate-thumbnails.ts subcategories personal.abn  # specific ids
 *   npx tsx scripts/generate-thumbnails.ts subcategories --missing     # only ones without a file yet
 *
 * Requires OPENAI_API_KEY in env / .env.local.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { SUBCATEGORY_PROMPTS } from "./thumbnail-prompts";

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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY missing. Set it in .env.local.");
  process.exit(1);
}

const BRAND = [
  "warm cream background (#FBF2E4)",
  "deep plum accent (#3B1F2B)",
  "soft violet, amber, sky, emerald secondary tones",
  "flat editorial illustration, rounded organic shapes, no gradients, no text, no letters, no numbers",
  "generous whitespace, soft shadows, calm and reassuring feel",
  "square 1:1 composition, subject centered, safe padding on all sides",
] as const;

interface Spec {
  id: string;
  subject: string;
}

const CATEGORY_SPECS: Spec[] = [
  { id: "personal",   subject: "a stack of personal documents — a passport, an ID card, and a birth certificate — arranged tidily" },
  { id: "health",     subject: "a stethoscope, a Medicare-style health card and a small pill bottle arranged as a calm health kit" },
  { id: "education",  subject: "a graduation cap resting on a stack of books beside a rolled diploma tied with a ribbon" },
  { id: "employment", subject: "a leather briefcase, a folded resume and a lanyard id badge arranged for a first day at work" },
  { id: "admin",      subject: "an open manila folder with neatly tabbed papers, a small calculator and a fountain pen" },
];

function buildPrompt(spec: Spec): string {
  return [
    spec.subject + ".",
    "Illustration style: " + BRAND.join("; ") + ".",
    "No people, no faces, no logos, no brand marks.",
    "The subject should feel friendly and grown-up — like a beloved household object, not clinical or corporate.",
  ].join(" ");
}

async function generateOne(spec: Spec, outDir: string) {
  const prompt = buildPrompt(spec);
  console.log(`\n→ ${spec.id}`);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data: { b64_json?: string; url?: string }[];
  };
  const first = json.data?.[0];
  if (!first) throw new Error("no image returned");

  let bytes: Buffer;
  if (first.b64_json) {
    bytes = Buffer.from(first.b64_json, "base64");
  } else if (first.url) {
    const dl = await fetch(first.url);
    bytes = Buffer.from(await dl.arrayBuffer());
  } else {
    throw new Error("no b64_json or url in image response");
  }

  const outPath = resolve(
    process.cwd(),
    `${outDir}/${spec.id}.png`
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bytes);
  console.log(`  ✓ ${outPath} (${(bytes.length / 1024).toFixed(0)} KB)`);
}

async function runBatch(specs: Spec[], outDir: string, opts: { onlyMissing?: boolean }) {
  const filtered = opts.onlyMissing
    ? specs.filter(
        (s) => !existsSync(resolve(process.cwd(), `${outDir}/${s.id}.png`))
      )
    : specs;

  if (filtered.length === 0) {
    console.log("Nothing to generate.");
    return;
  }
  console.log(`Generating ${filtered.length} image(s) into ${outDir}/`);
  for (const spec of filtered) {
    try {
      await generateOne(spec, outDir);
    } catch (e) {
      console.error(`  ✗ ${spec.id} failed:`, (e as Error).message);
    }
  }
  console.log("\nDone.");
}

async function main() {
  const [kind, ...rest] = process.argv.slice(2);
  const onlyMissing = rest.includes("--missing");
  const explicitIds = rest.filter((r) => !r.startsWith("--"));

  if (kind === "categories") {
    const specs = explicitIds.length
      ? CATEGORY_SPECS.filter((s) => explicitIds.includes(s.id))
      : CATEGORY_SPECS;
    await runBatch(specs, "public/thumbnails/categories", { onlyMissing });
    return;
  }

  if (kind === "subcategories") {
    const specs = explicitIds.length
      ? SUBCATEGORY_PROMPTS.filter((s) => explicitIds.includes(s.id))
      : [...SUBCATEGORY_PROMPTS];
    await runBatch(
      specs.map((s) => ({ id: s.id, subject: s.subject })),
      "public/thumbnails/subcategories",
      { onlyMissing }
    );
    return;
  }

  console.error(
    "Usage: npx tsx scripts/generate-thumbnails.ts categories|subcategories [ids…] [--missing]"
  );
  process.exit(1);
}

main();
