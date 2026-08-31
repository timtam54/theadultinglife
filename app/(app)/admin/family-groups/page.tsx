import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getEffectiveAdmin } from "@/lib/auth/session";
import { listAllFamilyGroups } from "@/lib/db/family-groups";
import { listAllUsers } from "@/lib/db/users";
import { FamilyGroupsTable } from "./FamilyGroupsTable";

export const metadata: Metadata = { title: "Family groups" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface GroupSummary {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  primary: {
    id: string;
    email: string | null;
    name: string | null;
    subscriptionStatus: string;
    deletedAt: string | null;
    daysUntilPurge: number | null; // null = not deleted, 0 = ready to purge
  } | null;
  members: {
    id: string;
    email: string | null;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    isPrimary: boolean;
    memberKind: string | null;
    createdAt: string;
    subscriptionStatus: string;
    deletedAt: string | null;
    authProvider: string | null;
  }[];
}

export default async function AdminFamilyGroupsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const admin = await getEffectiveAdmin();
  const [groups, users] = await Promise.all([
    listAllFamilyGroups(),
    listAllUsers(),
  ]);

  // Index users by family_group_id for quick grouping.
  const usersByGroup = new Map<string, typeof users>();
  for (const u of users) {
    const arr = usersByGroup.get(u.family_group_id) ?? [];
    arr.push(u);
    usersByGroup.set(u.family_group_id, arr);
  }

  const summaries: GroupSummary[] = groups.map((g) => {
    const members = usersByGroup.get(g.id) ?? [];
    const primary = members.find((m) => m.is_primary) ?? null;
    let daysUntilPurge: number | null = null;
    if (primary?.deleted_at) {
      const ageMs = Date.now() - new Date(primary.deleted_at).getTime();
      if (ageMs >= THIRTY_DAYS_MS) {
        daysUntilPurge = 0;
      } else {
        daysUntilPurge = Math.ceil(
          (THIRTY_DAYS_MS - ageMs) / (24 * 60 * 60 * 1000)
        );
      }
    }
    return {
      id: g.id,
      name: g.name,
      createdAt: g.created_at,
      memberCount: members.length,
      primary: primary
        ? {
            id: primary.id,
            email: primary.email,
            name:
              [primary.first_name, primary.last_name]
                .filter(Boolean)
                .join(" ") || primary.name,
            subscriptionStatus: primary.subscription_status,
            deletedAt: primary.deleted_at,
            daysUntilPurge,
          }
        : null,
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        first_name: m.first_name,
        last_name: m.last_name,
        role: m.role,
        isPrimary: m.is_primary,
        memberKind: m.member_kind,
        createdAt: m.created_at,
        subscriptionStatus: m.subscription_status,
        deletedAt: m.deleted_at,
        authProvider: m.auth_provider,
      })),
    };
  });

  const activeSubCount = summaries.filter(
    (s) => s.primary?.subscriptionStatus === "active"
  ).length;
  const pendingDeletionCount = summaries.filter(
    (s) => s.primary?.deletedAt
  ).length;
  const readyToPurgeCount = summaries.filter(
    (s) => s.primary?.daysUntilPurge === 0
  ).length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h1 className="font-display text-3xl text-tal-plum">Family groups</h1>
        <Link
          href="/admin/users"
          className="text-sm text-tal-plum underline hover:text-tal-plum/80"
        >
          All users (flat view) →
        </Link>
      </div>
      <p className="text-tal-plum-soft mb-6">
        {summaries.length} group{summaries.length === 1 ? "" : "s"} ·{" "}
        <span className="text-emerald-700">
          {activeSubCount} active subscription
          {activeSubCount === 1 ? "" : "s"}
        </span>
        {pendingDeletionCount > 0 && (
          <span className="text-red-700">
            {" "}
            · {pendingDeletionCount} pending deletion
          </span>
        )}
        {readyToPurgeCount > 0 && (
          <span className="text-red-700 font-medium">
            {" "}
            · {readyToPurgeCount} ready to purge
          </span>
        )}
        . Click a group to see its members.
      </p>

      <FamilyGroupsTable
        summaries={summaries}
        currentAdminId={admin?.id ?? null}
      />
    </div>
  );
}
