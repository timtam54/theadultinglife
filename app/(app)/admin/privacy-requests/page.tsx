import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listPrivacyRequests } from "@/lib/db/privacy-requests";

export const metadata: Metadata = { title: "Privacy requests" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const KIND_LABEL: Record<string, string> = {
  access: "Access",
  correct: "Correct",
  export: "Export",
  delete: "Delete",
  complaint: "Complaint",
  other: "Other",
};

const STATUS_TONE: Record<string, string> = {
  new: "bg-red-100 text-red-800",
  in_progress: "bg-amber-100 text-amber-800",
  responded: "bg-emerald-100 text-emerald-800",
  closed: "bg-gray-100 text-gray-800",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  responded: "Responded",
  closed: "Closed",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export default async function AdminPrivacyRequestsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const requests = await listPrivacyRequests();
  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Privacy requests
      </h1>
      <p className="text-tal-plum-soft mb-6">
        {requests.length} total
        {newCount > 0 && (
          <span className="text-red-700"> · {newCount} new</span>
        )}
        {inProgressCount > 0 && (
          <span className="text-amber-700">
            {" "}
            · {inProgressCount} in progress
          </span>
        )}
        . Australian Privacy Principles require a substantive response within
        30 days.
      </p>

      <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-tal-plum-soft italic"
                  >
                    No privacy requests yet.
                  </td>
                </tr>
              )}
              {requests.map((r) => {
                const age = daysAgo(r.created_at);
                const overdue = age >= 30 && r.status !== "responded" && r.status !== "closed";
                return (
                  <tr
                    key={r.id}
                    className={
                      "border-b border-tal-line last:border-0 " +
                      (r.status === "new" ? "bg-red-50/30 " : "") +
                      (overdue ? "!bg-red-100/60" : "")
                    }
                  >
                    <td className="px-4 py-3 text-tal-plum-soft text-xs">
                      #{r.id}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs whitespace-nowrap">
                      {fmt(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span
                        className={overdue ? "text-red-700 font-medium" : "text-tal-plum-soft"}
                      >
                        {age}d
                        {overdue && " · OVERDUE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-tal-plum">
                      {KIND_LABEL[r.request_kind] ?? r.request_kind}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          (STATUS_TONE[r.status] ?? "bg-gray-100 text-gray-800")
                        }
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs">
                      {r.email}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft text-xs max-w-xs truncate">
                      {r.message || <em>(no message)</em>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/privacy-requests/${r.id}`}
                        className="text-xs text-tal-plum underline"
                      >
                        Open
                      </Link>
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
