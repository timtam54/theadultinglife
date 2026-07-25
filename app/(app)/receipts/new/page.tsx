import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { NewReceiptClient } from "./NewReceiptClient";

export const metadata: Metadata = {
  title: "Add Receipt",
  description: "Snap or upload a receipt — AI fills in the details.",
};

export default async function NewReceiptPage() {
  await requireSession();
  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <Link
          href="/receipts"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Receipts
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <span className="text-tal-plum-soft">Add</span>
      </div>
      <NewReceiptClient />
    </div>
  );
}
