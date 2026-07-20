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

export interface LearningPath {
  id: string;
  categoryId: CategoryId;
  title: string;
  description: string;
  // Ordered list of article IDs. First article is what a new learner starts on.
  articleIds: string[];
  // Lower = higher priority when picking a resume path across multiple in-progress paths.
  priority: number;
}

export const CONTENT_ITEMS: ContentItem[] = COURSE_ARTICLES;

// Ordered paths. Grouped so each path reads like a short, purposeful sequence.
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "personal-identity-docs",
    categoryId: "personal",
    title: "Identity documents",
    description: "The core ID papers — birth, marriage, passport, tax file number.",
    priority: 1,
    articleIds: [
      "course-personal-general-information",
      "course-personal-birth-certificates",
      "course-personal-marriage-certificate",
      "course-personal-passport-travel",
      "course-personal-tax-file-number",
      "course-personal-electoral-roll",
    ],
  },
  {
    id: "personal-end-of-life",
    categoryId: "personal",
    title: "Planning ahead",
    description: "Will, funeral, powers of attorney, health directives.",
    priority: 2,
    articleIds: [
      "course-personal-will-funeral",
      "course-personal-power-of-attorney",
      "course-personal-advanced-health-directive",
    ],
  },
  {
    id: "personal-home-vehicle",
    categoryId: "personal",
    title: "Home & vehicle basics",
    description: "Your accounts, home costs, vehicles and what to do after an accident.",
    priority: 3,
    articleIds: [
      "course-personal-list-of-accounts",
      "course-personal-home-property-rates-rent",
      "course-personal-vehicle-details",
      "course-personal-accident-information",
      "course-personal-daily-routine-planner",
    ],
  },
  {
    id: "health-records",
    categoryId: "health",
    title: "Your health records",
    description: "Insurance, scripts, tests, specialists — the paper trail of your care.",
    priority: 4,
    articleIds: [
      "course-health-health-insurance",
      "course-health-my-health-plan",
      "course-health-dental-records",
      "course-health-scripts",
      "course-health-blood-tests",
      "course-health-specialist-reports",
      "course-health-hospital-discharge",
      "course-health-medical-bills",
    ],
  },
  {
    id: "health-wellbeing",
    categoryId: "health",
    title: "Wellbeing & the long view",
    description: "Meals, goals, mindset and retirement planning.",
    priority: 6,
    articleIds: [
      "course-health-meal-planning",
      "course-health-life-goals-plans",
      "course-health-mind-set",
      "course-health-retirement-pension",
    ],
  },
  {
    id: "education-your-study",
    categoryId: "education",
    title: "Your study history",
    description: "Enrolments, past schools, certificates and future plans.",
    priority: 7,
    articleIds: [
      "course-education-courses-enrolment",
      "course-education-primary-details",
      "course-education-secondary-details",
      "course-education-tertiary-details",
      "course-education-achievement-certificates",
      "course-education-study-plan",
      "course-education-course-storage",
    ],
  },
  {
    id: "employment-job-hunting",
    categoryId: "employment",
    title: "Job hunting kit",
    description: "Cover letter, resume, references, volunteering.",
    priority: 5,
    articleIds: [
      "course-employment-cover-letter",
      "course-employment-resume",
      "course-employment-letters-of-recommendation",
      "course-employment-volunteering-certificates",
    ],
  },
  {
    id: "employment-at-work",
    categoryId: "employment",
    title: "At work",
    description: "Contracts, reviews, wages and end-of-year summaries.",
    priority: 8,
    articleIds: [
      "course-employment-employee-information-form",
      "course-employment-employee-contracts",
      "course-employment-job-description",
      "course-employment-employment-reviews",
      "course-employment-correspondence",
      "course-employment-wages-summaries",
      "course-employment-annual-payment-summary",
    ],
  },
  {
    id: "admin-money-basics",
    categoryId: "admin",
    title: "Money basics",
    description: "Bank statements, loans, budgets, investments, super.",
    priority: 9,
    articleIds: [
      "course-admin-bank-statements",
      "course-admin-loan-statements",
      "course-admin-budgets",
      "course-admin-investments-deeds",
      "course-admin-super-statements",
    ],
  },
  {
    id: "admin-property-tax",
    categoryId: "admin",
    title: "Property & tax",
    description: "Property records, annual tax, payment plans, home & vehicle insurance.",
    priority: 10,
    articleIds: [
      "course-admin-property-records",
      "course-admin-annual-tax-report",
      "course-admin-tax-payment-plans",
      "course-admin-home-insurance",
      "course-admin-vehicle-insurance",
    ],
  },
  {
    id: "admin-household-bills",
    categoryId: "admin",
    title: "Household bills",
    description: "Utilities, phones, rent — the recurring stuff.",
    priority: 11,
    articleIds: [
      "course-admin-telephone-devices",
      "course-admin-electricity-gas",
      "course-admin-rates-water",
      "course-admin-rental-agreements",
    ],
  },
];

// Article ID → { pathId, order } lookup, built once.
const ARTICLE_PATH_INDEX = (() => {
  const index = new Map<string, { pathId: string; order: number }>();
  for (const path of LEARNING_PATHS) {
    path.articleIds.forEach((id, i) => {
      index.set(id, { pathId: path.id, order: i });
    });
  }
  return index;
})();

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

export function pathsForCategory(categoryId: CategoryId): LearningPath[] {
  return LEARNING_PATHS.filter((p) => p.categoryId === categoryId);
}

export function findPath(pathId: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === pathId);
}

export function pathForArticle(
  articleId: string
): { path: LearningPath; order: number } | null {
  const entry = ARTICLE_PATH_INDEX.get(articleId);
  if (!entry) return null;
  const path = findPath(entry.pathId);
  if (!path) return null;
  return { path, order: entry.order };
}

export function articlesInPath(pathId: string): ContentItem[] {
  const path = findPath(pathId);
  if (!path) return [];
  const byId = new Map(CONTENT_ITEMS.map((c) => [c.id, c] as const));
  return path.articleIds
    .map((id) => byId.get(id))
    .filter((c): c is ContentItem => c !== undefined);
}
