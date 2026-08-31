"use client";

import { Fragment, useState } from "react";
import { ImpersonateButton } from "@/app/(app)/admin/users/ImpersonateButton";
import { PurgeFamilyGroupButton } from "@/app/(app)/admin/users/PurgeFamilyGroupButton";
import type { GroupSummary } from "./page";

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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  summaries: GroupSummary[];
  currentAdminId: string | null;
}

export function FamilyGroupsTable({ summaries, currentAdminId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-6"></th>
              <th className="px-4 py-3 font-medium">Family group</th>
              <th className="px-4 py-3 font-medium">Primary user</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-tal-plum-soft italic"
                >
                  No family groups yet.
                </td>
              </tr>
            )}
            {summaries.map((g) => {
              const isOpen = expanded.has(g.id);
              const primaryDeleted = g.primary?.deletedAt != null;
              const readyToPurge = g.primary?.daysUntilPurge === 0;
              return (
                <Fragment key={g.id}>
                  <tr
                    className={
                      "border-b border-tal-line last:border-0 cursor-pointer hover:bg-tal-cream-soft/30 " +
                      (primaryDeleted ? "bg-red-50/30 " : "")
                    }
                    onClick={() => toggle(g.id)}
                  >
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {isOpen ? "▾" : "▸"}
                    </td>
                    <td className="px-4 py-3 font-medium text-tal-plum">
                      {g.name}
                    </td>
                    <td className="px-4 py-3">
                      {g.primary ? (
                        <>
                          <div className="text-tal-plum">
                            {g.primary.name || "—"}
                          </div>
                          <div className="text-xs text-tal-plum-soft">
                            {g.primary.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-tal-plum-soft italic">
                          No primary
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {g.memberCount}
                    </td>
                    <td className="px-4 py-3">
                      {g.primary && (
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                            (SUB_TONE[g.primary.subscriptionStatus] ??
                              "bg-gray-100 text-gray-700")
                          }
                        >
                          {SUB_LABEL[g.primary.subscriptionStatus] ??
                            g.primary.subscriptionStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!primaryDeleted ? (
                        <span className="text-xs text-emerald-700">
                          Active
                        </span>
                      ) : readyToPurge ? (
                        <span className="text-xs text-red-700 font-medium">
                          Ready to purge
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Deleted · {g.primary?.daysUntilPurge}d until purge
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs">
                      {fmtDate(g.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {readyToPurge && (
                        <PurgeFamilyGroupButton
                          familyGroupId={g.id}
                          primaryLabel={g.primary?.name ?? g.primary?.email ?? g.id}
                        />
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-tal-cream-soft/20 border-b border-tal-line">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
                          Members ({g.members.length})
                        </div>
                        <table className="w-full text-sm bg-white rounded-xl overflow-hidden">
                          <thead className="bg-white border-b border-tal-line text-left text-xs">
                            <tr>
                              <th className="px-3 py-2 font-medium">Email</th>
                              <th className="px-3 py-2 font-medium">Name</th>
                              <th className="px-3 py-2 font-medium">Role</th>
                              <th className="px-3 py-2 font-medium">Provider</th>
                              <th className="px-3 py-2 font-medium">Subscription</th>
                              <th className="px-3 py-2 font-medium">Created</th>
                              <th className="px-3 py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.members.map((m) => {
                              const displayName =
                                [m.first_name, m.last_name]
                                  .filter(Boolean)
                                  .join(" ") ||
                                m.name ||
                                "—";
                              return (
                                <tr
                                  key={m.id}
                                  className="border-b border-tal-line last:border-0"
                                >
                                  <td className="px-3 py-2 text-tal-plum text-xs">
                                    {m.email ?? "—"}
                                  </td>
                                  <td className="px-3 py-2 text-tal-plum-soft text-xs">
                                    {displayName}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span
                                        className={
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                          (m.role === "s"
                                            ? "bg-black text-white"
                                            : "bg-tal-cream text-tal-plum")
                                        }
                                      >
                                        {m.role === "s"
                                          ? "Superuser"
                                          : "User"}
                                      </span>
                                      {m.isPrimary && (
                                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-tal-plum text-white">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-tal-plum-soft text-xs">
                                    {m.authProvider ?? "password"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                        (SUB_TONE[m.subscriptionStatus] ??
                                          "bg-gray-100 text-gray-700")
                                      }
                                    >
                                      {SUB_LABEL[m.subscriptionStatus] ??
                                        m.subscriptionStatus}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-tal-plum-soft text-xs whitespace-nowrap">
                                    {fmtDateTime(m.createdAt)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {m.id !== currentAdminId && (
                                      <ImpersonateButton
                                        userId={m.id}
                                        userLabel={displayName || m.email || m.id}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
