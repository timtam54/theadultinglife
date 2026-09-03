import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { BrandLogo } from "@/components/BrandLogo";
import { ConfirmAgeForm } from "./ConfirmAgeForm";

export const metadata: Metadata = {
  title: "Before you start",
  robots: { index: false, follow: false },
};

export default async function ConfirmAgePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await findUserById(session.user.id);
  if (!user) redirect("/login");

  // Only the primary account holder must confirm age. Non-primary users
  // (children, spouses added by the primary) skip this and go straight to
  // the dashboard.
  if (!user.is_primary) redirect("/dashboard");

  // Already confirmed → nothing to do here.
  if (user.age_confirmed_at) redirect("/welcome");

  return (
    <div className="min-h-screen bg-gradient-to-br from-tal-cream-soft via-tal-cream to-[#f3d9b8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <BrandLogo className="h-16 w-auto mx-auto" />
        </div>
        <div className="bg-white rounded-3xl border border-tal-line shadow-sm p-8">
          <h1 className="font-display text-2xl text-tal-plum mb-2">
            Before you start
          </h1>
          <p className="text-sm text-tal-plum-soft mb-5">
            The Adulting Life is for adults. We just need to confirm your age
            before you begin setting up your account.
          </p>
          <ConfirmAgeForm />
          <p className="mt-6 text-[11px] text-tal-plum-soft">
            You only need to do this once. Children and other family members
            you add later don&apos;t need to confirm.
          </p>
        </div>
      </div>
    </div>
  );
}
