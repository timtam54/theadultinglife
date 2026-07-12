/**
 * One-off script: read every course article, ask OpenAI to generate 3–5
 * multiple-choice questions grounded in the article body, insert into the
 * quizzes + quiz_questions tables in Supabase.
 *
 * Idempotent — skips articles that already have a quiz (matched by
 * source_article_id).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/generate-quizzes.ts
 *
 * Flags:
 *   --dry           preview the first article's output without writing to the DB
 *   --only=<id>     restrict to a single article id (e.g. --only=course-personal-passport-travel)
 *   --limit=<n>     stop after n successful generations
 *
 * Requires env: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Note: this file uses relative imports (not the `@/` alias) so it can run
 * under bare tsx without a tsconfig-paths loader.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { COURSE_ARTICLES } from "../content/course-articles";

const DRY = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]
);

// Note: OpenAI structured-output mode rejects Zod .optional() — every
// property must appear in `required`. Use a nullable field instead; the
// insert path already coalesces null → null.
const questionSchema = z.object({
  prompt: z.string().min(10).max(500),
  options: z
    .array(z.object({ id: z.string().length(1), text: z.string().min(1).max(200) }))
    .length(4),
  correctOptionId: z.string().length(1),
  explanation: z.string().max(500).nullable(),
});

const quizSchema = z.object({
  description: z.string().min(10).max(200),
  questions: z.array(questionSchema).min(3).max(5),
});

type QuizGen = z.infer<typeof quizSchema>;

const SYSTEM = `You write plain-English multiple-choice questions for a life-admin app aimed at Australian adults.

Rules:
- Return 3–5 questions per article.
- Each question must be answerable from the article body — do not invent facts.
- 4 options each, labelled a/b/c/d.
- Exactly one correct answer (correctOptionId matches one of the option ids).
- Prompts are practical and specific — no "which of these is true?" catch-alls.
- Distractors must be plausible, not silly.
- Use Australian spelling (organise, licence, colour).
- Include a short explanation (< 200 chars) that cites the fact from the article.
- Description is one sentence describing the quiz theme.`;

async function generateForArticle(a: (typeof COURSE_ARTICLES)[number]): Promise<QuizGen> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: quizSchema,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Article title: ${a.title}\nCategory: ${a.categoryId}\n\n---\n${a.body}\n---`,
          },
        ],
      },
    ],
  });
  return object;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
    );
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in env.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingRows, error: existErr } = await supabase
    .from("quizzes")
    .select("source_article_id");
  if (existErr) {
    console.error("Failed to read existing quizzes:", existErr.message);
    process.exit(1);
  }
  const existing = new Set(
    (existingRows as { source_article_id: string | null }[])
      .map((r) => r.source_article_id)
      .filter((x): x is string => Boolean(x))
  );

  const targets = COURSE_ARTICLES.filter((a) => (ONLY ? a.id === ONLY : true));
  console.log(
    `Generating quizzes for ${targets.length} articles (dry=${DRY}, ${existing.size} already present)`
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of targets) {
    if (LIMIT && ok >= LIMIT) {
      console.log(`Hit --limit=${LIMIT}, stopping.`);
      break;
    }
    if (existing.has(article.id)) {
      skipped++;
      continue;
    }
    try {
      process.stdout.write(`  ${article.id} … `);
      const gen = await generateForArticle(article);
      process.stdout.write(`${gen.questions.length}q  `);

      if (DRY) {
        console.log("\nDRY sample:");
        console.log(JSON.stringify({ article: article.id, quiz: gen }, null, 2));
        return;
      }

      const { data: quiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          category_id: article.categoryId,
          subcategory_id: article.subcategoryId ?? null,
          title: article.title,
          description: gen.description,
          source_article_id: article.id,
        })
        .select("id")
        .single();
      if (quizErr || !quiz) throw quizErr ?? new Error("quiz insert failed");
      const quizId = (quiz as { id: string }).id;

      const rows = gen.questions.map((q, i) => ({
        quiz_id: quizId,
        prompt: q.prompt,
        options: q.options,
        correct_option_id: q.correctOptionId,
        explanation: q.explanation,
        sort_order: i,
      }));
      const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
      if (qErr) throw qErr;

      console.log("ok");
      ok++;
    } catch (e) {
      failed++;
      const msg = (e as Error).message;
      console.log(`FAILED: ${msg}`);
      // If the very first attempt fails on a schema/config error, stop rather
      // than burning through all 58 articles with the same broken schema.
      if (ok === 0 && (msg.includes("schema") || msg.includes("Invalid"))) {
        console.log("\nAborting — the schema or config is wrong. Fix and re-run.");
        break;
      }
    }
  }

  console.log(
    `\nDone. inserted=${ok}  skipped=${skipped}  failed=${failed}  total=${targets.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
