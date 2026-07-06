import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

const CARDS = [
  {
    href: "/records",
    title: "Life Administration",
    body: "Store your driver's licence, Medicare, vehicle rego and other structured records — with expiry reminders.",
    accent: "bg-tal-cream",
  },
  {
    href: "/files",
    title: "Secure Documents",
    body: "Upload and organise your personal documents and photos. Private, per-user, downloadable on demand.",
    accent: "bg-tal-cream-soft",
  },
  {
    href: "/learn",
    title: "Learn as you go",
    body: "Bite-sized guides, downloadable forms and quick quizzes across all five life-admin areas.",
    accent: "bg-tal-cream",
  },
];

export default async function DashboardPage() {
  const session = await requireSession();
  const first = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Hi {first}
      </h1>
      <p className="text-tal-plum-soft mb-8">
        Welcome to The Adulting Life. Pick a section to get started.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`block rounded-2xl border border-tal-line ${c.accent} p-6 hover:shadow-md transition`}
          >
            <h2 className="font-display text-xl text-tal-plum mb-2">
              {c.title}
            </h2>
            <p className="text-sm text-tal-plum-soft">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
