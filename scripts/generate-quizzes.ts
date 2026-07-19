/**
 * One-off script: read every course article, ask OpenAI to generate 3–5
 * multiple-choice questions grounded in the article body, insert into the
 * quizzes + quiz_questions tables in Supabase.
 *
 * Idempotent — skips articles that already have `--target` quizzes.
 * When an article already has some quizzes but fewer than the target,
 * generates additional variants that avoid repeating questions from the
 * existing quizzes.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/generate-quizzes.ts
 *
 * Flags:
 *   --target=<n>    ensure each article has this many quizzes (default 1)
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
const TARGET =
  Number(process.argv.find((a) => a.startsWith("--target="))?.split("=")[1]) ||
  1;

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

async function generateForArticle(
  a: (typeof COURSE_ARTICLES)[number],
  round: number,
  alreadyAsked: string[]
): Promise<QuizGen> {
  const avoidance =
    alreadyAsked.length > 0
      ? `\n\nAvoid these question prompts (or close paraphrases) — they were used in earlier quizzes on this article; ask about different facts:\n${alreadyAsked
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n")}`
      : "";
  const roundHint =
    round > 1
      ? `\n\nThis is quiz round ${round} for the same article — cover different facts from earlier rounds.`
      : "";
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
            text: `Article title: ${a.title}\nCategory: ${a.categoryId}${roundHint}\n\n---\n${a.body}\n---${avoidance}`,
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

  // Load every existing quiz and its questions so we can (a) count how many
  // quizzes each article already has and (b) feed the used-question prompts
  // into the generator for later rounds.
  const { data: existingQuizzes, error: existErr } = await supabase
    .from("quizzes")
    .select("id, source_article_id");
  if (existErr) {
    console.error("Failed to read existing quizzes:", existErr.message);
    process.exit(1);
  }
  const quizIdsBySource = new Map<string, string[]>();
  for (const row of (existingQuizzes ?? []) as {
    id: string;
    source_article_id: string | null;
  }[]) {
    if (!row.source_article_id) continue;
    const list = quizIdsBySource.get(row.source_article_id) ?? [];
    list.push(row.id);
    quizIdsBySource.set(row.source_article_id, list);
  }

  const allQuizIds = Array.from(quizIdsBySource.values()).flat();
  const promptsByQuizId = new Map<string, string[]>();
  if (allQuizIds.length > 0) {
    const { data: qRows, error: qErr } = await supabase
      .from("quiz_questions")
      .select("quiz_id, prompt")
      .in("quiz_id", allQuizIds);
    if (qErr) throw qErr;
    for (const row of (qRows ?? []) as { quiz_id: string; prompt: string }[]) {
      const list = promptsByQuizId.get(row.quiz_id) ?? [];
      list.push(row.prompt);
      promptsByQuizId.set(row.quiz_id, list);
    }
  }

  const targets = COURSE_ARTICLES.filter((a) => (ONLY ? a.id === ONLY : true));
  console.log(
    `Ensuring ${TARGET} quiz(zes) per article across ${targets.length} article(s) (dry=${DRY})`
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of targets) {
    if (LIMIT && ok >= LIMIT) {
      console.log(`Hit --limit=${LIMIT}, stopping.`);
      break;
    }
    const existingIds = quizIdsBySource.get(article.id) ?? [];
    const need = TARGET - existingIds.length;
    if (need <= 0) {
      skipped++;
      continue;
    }
    // Prompts from all existing quizzes on this article, to avoid repeats.
    const alreadyAsked = existingIds
      .flatMap((qid) => promptsByQuizId.get(qid) ?? [])
      .slice(0, 40);

    for (let n = 0; n < need; n++) {
      const round = existingIds.length + n + 1;
      try {
        process.stdout.write(`  ${article.id} round ${round} … `);
        const gen = await generateForArticle(article, round, alreadyAsked);
        process.stdout.write(`${gen.questions.length}q  `);

        if (DRY) {
          console.log("\nDRY sample:");
          console.log(
            JSON.stringify({ article: article.id, round, quiz: gen }, null, 2)
          );
          return;
        }

        const title =
          round === 1 ? article.title : `${article.title} — Round ${round}`;
        const { data: quiz, error: quizErr } = await supabase
          .from("quizzes")
          .insert({
            category_id: article.categoryId,
            subcategory_id: article.subcategoryId ?? null,
            title,
            description: gen.description,
            source_article_id: article.id,
          })
          .select("id")
          .single();
        if (quizErr || !quiz)
          throw quizErr ?? new Error("quiz insert failed");
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

        // Track newly-added prompts so later rounds in this loop also avoid them.
        alreadyAsked.push(...gen.questions.map((q) => q.prompt));

        console.log("ok");
        ok++;
      } catch (e) {
        failed++;
        const msg = (e as Error).message;
        console.log(`FAILED: ${msg}`);
        if (ok === 0 && (msg.includes("schema") || msg.includes("Invalid"))) {
          console.log(
            "\nAborting — the schema or config is wrong. Fix and re-run."
          );
          return;
        }
      }
    }
  }

  console.log(
    `\nDone. inserted=${ok}  skipped=${skipped}  failed=${failed}  targets=${targets.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
