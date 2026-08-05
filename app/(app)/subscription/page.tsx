import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { SquareCardForm } from "@/components/SquareCardForm";

export const metadata: Metadata = {
  title: "Subscription",
};

export default async function SubscriptionPage() {
  const session = await requireSession();
  const user = await findUserById(session.user.id);
  const status = user?.subscription_status ?? "none";
  const isActive = status === "active";

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl text-tal-plum">Subscription</h1>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Current status</p>
        <p className="mt-1 text-lg font-medium capitalize">{status}</p>
      </div>

      {isActive ? (
        <p className="mt-6 text-sm text-gray-700">
          You&rsquo;re subscribed. Manage billing from Square directly for now.
        </p>
      ) : (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Start subscription</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            TAL Premium &mdash; $9.99 AUD / month. Cancel anytime.
          </p>
          <SquareCardForm />
        </div>
      )}
    </div>
  );
}
