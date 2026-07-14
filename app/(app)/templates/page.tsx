import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Document Templates",
  description:
    "Fillable Adulting Life forms — complete them once and your answers file into the right Life Admin section.",
};

type Template = {
  title: string;
  body: string;
  href: string;
  external?: boolean;
};

const TEMPLATES: Template[] = [
  {
    title: "Peace of Mind Planner",
    body: "The full fillable planner — family contacts, wishes, letters, device access and more. Fill each section, answers file into Life Admin.",
    href: "/templates/peace-of-mind-planner",
  },
  {
    title: "Employee Information Form",
    body: "The details a new employer needs on day one — TFN, super, bank, emergency contact. Fill it in the app, hand it over as a PDF.",
    href: "/records/employment/employment.employee_information_form",
  },
  {
    title: "Accident / Incident Form",
    body: "Capture what happened, where, when and who else was involved. Filed under Personal · Accident Information.",
    href: "/records/personal/personal.accident_information",
  },
];

export default async function TemplatesPage() {
  await requireSession();

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Document Templates
      </h1>
      <p className="text-tal-plum-soft mb-8">
        Fillable Adulting Life forms. Complete them in the app and the answers
        file into the right Life Admin section — or download a blank template
        to hand out.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const className =
            "block rounded-2xl border border-tal-line bg-tal-cream-soft p-6 hover:shadow-md transition";
          const content = (
            <>
              <h2 className="font-display text-xl text-tal-plum mb-2">
                {t.title}
              </h2>
              <p className="text-sm text-tal-plum-soft">{t.body}</p>
            </>
          );
          return t.external ? (
            <a
              key={t.href}
              href={t.href}
              target="_blank"
              rel="noreferrer"
              className={className}
            >
              {content}
            </a>
          ) : (
            <Link key={t.href} href={t.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
