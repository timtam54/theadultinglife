import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import {
  financialYearForDate,
  listReceiptsForUser,
  listYearsForUser,
  rollupByCategory,
} from "@/lib/services/receipts";
import { ReceiptsClient } from "./ReceiptsClient";

export const metadata: Metadata = {
  title: "Receipt Register",
  description:
    "Photograph or upload a receipt, check the details, and email a tax-ready register to your accountant at year end.",
};

interface PageProps {
  searchParams: Promise<{ fy?: string; month?: string }>;
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = await searchParams;

  const today = new Date().toISOString().slice(0, 10);
  const defaultFy = financialYearForDate(today).financialYear;
  const fy = params.fy ?? defaultFy;
  const monthNum = params.month ? parseInt(params.month, 10) : undefined;
  const month =
    monthNum && monthNum >= 1 && monthNum <= 12 ? monthNum : undefined;

  const [receipts, years] = await Promise.all([
    listReceiptsForUser(session.user.id, {
      financialYear: fy,
      month,
    }),
    listYearsForUser(session.user.id),
  ]);

  const rollup = rollupByCategory(receipts);
  const availableYears = years.includes(fy) ? years : [fy, ...years];

  return (
    <ReceiptsClient
      receipts={receipts}
      rollup={rollup}
      financialYear={fy}
      month={month ?? null}
      availableYears={availableYears}
    />
  );
}
