import { GuardedLink as Link } from "@/components/GuardedLink";
import type { MatrixData } from "@/lib/services/folder-completion";
import type { CategoryId } from "@/lib/db/types";

export function CategoryMatrix({
  category,
  data,
  linkQuery,
}: {
  category: CategoryId;
  data: MatrixData;
  /** Extra querystring (no leading ?) appended to each folder link.
   *  Used when the matrix is rendered inside the Setup Guide so the target
   *  folder page can show the "Return to Setup Guide" banner. */
  linkQuery?: (subcategoryId: string) => string;
}) {
  const { users, rows } = data;
  const buildHref = (subId: string) => {
    const base = `/records/${category}/${encodeURIComponent(subId)}`;
    const q = linkQuery?.(subId);
    return q ? `${base}?${q}` : base;
  };

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-sm text-tal-plum-soft">
        No per-user folders in this category.
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet: classic wide table with names across the top. */}
      <div className="mt-4 rounded-2xl border border-tal-line bg-white overflow-hidden hidden sm:block">
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
                      href={buildHref(r.subcategoryId)}
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

      {/* Mobile: names rotated 90° so all fit; each folder becomes two rows —
          folder name on top, cells below aligned under their rotated header. */}
      <div className="mt-4 rounded-2xl border border-tal-line bg-white overflow-hidden sm:hidden">
        <MobileMatrix users={users} rows={rows} buildHref={buildHref} />
      </div>
    </>
  );
}

function MobileMatrix({
  users,
  rows,
  buildHref,
}: {
  users: MatrixData["users"];
  rows: MatrixData["rows"];
  buildHref: (subcategoryId: string) => string;
}) {
  // Equal-width columns via CSS grid; rotated names sit directly above their
  // matching ✓/✗ cell in the same column.
  const gridTemplateColumns = `repeat(${users.length}, minmax(0, 1fr))`;

  return (
    <div>
      {/* Sticky header row — rotated 90° names, one per column, evenly spread.
          Uses `writing-mode: vertical-rl` + `rotate(180deg)` so text reads
          bottom-to-top (name starts at the bottom, name-end points up). This
          keeps each name inside its own grid column instead of overflowing. */}
      <div
        className="grid bg-tal-cream-soft border-b border-tal-line px-1 pt-3 pb-2 sticky top-0 z-10"
        style={{ gridTemplateColumns, minHeight: 140 }}
      >
        {users.map((u) => (
          <div key={u.id} className="flex items-end justify-center h-full">
            <div
              className="text-xs text-tal-plum font-medium leading-none px-1 truncate max-h-32"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
              title={`${u.displayName} · ${u.memberKind}${u.isPrimary ? " · primary" : ""}`}
            >
              {u.displayName}
              {u.isPrimary && (
                <span className="text-tal-plum-soft ml-1">★</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-tal-line">
        {rows.map((r, i) => (
          <li key={r.subcategoryId} className="px-2 py-2">
            <Link
              href={buildHref(r.subcategoryId)}
              className="flex items-center gap-2 text-tal-plum hover:underline text-sm mb-1.5"
            >
              <span className="text-tal-plum-soft tabular-nums text-xs">
                {i + 1}.
              </span>
              <span className="min-w-0">{r.name}</span>
              {r.scope === "user_list" && (
                <span className="text-[9px] uppercase tracking-widest text-tal-plum-soft ml-1">
                  · users
                </span>
              )}
              {!r.hasForm && r.scope === "per_user" && (
                <span className="text-[9px] uppercase tracking-widest text-tal-plum-soft ml-1">
                  · no form
                </span>
              )}
            </Link>
            <div className="grid gap-0.5 px-1" style={{ gridTemplateColumns }}>
              {users.map((u) => {
                const state = r.cellByUser[u.id] ?? "na";
                return (
                  <div
                    key={u.id}
                    className={
                      "flex items-center justify-center h-8 rounded-md " +
                      (state === "done"
                        ? "bg-green-50"
                        : state === "empty"
                        ? "bg-red-50"
                        : "")
                    }
                    title={u.displayName}
                  >
                    {state === "done" ? (
                      <span className="text-green-700 font-bold" aria-label={`${u.displayName}: complete`}>
                        ✓
                      </span>
                    ) : state === "empty" ? (
                      <span className="text-red-700 font-bold" aria-label={`${u.displayName}: missing`}>
                        ✗
                      </span>
                    ) : (
                      <span className="text-tal-plum-soft" aria-label={`${u.displayName}: not applicable`}>
                        —
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
