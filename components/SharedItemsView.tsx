import { FileDownloadLink } from "@/components/FileDownloadLink";
import { FileViewerButton } from "@/components/FileViewerButton";
import type { SharedItem } from "@/lib/services/shared-items";

interface Props {
  items: SharedItem[];
}

// Read-only rendering of items other users have shared with the viewer for a
// given Planner section. Grouped by owner. No edit affordances — this is not
// the grantee's data.
export function SharedItemsView({ items }: Props) {
  if (items.length === 0) return null;

  // Group by owner for readability.
  const byOwner = new Map<
    string,
    { name: string; items: SharedItem[] }
  >();
  for (const it of items) {
    const g = byOwner.get(it.ownerUserId) ?? { name: it.ownerName, items: [] };
    g.items.push(it);
    byOwner.set(it.ownerUserId, g);
  }

  return (
    <section className="mt-10 space-y-6">
      <div className="border-t border-tal-line pt-5">
        <h2 className="font-display text-xl text-tal-plum leading-tight">
          Shared with you
        </h2>
        <p className="text-xs text-tal-plum-soft mt-1">
          These items belong to other Adulting Life users who have chosen to
          share them with you. Read-only.
        </p>
      </div>
      {Array.from(byOwner.values()).map((group) => (
        <div key={group.name} className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-tal-plum-soft">
            Shared by {group.name}
          </div>
          <ul className="space-y-2">
            {group.items.map((it) => (
              <li
                key={`${it.itemKind}:${it.grantId}`}
                className="rounded-xl border border-tal-line bg-tal-cream-soft/40 px-4 py-3"
              >
                <SharedItemCard item={it} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function SharedItemCard({ item }: { item: SharedItem }) {
  if (item.itemKind === "instance" || item.itemKind === "user_form") {
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        {item.fields.length === 0 && (
          <dd className="col-span-2 italic text-tal-plum-soft">
            (Owner hasn&apos;t filled anything in yet.)
          </dd>
        )}
        {item.fields.map((f, i) => (
          <div key={i} className="contents">
            <dt className="text-tal-plum-soft">{f.label}</dt>
            <dd className="text-tal-plum">{f.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (item.itemKind === "record") {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="font-medium text-tal-plum">{item.title}</div>
          {item.expiry && (
            <div className="text-xs text-tal-plum-soft">
              Expires{" "}
              {new Date(item.expiry).toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>
        {item.notes && (
          <div className="text-sm text-tal-plum whitespace-pre-wrap mb-2">
            {item.notes}
          </div>
        )}
        {item.files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {item.files.map((f) => (
              <li
                key={f.id}
                className="text-xs flex items-center gap-2"
              >
                <FileViewerButton
                  fileId={f.id}
                  filename={f.filename}
                  mimeType={f.mimeType}
                  title={f.filename}
                  className="text-tal-plum hover:underline"
                >
                  {f.filename}
                </FileViewerButton>
                <FileDownloadLink fileId={f.id}>Download</FileDownloadLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (item.itemKind === "file") {
    return (
      <div className="text-sm flex items-center gap-3">
        <FileViewerButton
          fileId={item.itemId}
          filename={item.filename}
          mimeType={item.mimeType}
          title={item.filename}
          className="text-tal-plum hover:underline"
        >
          {item.filename}
        </FileViewerButton>
        <FileDownloadLink fileId={item.itemId}>Download</FileDownloadLink>
      </div>
    );
  }
  // planner_letter / planner_apology / planner_wish / planner_last_words
  const heading =
    item.itemKind === "planner_letter"
      ? `Dear ${item.recipient ?? "…"}`
      : item.itemKind === "planner_apology"
        ? `To ${item.recipient ?? "…"}`
        : null;
  return (
    <div>
      {heading && (
        <div className="font-medium text-tal-plum mb-1">{heading}</div>
      )}
      <div className="text-sm text-tal-plum whitespace-pre-wrap font-serif">
        {item.body || (
          <span className="italic text-tal-plum-soft">(Nothing written yet.)</span>
        )}
      </div>
    </div>
  );
}
