import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listLogs } from "@/lib/db/app_logs";
import type { LogLevel } from "@/lib/db/types";
import { LogsView } from "./LogsView";

export const metadata: Metadata = { title: "Error logs" };

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; source?: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const { level, source } = await searchParams;
  const logs = await listLogs({
    level: level === "error" || level === "warn" ? (level as LogLevel) : undefined,
    source: source || undefined,
    limit: 500,
  });

  return <LogsView logs={logs} initialLevel={level} initialSource={source} />;
}
