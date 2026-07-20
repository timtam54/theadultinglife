import { listProgress } from "@/lib/db/progress";
import {
  LEARNING_PATHS,
  articlesInPath,
  findPath,
  pathForArticle,
  type ContentItem,
  type LearningPath,
} from "@/content/learning";

export type PathStatus = "not_started" | "in_progress" | "completed";

export interface PathProgress {
  path: LearningPath;
  status: PathStatus;
  completed: number;
  total: number;
  percent: number;
  // The next article the learner should read (first unread), or null if the
  // path is complete.
  currentArticle: ContentItem | null;
  // The article after currentArticle in the path, or null if none.
  nextArticle: ContentItem | null;
  // The last article the user has completed in this path, or null if none.
  lastCompletedArticle: ContentItem | null;
  // Most recent activity on any article in this path (ISO string) or null.
  lastActivityAt: string | null;
}

export async function getPathsProgress(
  userId: string
): Promise<PathProgress[]> {
  const rows = await listProgress(userId);
  const completedIds = new Set(
    rows
      .filter((r) => r.item_type === "content" && r.status === "completed")
      .map((r) => r.item_id)
  );
  const updatedAtById = new Map<string, string>();
  for (const r of rows) {
    if (r.item_type === "content") {
      updatedAtById.set(r.item_id, r.updated_at);
    }
  }

  return LEARNING_PATHS.map((path) => summarize(path, completedIds, updatedAtById));
}

// Picks the highest-priority in-progress path. Ties broken by most recent
// activity; if that's also equal, by LEARNING_PATHS.priority ascending.
export async function getResumePath(
  userId: string
): Promise<PathProgress | null> {
  const all = await getPathsProgress(userId);
  const inProgress = all.filter((p) => p.status === "in_progress");
  if (inProgress.length === 0) return null;
  inProgress.sort((a, b) => {
    if (a.lastActivityAt && b.lastActivityAt) {
      const diff = b.lastActivityAt.localeCompare(a.lastActivityAt);
      if (diff !== 0) return diff;
    } else if (a.lastActivityAt) {
      return -1;
    } else if (b.lastActivityAt) {
      return 1;
    }
    return a.path.priority - b.path.priority;
  });
  return inProgress[0];
}

export function getPathProgressForArticle(
  articleId: string,
  progress: PathProgress[]
): PathProgress | null {
  const match = pathForArticle(articleId);
  if (!match) return null;
  return progress.find((p) => p.path.id === match.path.id) ?? null;
}

function summarize(
  path: LearningPath,
  completedIds: Set<string>,
  updatedAtById: Map<string, string>
): PathProgress {
  const articles = articlesInPath(path.id);
  const total = articles.length;
  let completed = 0;
  let currentArticle: ContentItem | null = null;
  let lastCompletedArticle: ContentItem | null = null;
  let lastActivityAt: string | null = null;

  for (const a of articles) {
    const done = completedIds.has(a.id);
    if (done) {
      completed += 1;
      lastCompletedArticle = a;
    } else if (currentArticle === null) {
      currentArticle = a;
    }
    const t = updatedAtById.get(a.id);
    if (t && (!lastActivityAt || t > lastActivityAt)) {
      lastActivityAt = t;
    }
  }

  const status: PathStatus =
    completed === 0
      ? "not_started"
      : completed >= total
      ? "completed"
      : "in_progress";

  // currentArticle can be null if path is complete; if not started, fall back to first article.
  const resolvedCurrent =
    currentArticle ?? (status === "completed" ? null : articles[0] ?? null);
  const nextArticle = resolvedCurrent
    ? nextAfter(articles, resolvedCurrent.id)
    : null;

  return {
    path,
    status,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    currentArticle: resolvedCurrent,
    nextArticle,
    lastCompletedArticle,
    lastActivityAt,
  };
}

function nextAfter(articles: ContentItem[], id: string): ContentItem | null {
  const idx = articles.findIndex((a) => a.id === id);
  if (idx < 0 || idx + 1 >= articles.length) return null;
  return articles[idx + 1];
}

export { findPath };
