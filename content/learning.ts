// Structured learning content. Rendered by the /learn pages.
// Article bodies live in course-articles.ts (verbatim extract from Donna's
// Adulting Life Organiser Course PDF).
// Quizzes now live in the DB — see lib/db/quizzes.ts.

import type { CategoryId } from "@/lib/db/types";
import { COURSE_ARTICLES } from "./course-articles";

export interface ContentItem {
  id: string;
  categoryId: CategoryId;
  subcategoryId?: string;
  title: string;
  summary: string;
  body: string;
}

export interface GuideFile {
  id: string;
  categoryId: CategoryId;
  title: string;
  description: string;
  href: string;
}

export const CONTENT_ITEMS: ContentItem[] = COURSE_ARTICLES;

export const GUIDES: GuideFile[] = [
  {
    id: "personal-checklist",
    categoryId: "personal",
    title: "Personal document checklist (PDF)",
    description: "A one-page list of the personal documents to keep on file.",
    href: "#",
  },
  {
    id: "employment-checklist",
    categoryId: "employment",
    title: "New job checklist (PDF)",
    description: "What to sort out in your first month at a new job.",
    href: "#",
  },
];

export function contentForCategory(categoryId: CategoryId): ContentItem[] {
  return CONTENT_ITEMS.filter((c) => c.categoryId === categoryId);
}

export function guidesForCategory(categoryId: CategoryId): GuideFile[] {
  return GUIDES.filter((g) => g.categoryId === categoryId);
}

export function findContent(id: string): ContentItem | undefined {
  return CONTENT_ITEMS.find((c) => c.id === id);
}
