import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAllAudits } from "@/lib/services/audits";
import { AuditView } from "./AuditView";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const audits = await getAllAudits(2000);
  return <AuditView audits={audits} />;
}
