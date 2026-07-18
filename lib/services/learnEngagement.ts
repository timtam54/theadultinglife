import { createServiceClient } from "@/lib/supabase/server";
import { listProgress } from "@/lib/db/progress";
import { listQuizzesForCategory } from "@/lib/db/quizzes";
import { CATEGORY_IDS, type CategoryId } from "@/lib/db/types";
import { contentForCategory } from "@/content/learning";

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  tone: "violet" | "amber" | "sky" | "rose" | "emerald" | "plum";
  icon:
    | "sparkle"
    | "star"
    | "flame"
    | "trophy"
    | "target"
    | "check"
    | "book"
    | "medal"
    | "rocket";
}

// v1 catalogue: 16 badges (Donna's mock shows 2 examples; users see whichever they've earned).
export const BADGES: BadgeDef[] = [
  { id: "first-lesson", label: "First Lesson", description: "Read your first article", tone: "violet", icon: "sparkle" },
  { id: "getting-started", label: "Getting Started", description: "3 articles read", tone: "violet", icon: "rocket" },
  { id: "on-a-roll", label: "On A Roll", description: "10 articles read", tone: "sky", icon: "book" },
  { id: "halfway", label: "Halfway There", description: "50% of articles read", tone: "amber", icon: "target" },
  { id: "graduated", label: "Adulting Graduate", description: "100% of articles read", tone: "emerald", icon: "trophy" },
  { id: "quiz-taker", label: "Quiz Taker", description: "Took your first quiz", tone: "violet", icon: "check" },
  { id: "quiz-ace", label: "Quiz Ace", description: "Passed 5 quizzes", tone: "amber", icon: "medal" },
  { id: "quiz-master", label: "Quiz Master", description: "Passed every quiz", tone: "emerald", icon: "trophy" },
  { id: "streak-3", label: "3-Day Streak", description: "3 days of learning in a row", tone: "amber", icon: "flame" },
  { id: "streak-7", label: "7-Day Streak", description: "1 week streak", tone: "amber", icon: "flame" },
  { id: "streak-14", label: "Fortnight Focus", description: "2 week streak", tone: "rose", icon: "flame" },
  { id: "streak-30", label: "Monthly Habit", description: "30 day streak", tone: "plum", icon: "flame" },
  { id: "cat-personal", label: "Personal Pro", description: "All Personal articles read", tone: "violet", icon: "star" },
  { id: "cat-health", label: "Health Pro", description: "All Health articles read", tone: "amber", icon: "star" },
  { id: "cat-education", label: "Education Pro", description: "All Education articles read", tone: "sky", icon: "star" },
  { id: "cat-employment", label: "Employment Pro", description: "All Employment articles read", tone: "rose", icon: "star" },
  { id: "cat-admin", label: "Admin Pro", description: "All Admin articles read", tone: "emerald", icon: "star" },
];

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  daysActiveThisMonth: number;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((da.getTime() - db.getTime()) / 86_400_000);
}

export async function recordLearnActivity(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const today = toDateKey(new Date());
  // upsert increments count if the row exists; SQL fallback via manual read-then-write.
  const { data: existing } = await supabase
    .from("learn_activity_days")
    .select("activity_count")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("learn_activity_days")
      .update({ activity_count: (existing.activity_count ?? 0) + 1 })
      .eq("user_id", userId)
      .eq("activity_date", today);
  } else {
    await supabase
      .from("learn_activity_days")
      .insert({ user_id: userId, activity_date: today, activity_count: 1 });
  }
  await recomputeBadges(userId);
}

async function loadActivityDates(userId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("learn_activity_days")
    .select("activity_date")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(400);
  return ((data as { activity_date: string }[] | null) ?? []).map(
    (r) => r.activity_date
  );
}

export async function loadStreakSummary(
  userId: string
): Promise<StreakSummary> {
  const dates = await loadActivityDates(userId);
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      daysActiveThisMonth: 0,
    };
  }
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86_400_000));

  // dates are DESC. current streak = consecutive back from today (or yesterday if today missing).
  let current = 0;
  let cursor = dates[0] === today ? today : dates[0] === yesterday ? yesterday : null;
  if (cursor) {
    for (const d of dates) {
      if (diffDays(cursor, d) === 0) {
        current += 1;
        cursor = toDateKey(new Date(new Date(cursor + "T00:00:00Z").getTime() - 86_400_000));
      } else if (diffDays(cursor, d) > 0) {
        break;
      }
    }
  }

  // longest streak.
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  const sortedAsc = [...dates].sort((a, b) => (a < b ? -1 : 1));
  for (const d of sortedAsc) {
    if (prev && diffDays(d, prev) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const daysActiveThisMonth = dates.filter((d) => d.startsWith(monthKey)).length;

  return {
    currentStreak: current,
    longestStreak: longest,
    lastActivityDate: dates[0] ?? null,
    daysActiveThisMonth,
  };
}

async function grantBadge(userId: string, badgeId: string): Promise<void> {
  if (!BADGE_BY_ID.has(badgeId)) return;
  const supabase = createServiceClient();
  await supabase
    .from("user_badges")
    .upsert(
      { user_id: userId, badge_id: badgeId },
      { onConflict: "user_id,badge_id", ignoreDuplicates: true }
    );
}

async function recomputeBadges(userId: string): Promise<void> {
  const [streak, progressRows, quizzesByCat] = await Promise.all([
    loadStreakSummary(userId),
    listProgress(userId),
    Promise.all(CATEGORY_IDS.map((c) => listQuizzesForCategory(c))),
  ]);

  const readIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const passedQuizIds = new Set(
    progressRows
      .filter((p) => p.item_type === "quiz" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const anyQuiz = progressRows.some((p) => p.item_type === "quiz");
  const readCount = readIds.size;

  const totalArticles = CATEGORY_IDS.reduce(
    (a, c) => a + contentForCategory(c).length,
    0
  );
  const totalQuizzes = quizzesByCat.reduce((a, qs) => a + qs.length, 0);
  const passedQuizCount = passedQuizIds.size;

  const grants: string[] = [];
  if (readCount >= 1) grants.push("first-lesson");
  if (readCount >= 3) grants.push("getting-started");
  if (readCount >= 10) grants.push("on-a-roll");
  if (totalArticles > 0 && readCount / totalArticles >= 0.5) grants.push("halfway");
  if (totalArticles > 0 && readCount >= totalArticles) grants.push("graduated");
  if (anyQuiz) grants.push("quiz-taker");
  if (passedQuizCount >= 5) grants.push("quiz-ace");
  if (totalQuizzes > 0 && passedQuizCount >= totalQuizzes) grants.push("quiz-master");
  if (streak.longestStreak >= 3) grants.push("streak-3");
  if (streak.longestStreak >= 7) grants.push("streak-7");
  if (streak.longestStreak >= 14) grants.push("streak-14");
  if (streak.longestStreak >= 30) grants.push("streak-30");

  for (let i = 0; i < CATEGORY_IDS.length; i++) {
    const cat = CATEGORY_IDS[i];
    const items = contentForCategory(cat);
    if (items.length === 0) continue;
    const done = items.every((it) => readIds.has(it.id));
    if (done) grants.push(`cat-${cat}`);
  }

  await Promise.all(grants.map((id) => grantBadge(userId, id)));
}

export async function listUserBadges(userId: string): Promise<
  {
    id: string;
    badge: BadgeDef;
    awardedAt: string;
  }[]
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_badges")
    .select("badge_id, awarded_at")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });
  const rows = (data as { badge_id: string; awarded_at: string }[] | null) ?? [];
  return rows
    .map((r) => {
      const badge = BADGE_BY_ID.get(r.badge_id);
      if (!badge) return null;
      return { id: r.badge_id, badge, awardedAt: r.awarded_at };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export interface CategoryLearnPathSummary {
  id: CategoryId;
  totalArticles: number;
  articlesRead: number;
  totalQuizzes: number;
  quizzesPassed: number;
  pct: number;
}

export async function loadLearnPathSummaries(
  userId: string
): Promise<CategoryLearnPathSummary[]> {
  const [progressRows, quizzesByCat] = await Promise.all([
    listProgress(userId),
    Promise.all(CATEGORY_IDS.map((c) => listQuizzesForCategory(c))),
  ]);
  const readIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const passedQuizIds = new Set(
    progressRows
      .filter((p) => p.item_type === "quiz" && p.status === "completed")
      .map((p) => p.item_id)
  );
  return CATEGORY_IDS.map((id, i) => {
    const articles = contentForCategory(id);
    const quizzes = quizzesByCat[i];
    const articlesRead = articles.filter((a) => readIds.has(a.id)).length;
    const quizzesPassed = quizzes.filter((q) => passedQuizIds.has(q.id)).length;
    const total = articles.length + quizzes.length;
    const done = articlesRead + quizzesPassed;
    return {
      id,
      totalArticles: articles.length,
      articlesRead,
      totalQuizzes: quizzes.length,
      quizzesPassed,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });
}
