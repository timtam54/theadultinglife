import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listTemplatesForUser } from "@/lib/db/subcategories";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { subcategoryThumbnail, categoryThumbnail } from "@/lib/thumbnails";
import { TemplatesClient } from "./TemplatesClient";

export const metadata: Metadata = {
  title: "Document Templates",
  description:
    "Fillable Adulting Life forms — complete them once and your answers file into the right Life Admin section.",
};

type BuiltInTemplate = {
  id: string;
  title: string;
  body: string;
  href: string;
  categoryId: CategoryId;
  categoryLabel: string;
  thumbnailUrl: string;
};

const BUILT_INS: BuiltInTemplate[] = [
  {
    id: "peace-of-mind",
    title: "Peace of Mind Planner",
    body: "The full fillable planner — family contacts, wishes, letters, device access and more.",
    href: "/templates/peace-of-mind-planner",
    categoryId: "personal",
    categoryLabel: "Personal",
    thumbnailUrl: subcategoryThumbnail(
      "personal.general_information",
      "personal"
    ),
  },
  {
    id: "employee-info",
    title: "Employee Information Form",
    body: "The details a new employer needs on day one — TFN, super, bank, emergency contact.",
    href: "/records/employment/employment.employee_information_form",
    categoryId: "employment",
    categoryLabel: "Employment",
    thumbnailUrl: subcategoryThumbnail(
      "employment.employee_information_form",
      "employment"
    ),
  },
  {
    id: "accident-incident",
    title: "Accident / Incident Form",
    body: "Capture what happened, where, when and who else was involved.",
    href: "/records/personal/personal.accident_information",
    categoryId: "personal",
    categoryLabel: "Personal",
    thumbnailUrl: subcategoryThumbnail(
      "personal.accident_information",
      "personal"
    ),
  },
];

export default async function TemplatesPage() {
  const session = await requireSession();
  const custom = await listTemplatesForUser(session.user.id);

  const customCards = custom.map((s) => ({
    id: s.id,
    title: s.name.replace(/^TAL\s*[—-]\s*/, ""),
    body: s.hint ?? "",
    href: `/records/${s.category_id}/${s.id}`,
    categoryId: s.category_id,
    categoryLabel: CATEGORY_LABELS[s.category_id],
    visibility: s.visibility,
    isOwn: s.created_by === session.user.id,
    thumbnailUrl: subcategoryThumbnail(s.id, s.category_id),
  }));

  // Provide a fallback thumbnail per category for anything with a missing image.
  const categoryFallbacks: Record<CategoryId, string> = {
    personal: categoryThumbnail("personal"),
    health: categoryThumbnail("health"),
    education: categoryThumbnail("education"),
    employment: categoryThumbnail("employment"),
    admin: categoryThumbnail("admin"),
  };

  return (
    <TemplatesClient
      builtIns={BUILT_INS}
      custom={customCards}
      isSuper={session.user.role === "s"}
      categoryFallbacks={categoryFallbacks}
    />
  );
}
