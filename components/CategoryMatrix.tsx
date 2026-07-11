import Link from "next/link";
import type { MatrixData } from "@/lib/services/folder-completion";
import type { CategoryId } from "@/lib/db/types";

export function CategoryMatrix({
  category,
  data,
}: {
  category: CategoryId;
  data: MatrixData;
}) {
  const { users, rows } = data;

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-sm text-tal-plum-soft">
        No per-user folders in this category.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-tal-line bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-tal-plum-soft w-1/2">
                Folder
              </th>
              {users.map((u) => (
                <th
                  key={u.id}
                  className="px-3 py-3 font-medium text-center whitespace-nowrap"
                >
                  <div className="text-tal-plum">{u.displayName}</div>
                  <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mt-0.5">
                    {u.memberKind}
                    {u.isPrimary ? " · primary" : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tal-line">
            {rows.map((r, i) => (
              <tr key={r.subcategoryId} className="hover:bg-tal-cream-soft">
                <td className="px-4 py-2">
                  <Link
                    href={`/records/${category}/${encodeURIComponent(r.subcategoryId)}`}
                    className="flex items-center gap-2 text-tal-plum hover:underline"
                  >
                    <span className="text-tal-plum-soft w-6 text-right tabular-nums text-xs">
                      {i + 1}.
                    </span>
                    <span>{r.name}</span>
                    {r.scope === "user_list" && (
                      <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft ml-1">
                        · users
                      </span>
                    )}
                    {!r.hasForm && r.scope === "per_user" && (
                      <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft ml-1">
                        · no form yet
                      </span>
                    )}
                  </Link>
                </td>
                {users.map((u) => {
                  const state = r.cellByUser[u.id] ?? "na";
                  return (
                    <td
                      key={u.id}
                      className={
                        "px-3 py-2 text-center " +
                        (state === "done"
                          ? "bg-green-50"
                          : state === "empty"
                          ? "bg-red-50"
                          : "")
                      }
                    >
                      {state === "done" ? (
                        <span className="text-green-700 font-bold" aria-label="Complete">
                          ✓
                        </span>
                      ) : state === "empty" ? (
                        <span className="text-red-700 font-bold" aria-label="Missing">
                          ✗
                        </span>
                      ) : (
                        <span className="text-tal-plum-soft" aria-label="Not applicable">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
