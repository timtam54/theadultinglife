import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAllUsers } from "@/lib/db/users";

export const metadata: Metadata = { title: "Users" };

function fmt(dt: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const users = await listAllUsers();

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">Users</h1>
      <p className="text-tal-plum-soft mb-6">
        {users.length} registered user{users.length === 1 ? "" : "s"}.
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
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-tal-line last:border-0">
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
                          ? "bg-tal-plum text-white"
                          : "bg-tal-cream text-tal-plum"
                      }`}
                    >
                      {u.role === "s" ? "Superuser" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-tal-plum-soft">
                    {fmt(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-tal-plum-soft">
                    {fmt(u.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
