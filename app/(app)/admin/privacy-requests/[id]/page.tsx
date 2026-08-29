import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPrivacyRequest } from "@/lib/db/privacy-requests";
import { PrivacyRequestDetail } from "./PrivacyRequestDetail";

export const metadata: Metadata = { title: "Privacy request" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) notFound();
  const row = await getPrivacyRequest(numeric);
  if (!row) notFound();

  return (
    <div className="max-w-3xl">
      <div className="text-sm text-tal-plum-soft mb-2">
        <Link href="/admin/privacy-requests" className="hover:text-tal-plum">
          ← Back to privacy requests
        </Link>
      </div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Request #{row.id}
      </h1>
      <PrivacyRequestDetail initial={row} />
    </div>
  );
}
