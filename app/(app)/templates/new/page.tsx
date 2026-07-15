import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { TemplateBuilder } from "./TemplateBuilder";

export const metadata: Metadata = {
  title: "New template",
};

export default async function NewTemplatePage() {
  const session = await requireSession();
  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/templates" className="hover:text-tal-plum">
          ← Document Templates
        </Link>
      </div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Create a new template
      </h1>
      <p className="text-tal-plum-soft mb-6">
        Design a fillable form from scratch, or let AI draft one from a short
        description (e.g. &ldquo;will&rdquo;, &ldquo;residential lease&rdquo;,
        &ldquo;Australian student ID&rdquo;).
      </p>
      <TemplateBuilder isSuper={session.user.role === "s"} />
    </div>
  );
}
