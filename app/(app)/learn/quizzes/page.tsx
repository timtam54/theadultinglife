import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import type { QuizRow } from "@/lib/db/types";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { listProgress } from "@/lib/db/progress";
import { QUIZ_PASS_THRESHOLD } from "@/lib/services/learnEngagement";

export const metadata: Metadata = {
  title: "Learn · Quizzes",
  description: "Quick quizzes across every life-admin area.",
};

const CATEGORY_TONE: Record<CategoryId, string> = {
  personal: "bg-violet-100 text-violet-800",
  health: "bg-amber-100 text-amber-800",
  education: "bg-sky-100 text-sky-800",
  employment: "bg-rose-100 text-rose-800",
  admin: "bg-emerald-100 text-emerald-800",
};

export default async function LearnQuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const mode: "library" | "attempted" | "passed" =
    filter === "passed"
      ? "passed"
      : filter === "all"
        ? "attempted"
        : "library";

  const perCategory = await Promise.all(
    CATEGORY_IDS.map((id) =>
      listQuizzesForCategory(id).then((qs) => ({ id, quizzes: qs }))
    )
  );
  const totalQuizzes = perCategory.reduce((a, c) => a + c.quizzes.length, 0);

  if (mode === "library") {
    return (
      <div>
        <Breadcrumb />
        <Header
          title="Quizzes"
          subtitle={
            totalQuizzes === 0
              ? "No quizzes yet."
              : `${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"} across ${
                  perCategory.filter((c) => c.quizzes.length > 0).length
                } areas.`
          }
        />
        <FilterBar mode={mode} />

        {perCategory
          .filter((c) => c.quizzes.length > 0)
          .map((c) => (
            <section key={c.id} className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-xl text-tal-plum">
                  {CATEGORY_LABELS[c.id]}
                </h2>
                <Link
                  href={`/learn/${c.id}?expand=quizzes`}
                  className="text-sm text-tal-plum-soft hover:text-tal-plum"
                >
                  View all →
                </Link>
              </div>
              <ul className="space-y-2">
                {c.quizzes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/learn/${c.id}/quiz/${q.id}`}
                      className="block rounded-xl border border-tal-line bg-white p-4 hover:shadow-sm"
                    >
                      <div className="font-medium">{q.title}</div>
                      {q.description ? (
                        <div className="text-sm text-tal-plum-soft">
                          {q.description}
                        </div>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {totalQuizzes === 0 && (
          <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
            <p className="text-tal-plum-soft">Quizzes are coming soon.</p>
          </div>
        )}
      </div>
    );
  }

  const session = await requireSession();
  const progressRows = await listProgress(session.user.id);

  const quizById = new Map<string, { quiz: QuizRow; category: CategoryId }>();
  for (const c of perCategory) {
    for (const q of c.quizzes) quizById.set(q.id, { quiz: q, category: c.id });
  }

  const attempts = progressRows
    .filter((p) => p.item_type === "quiz" && p.status === "completed")
    .map((p) => {
      const meta = p.meta as { score?: number; total?: number };
      const score = typeof meta?.score === "number" ? meta.score : 0;
      const total = typeof meta?.total === "number" ? meta.total : 0;
      const pct = total > 0 ? score / total : 0;
      return {
        quizId: p.item_id,
        score,
        total,
        pct,
        passed: total > 0 && pct >= QUIZ_PASS_THRESHOLD,
        completedAt: p.updated_at,
      };
    })
    .filter((a) => quizById.has(a.quizId))
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));

  const visible = mode === "passed" ? attempts.filter((a) => a.passed) : attempts;
  const dateFmt = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <Breadcrumb />
      <Header
        title={mode === "passed" ? "Quizzes you've passed" : "Quizzes you've taken"}
        subtitle={
          visible.length === 0
            ? mode === "passed"
              ? `No passes yet — you need at least ${Math.round(
                  QUIZ_PASS_THRESHOLD * 100
                )}% to pass.`
              : "You haven't taken any quizzes yet."
            : `${visible.length} quiz${visible.length === 1 ? "" : "zes"}${
                mode === "passed"
                  ? ` at ${Math.round(QUIZ_PASS_THRESHOLD * 100)}% or higher.`
                  : "."
              }`
        }
      />
      <FilterBar mode={mode} />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          {mode === "passed"
            ? "Retake a quiz and score higher to see it here."
            : "Head back to the library and give one a go."}
        </div>
      ) : (
        <section className="rounded-2xl border border-tal-line bg-white overflow-hidden">
          <ul className="divide-y divide-tal-line">
            {visible.map((a) => {
              const entry = quizById.get(a.quizId)!;
              return (
                <li key={a.quizId + a.completedAt}>
                  <Link
                    href={`/learn/${entry.category}/quiz/${entry.quiz.id}`}
                    className="group flex items-start gap-3 p-4 hover:bg-tal-cream-soft/40 transition"
                  >
                    <span
                      className={
                        "inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5 text-[11px] font-semibold " +
                        (a.passed
                          ? "bg-emerald-600 text-white"
                          : "bg-tal-cream-soft text-tal-plum-soft")
                      }
                      aria-hidden
                    >
                      {Math.round(a.pct * 100)}%
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-tal-plum leading-snug">
                        {entry.quiz.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                        <span
                          className={
                            "px-2 py-0.5 rounded-full font-medium uppercase tracking-widest " +
                            CATEGORY_TONE[entry.category]
                          }
                        >
                          {CATEGORY_LABELS[entry.category]}
                        </span>
                        <span className="text-tal-plum-soft">
                          {a.score}/{a.total} · {a.passed ? "Passed" : "Attempted"}
                        </span>
                        <span className="text-tal-plum-soft">
                          {dateFmt.format(new Date(a.completedAt))}
                        </span>
                      </div>
                    </div>
                    <span
                      aria-hidden
                      className="text-tal-plum-soft shrink-0 self-center transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Breadcrumb() {
  return (
    <Link href="/learn" className="text-sm text-tal-plum-soft hover:text-tal-plum">
      ← Learn
    </Link>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-2">{title}</h1>
      <p className="text-tal-plum-soft mb-6">{subtitle}</p>
    </>
  );
}

function FilterBar({ mode }: { mode: "library" | "attempted" | "passed" }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <FilterPill href="/learn/quizzes" active={mode === "library"}>
        Library
      </FilterPill>
      <FilterPill href="/learn/quizzes?filter=all" active={mode === "attempted"}>
        Taken
      </FilterPill>
      <FilterPill href="/learn/quizzes?filter=passed" active={mode === "passed"}>
        Passed
      </FilterPill>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center h-8 px-3 rounded-full text-xs font-medium border transition " +
        (active
          ? "bg-tal-plum text-white border-tal-plum"
          : "bg-white text-tal-plum-soft border-tal-line hover:border-tal-plum hover:text-tal-plum")
      }
    >
      {children}
    </Link>
  );
}
