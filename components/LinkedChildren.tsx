"use client";

import { useEffect, useState } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { FileViewerButton } from "@/components/FileViewerButton";

// On an entry that other folders link to — a school, a bank account, a
// loan — a dropdown of what links to it (its reports, its statements…),
// with View for the chosen document and a link to that folder.

interface Child {
  instanceId: string;
  label: string;
  file: { id: string; filename: string; mimeType: string | null } | null;
}
interface Group {
  subcategoryId: string;
  folderName: string;
  categoryId: string;
  byParent: Record<string, Child[]>;
}

// One request per folder page, shared by all its entries.
const cache = new Map<string, Promise<Group[]>>();
function load(subcategoryId: string, targetUserId?: string): Promise<Group[]> {
  const key = `${subcategoryId}|${targetUserId ?? ""}`;
  if (!cache.has(key)) {
    const qs = new URLSearchParams({ subcategoryId });
    if (targetUserId) qs.set("targetUserId", targetUserId);
    cache.set(
      key,
      fetch(`/api/linked-children?${qs}`)
        .then((r) => (r.ok ? r.json() : { groups: [] }))
        .then((b: { groups: Group[] }) => b.groups)
        .catch(() => [])
    );
  }
  return cache.get(key)!;
}

const plain = (name: string) => name.replace(/^(Custom|TAL)\s*[—–-]\s*/i, "");

export function LinkedChildren({
  subcategoryId,
  instanceId,
  targetUserId,
}: {
  subcategoryId: string;
  instanceId: string;
  targetUserId?: string;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => {
    let live = true;
    void load(subcategoryId, targetUserId).then((g) => live && setGroups(g));
    return () => {
      live = false;
    };
  }, [subcategoryId, targetUserId]);

  if (groups.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {groups.map((g) => (
        <LinkedGroup key={g.subcategoryId} group={g} items={g.byParent[instanceId] ?? []} targetUserId={targetUserId} />
      ))}
    </div>
  );
}

function LinkedGroup({ group, items, targetUserId }: { group: Group; items: Child[]; targetUserId?: string }) {
  const [chosen, setChosen] = useState(items[0]?.instanceId ?? "");
  const item = items.find((i) => i.instanceId === chosen) ?? items[0];
  const href = `/records/${group.categoryId}/${group.subcategoryId}${targetUserId ? `?user=${encodeURIComponent(targetUserId)}` : ""}`;
  const id = `linked-${group.subcategoryId}`;
  return (
    <div className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-3">
      <label htmlFor={id} className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
        {plain(group.folderName)} ({items.length})
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {items.length > 0 ? (
          <>
            <select
              id={id}
              value={item?.instanceId ?? ""}
              onChange={(e) => setChosen(e.target.value)}
              className="h-9 min-w-[14rem] max-w-full rounded-xl border border-tal-line bg-white px-2 text-sm text-tal-plum"
            >
              {items.map((i) => (
                <option key={i.instanceId} value={i.instanceId}>
                  {i.label}
                </option>
              ))}
            </select>
            {item?.file && (
              <FileViewerButton
                fileId={item.file.id}
                filename={item.file.filename}
                mimeType={item.file.mimeType}
                className="inline-flex items-center h-9 px-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                View
              </FileViewerButton>
            )}
          </>
        ) : (
          <span className="text-sm text-tal-plum-soft">None yet.</span>
        )}
        <Link href={href} className="text-sm text-tal-plum underline underline-offset-2">
          {items.length > 0 ? "Open folder →" : `Add in ${plain(group.folderName)} →`}
        </Link>
      </div>
    </div>
  );
}
