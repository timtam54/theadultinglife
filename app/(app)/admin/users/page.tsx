import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEffectiveAdmin, getSession } from "@/lib/auth/session";
import { listAllUsers } from "@/lib/db/users";
import { ImpersonateButton } from "./ImpersonateButton";
import { PurgeFamilyGroupButton } from "./PurgeFamilyGroupButton";

export const metadata: Metadata = { title: "Users" };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function fmt(dt: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(dt: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DeletionStatus {
  kind: "active" | "deleted_pending" | "deleted_ready";
  daysRemain?: number;
  daysAgo?: number;
}

function deletionStatus(deletedAt: string | null): DeletionStatus {
  if (!deletedAt) return { kind: "active" };
  const ageMs = Date.now() - new Date(deletedAt).getTime();
  const daysAgo = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  if (ageMs >= THIRTY_DAYS_MS) return { kind: "deleted_ready", daysAgo };
  const daysRemain = Math.ceil((THIRTY_DAYS_MS - ageMs) / (24 * 60 * 60 * 1000));
  return { kind: "deleted_pending", daysRemain };
}

const SUB_LABEL: Record<string, string> = {
  none: "Free",
  active: "Active",
  pending: "Pending",
  canceled: "Cancelled",
  deactivated: "Deactivated",
  paused: "Paused",
  delinquent: "Payment failed",
};

const SUB_TONE: Record<string, string> = {
  none: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  canceled: "bg-gray-200 text-gray-800",
  deactivated: "bg-gray-200 text-gray-800",
  paused: "bg-amber-100 text-amber-800",
  delinquent: "bg-red-100 text-red-800",
};

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const admin = await getEffectiveAdmin();
  const users = await listAllUsers();
  const deletedCount = users.filter((u) => u.deleted_at).length;
  const activeSubCount = users.filter(
    (u) => u.subscription_status === "active"
  ).length;
  const delinquentSubCount = users.filter(
    (u) => u.subscription_status === "delinquent"
  ).length;

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">Users</h1>
      <p className="text-tal-plum-soft mb-6">
        {users.length} registered user{users.length === 1 ? "" : "s"} ·{" "}
        <span className="text-emerald-700">
          {activeSubCount} active subscription{activeSubCount === 1 ? "" : "s"}
        </span>
        {delinquentSubCount > 0 && (
          <span className="text-red-700">
            {" "}
            · {delinquentSubCount} payment failed
          </span>
        )}
        {deletedCount > 0 && (
          <span className="text-red-700">
            {" "}
            · {deletedCount} pending deletion
          </span>
        )}
        .
      </p>

      <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Deleted at</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const status = deletionStatus(u.deleted_at);
                return (
                  <tr
                    key={u.id}
                    className={
                      "border-b border-tal-line last:border-0 " +
                      (status.kind !== "active" ? "bg-red-50/40" : "")
                    }
                  >
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {u.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {u.auth_provider ?? "password"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "s"
                            ? "bg-black text-white"
                            : "bg-tal-cream text-tal-plum"
                        }`}
                      >
                        {u.role === "s" ? "Superuser" : "User"}
                      </span>
                      {u.is_primary && (
                        <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-tal-plum text-white">
                          Primary
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status.kind === "active" ? (
                        <span className="text-xs text-emerald-700">Active</span>
                      ) : status.kind === "deleted_pending" ? (
                        <span className="text-xs text-amber-700">
                          Deleted · {status.daysRemain} days until purge
                        </span>
                      ) : (
                        <span className="text-xs text-red-700 font-medium">
                          Ready to purge
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          (SUB_TONE[u.subscription_status] ??
                            "bg-gray-100 text-gray-700")
                        }
                      >
                        {SUB_LABEL[u.subscription_status] ??
                          u.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs">
                      {fmtDate(u.deleted_at)}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs">
                      {fmt(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {u.id !== admin?.id && (
                          <ImpersonateButton
                            userId={u.id}
                            userLabel={u.name ?? u.email ?? u.id}
                          />
                        )}
                        {status.kind === "deleted_ready" && u.is_primary && (
                          <PurgeFamilyGroupButton
                            familyGroupId={u.family_group_id}
                            primaryLabel={u.name ?? u.email ?? u.id}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
