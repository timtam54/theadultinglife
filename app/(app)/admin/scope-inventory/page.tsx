import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { loadScopeInventory } from "@/lib/services/scope-inventory";
import { ScopeInventoryTable } from "./ScopeInventoryTable";

export const metadata: Metadata = { title: "Scope inventory" };

export default async function ScopeInventoryPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const rows = await loadScopeInventory();
  return <ScopeInventoryTable rows={rows} />;
}
