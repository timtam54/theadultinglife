import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AnalyticsView } from "./AnalyticsView";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  return <AnalyticsView />;
}
