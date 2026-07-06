import type { RecordStatus } from "@/lib/db/types";

const styles: Record<RecordStatus, string> = {
  active: "bg-green-100 text-green-800",
  expiring_soon: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
};

const labels: Record<RecordStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
};

export function StatusPill({ status }: { status: RecordStatus }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-1 rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
