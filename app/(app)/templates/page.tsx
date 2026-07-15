import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listTemplatesForUser } from "@/lib/db/subcategories";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { TemplatesClient } from "./TemplatesClient";

export const metadata: Metadata = {
  title: "Document Templates",
  description:
    "Fillable Adulting Life forms — complete them once and your answers file into the right Life Admin section.",
};

type BuiltInTemplate = {
  title: string;
  body: string;
  href: string;
  categoryLabel: string;
  builtIn: true;
};

const BUILT_INS: BuiltInTemplate[] = [
  {
    title: "Peace of Mind Planner",
    body: "The full fillable planner — family contacts, wishes, letters, device access and more.",
    href: "/templates/peace-of-mind-planner",
    categoryLabel: "Personal",
    builtIn: true,
  },
  {
    title: "Employee Information Form",
    body: "The details a new employer needs on day one — TFN, super, bank, emergency contact.",
    href: "/records/employment/employment.employee_information_form",
    categoryLabel: "Employment",
    builtIn: true,
  },
  {
    title: "Accident / Incident Form",
    body: "Capture what happened, where, when and who else was involved.",
    href: "/records/personal/personal.accident_information",
    categoryLabel: "Personal",
    builtIn: true,
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
    categoryLabel: CATEGORY_LABELS[s.category_id],
    visibility: s.visibility,
    isOwn: s.created_by === session.user.id,
  }));

  return (
    <TemplatesClient
      builtIns={BUILT_INS}
      custom={customCards}
      isSuper={session.user.role === "s"}
    />
  );
}
