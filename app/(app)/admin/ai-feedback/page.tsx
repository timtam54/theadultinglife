import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listRecentAiFeedback } from "@/lib/db/ai-feedback";

export const metadata: Metadata = { title: "Admin · AI feedback" };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AiFeedbackAdminPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const rows = await listRecentAiFeedback(200);

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        TAL AI feedback
      </h1>
      <p className="text-tal-plum-soft text-sm mb-6">
        User reports of unhelpful or unsafe TAL AI answers. Most recent first.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          No reports yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
          <ul className="divide-y divide-tal-line">
            {rows.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-center justify-between text-xs text-tal-plum-soft mb-2">
                  <span>{fmtDate(r.created_at)}</span>
                  <span className="font-mono">{r.user_id.slice(0, 8)}</span>
                </div>
                <div className="text-sm text-tal-plum whitespace-pre-wrap">
                  {r.message_text ?? (
                    <span className="italic text-tal-plum-soft">
                      (no snapshot captured)
                    </span>
                  )}
                </div>
                {r.note && (
                  <div className="mt-2 text-xs text-tal-plum-soft">
                    <span className="font-medium">User note:</span> {r.note}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
