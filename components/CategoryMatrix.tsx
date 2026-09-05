import { GuardedLink as Link } from "@/components/GuardedLink";
import type { MatrixData } from "@/lib/services/folder-completion";
import type { CategoryId } from "@/lib/db/types";
import { categoryThumbnail, subcategoryThumbnail } from "@/lib/thumbnails";

export function CategoryMatrix({
  category,
  data,
  linkQuery,
  thumbnails,
}: {
  category: CategoryId;
  data: MatrixData;
  /** Extra querystring (no leading ?) appended to each folder link.
   *  Used when the matrix is rendered inside the Setup Guide so the target
   *  folder page can show the "Return to Setup Guide" banner. */
  linkQuery?: (subcategoryId: string) => string;
  /** Pre-resolved subcategoryId → thumbnail URL map. Computed on the server
   *  with fs-checked fallback so folders without a specific PNG use the
   *  category thumbnail. If omitted we fall back to the pure URL builder
   *  (which may 404 for folders without a generated PNG). */
  thumbnails?: Record<string, string>;
}) {
  const { users, rows } = data;
  const buildHref = (subId: string) => {
    const base = `/records/${category}/${encodeURIComponent(subId)}`;
    const q = linkQuery?.(subId);
    return q ? `${base}?${q}` : base;
  };
  // Per-cell link: same as buildHref but with a `user=` param appended so the
  // target folder auto-selects that family member. Used when the user clicks
  // a ✓/✗ cell instead of the folder name.
  const buildCellHref = (subId: string, userId: string) => {
    const href = buildHref(subId);
    return href.includes("?")
      ? `${href}&user=${encodeURIComponent(userId)}`
      : `${href}?user=${encodeURIComponent(userId)}`;
  };
  const thumbFor = (subId: string) =>
    thumbnails?.[subId] ??
    subcategoryThumbnail(subId, category) ??
    categoryThumbnail(category);

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
                      className="flex items-center gap-2 text-tal-plum hover:underline group"
                    >
                      <span className="text-tal-plum-soft w-6 text-right tabular-nums text-xs">
                        {i + 1}.
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbFor(r.subcategoryId)}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-md object-cover ring-1 ring-tal-line bg-white shrink-0 transition-transform group-hover:scale-110"
                      />
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
                    const clickable = state !== "na";
                    const content =
                      state === "done" ? (
                        <span className="text-green-700 font-bold" aria-label={`${u.displayName}: complete — click to open`}>
                          ✓
                        </span>
                      ) : state === "empty" ? (
                        <span className="text-red-700 font-bold" aria-label={`${u.displayName}: missing — click to open`}>
                          ✗
                        </span>
                      ) : (
                        <span className="text-tal-plum-soft" aria-label="Not applicable">
                          —
                        </span>
                      );
                    return (
                      <td
                        key={u.id}
                        className={
                          "p-0 text-center " +
                          (state === "done"
                            ? "bg-green-50"
                            : state === "empty"
                            ? "bg-red-50"
                            : "")
                        }
                      >
                        {clickable ? (
                          <Link
                            href={buildCellHref(r.subcategoryId, u.id)}
                            className={
                              "block w-full h-full px-3 py-2 transition-all duration-150 hover:scale-105 hover:shadow-sm hover:z-10 relative " +
                              (state === "done"
                                ? "hover:bg-green-200"
                                : "hover:bg-red-200")
                            }
                            title={`${r.name} · ${u.displayName}`}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="px-3 py-2">{content}</div>
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
        <MobileMatrix
          users={users}
          rows={rows}
          buildHref={buildHref}
          buildCellHref={buildCellHref}
          thumbFor={thumbFor}
        />
      </div>
    </>
  );
}

function MobileMatrix({
  users,
  rows,
  buildHref,
  buildCellHref,
  thumbFor,
}: {
  users: MatrixData["users"];
  rows: MatrixData["rows"];
  buildHref: (subcategoryId: string) => string;
  buildCellHref: (subcategoryId: string, userId: string) => string;
  thumbFor: (subcategoryId: string) => string;
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbFor(r.subcategoryId)}
                alt=""
                width={24}
                height={24}
                className="w-6 h-6 rounded-md object-cover ring-1 ring-tal-line bg-white shrink-0"
              />
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
                const clickable = state !== "na";
                const content =
                  state === "done" ? (
                    <span className="text-green-700 font-bold" aria-label={`${u.displayName}: complete — tap to open`}>
                      ✓
                    </span>
                  ) : state === "empty" ? (
                    <span className="text-red-700 font-bold" aria-label={`${u.displayName}: missing — tap to open`}>
                      ✗
                    </span>
                  ) : (
                    <span className="text-tal-plum-soft" aria-label={`${u.displayName}: not applicable`}>
                      —
                    </span>
                  );
                const bg =
                  state === "done"
                    ? "bg-green-50"
                    : state === "empty"
                    ? "bg-red-50"
                    : "";
                if (!clickable) {
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-center h-8 rounded-md ${bg}`}
                      title={u.displayName}
                    >
                      {content}
                    </div>
                  );
                }
                const hoverBg =
                  state === "done"
                    ? "hover:bg-green-200"
                    : "hover:bg-red-200";
                return (
                  <Link
                    key={u.id}
                    href={buildCellHref(r.subcategoryId, u.id)}
                    className={
                      `flex items-center justify-center h-8 rounded-md transition-all duration-150 hover:scale-105 hover:shadow-sm active:brightness-95 ${bg} ${hoverBg}`
                    }
                    title={`${r.name} · ${u.displayName}`}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
