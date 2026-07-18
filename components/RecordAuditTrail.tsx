import type { RecordHistoryRow } from "@/lib/db/types";

export interface AuditEvent {
  id: string;
  action: RecordHistoryRow["action"];
  createdAt: string;
  actorName: string | null;
  changes: Record<string, unknown>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionLabel(action: RecordHistoryRow["action"]): string {
  if (action === "created") return "Created";
  if (action === "updated") return "Updated";
  return "Deleted";
}

function actionTone(action: RecordHistoryRow["action"]): string {
  if (action === "created") return "bg-emerald-100 text-emerald-800";
  if (action === "updated") return "bg-sky-100 text-sky-800";
  return "bg-red-100 text-red-800";
}

function fieldsChanged(changes: Record<string, unknown>): string[] {
  return Object.keys(changes);
}

export function RecordAuditTrail({
  events,
  ownerName,
  createdAt,
  updatedAt,
}: {
  events: AuditEvent[];
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5 mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-100 text-sky-700"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 7v5l3 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="font-display text-lg text-tal-plum">Audit trail</h3>
      </div>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm mb-4">
        <dt className="text-tal-plum-soft">Owner</dt>
        <dd className="text-tal-plum">{ownerName}</dd>
        <dt className="text-tal-plum-soft">Created</dt>
        <dd className="text-tal-plum">{fmtDate(createdAt)}</dd>
        <dt className="text-tal-plum-soft">Last updated</dt>
        <dd className="text-tal-plum">{fmtDate(updatedAt)}</dd>
      </dl>

      {events.length === 0 ? (
        <p className="text-xs text-tal-plum-soft italic">
          No change history recorded yet — future edits will appear here.
        </p>
      ) : (
        <ol className="border-l border-tal-line pl-4 space-y-3">
          {events.map((e) => {
            const changed = fieldsChanged(e.changes);
            return (
              <li key={e.id} className="relative">
                <span
                  className="absolute -left-[1.375rem] top-1 w-3 h-3 rounded-full bg-white border-2 border-tal-plum-soft"
                  aria-hidden
                />
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span
                    className={
                      "text-[10px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded " +
                      actionTone(e.action)
                    }
                  >
                    {actionLabel(e.action)}
                  </span>
                  <span className="text-xs text-tal-plum-soft">
                    {fmtDate(e.createdAt)}
                  </span>
                  {e.actorName && (
                    <span className="text-xs text-tal-plum-soft">
                      by <span className="text-tal-plum">{e.actorName}</span>
                    </span>
                  )}
                </div>
                {changed.length > 0 && (
                  <div className="text-xs text-tal-plum-soft">
                    Changed: {changed.join(", ")}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
