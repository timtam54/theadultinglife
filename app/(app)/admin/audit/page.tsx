import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { searchAudits } from "@/lib/db/audits";
import { AuditView } from "./AuditView";

export const metadata: Metadata = { title: "Audit" };

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const audits = await searchAudits({ limit: 200 });
  return <AuditView initialAudits={audits} />;
}
