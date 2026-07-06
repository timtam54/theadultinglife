// Structured learning content. Rendered by the /learn pages.
// Replace or extend with real content later; the app renders from this source.

import type { CategoryId } from "@/lib/db/types";

export interface ContentItem {
  id: string;
  categoryId: CategoryId;
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

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export interface Quiz {
  id: string;
  categoryId: CategoryId;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export const CONTENT_ITEMS: ContentItem[] = [
  {
    id: "personal-intro",
    categoryId: "personal",
    title: "Getting your personal admin together",
    summary: "The docs, cards, and details every adult needs at hand.",
    body: `Start by making sure you can lay hands on the essentials: birth
certificate, driver's licence, passport, Medicare card, and your Tax File
Number. Keep expiry dates in the Life Admin section so nothing lapses.`,
  },
  {
    id: "health-intro",
    categoryId: "health",
    title: "Your health basics",
    summary: "Medicare, private cover, prescriptions and My Health Record.",
    body: `Register for Medicare online, know your private health cover if you
have any, and set a reminder for prescriptions and vaccinations. Store your
Medicare and health fund cards in Documents for quick access.`,
  },
  {
    id: "education-intro",
    categoryId: "education",
    title: "Education records that matter",
    summary: "Transcripts, USI, HELP debt and course docs.",
    body: `Track your Unique Student Identifier (USI), academic transcripts and
any HELP loan statements. Keep certificates in Documents — you'll want them
for job applications and further study.`,
  },
  {
    id: "employment-intro",
    categoryId: "employment",
    title: "Employment paperwork",
    summary: "Contracts, super, payslips and workplace rights.",
    body: `Keep employment contracts, superannuation details and recent
payslips together. Know where to find your super and how to consolidate
accounts. Store performance reviews and certifications too.`,
  },
  {
    id: "admin-intro",
    categoryId: "admin",
    title: "Money admin & bookkeeping",
    summary: "Banking, tax, bills and household paperwork.",
    body: `Keep bank account details, tax records, key bills and any lease or
mortgage documents in one place. Set expiry reminders on things like car rego
and insurance so you're never caught out.`,
  },
];

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

export const QUIZZES: Quiz[] = [
  {
    id: "personal-basics",
    categoryId: "personal",
    title: "Personal admin basics",
    description: "Test your knowledge of the essentials.",
    questions: [
      {
        id: "q1",
        prompt: "How often should you check your driver's licence for expiry?",
        options: [
          { id: "a", text: "Never" },
          { id: "b", text: "Once, when you get it" },
          { id: "c", text: "At least yearly" },
        ],
        correctOptionId: "c",
      },
      {
        id: "q2",
        prompt: "What is a TFN?",
        options: [
          { id: "a", text: "Tax File Number" },
          { id: "b", text: "Total File Name" },
          { id: "c", text: "Travel Fare Note" },
        ],
        correctOptionId: "a",
      },
    ],
  },
  {
    id: "money-basics",
    categoryId: "admin",
    title: "Money admin basics",
    description: "Bills, tax and rego.",
    questions: [
      {
        id: "q1",
        prompt: "When is Australian personal income tax typically due?",
        options: [
          { id: "a", text: "31 December" },
          { id: "b", text: "31 October" },
          { id: "c", text: "1 July" },
        ],
        correctOptionId: "b",
      },
    ],
  },
];

export function contentForCategory(categoryId: CategoryId): ContentItem[] {
  return CONTENT_ITEMS.filter((c) => c.categoryId === categoryId);
}

export function guidesForCategory(categoryId: CategoryId): GuideFile[] {
  return GUIDES.filter((g) => g.categoryId === categoryId);
}

export function quizzesForCategory(categoryId: CategoryId): Quiz[] {
  return QUIZZES.filter((q) => q.categoryId === categoryId);
}

export function findQuiz(id: string): Quiz | undefined {
  return QUIZZES.find((q) => q.id === id);
}

export function findContent(id: string): ContentItem | undefined {
  return CONTENT_ITEMS.find((c) => c.id === id);
}
