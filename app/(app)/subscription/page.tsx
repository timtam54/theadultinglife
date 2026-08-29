import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getSquareClient } from "@/lib/square/client";
import { SquareCardForm } from "@/components/SquareCardForm";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { ResumeSubscriptionButton } from "@/components/ResumeSubscriptionButton";
import { UpdateCardForm } from "@/components/UpdateCardForm";
import { getSquareLocationId } from "@/lib/square/client";

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  amountCents: number | null;
  currency: string;
  dueDate: string | null;
  publicUrl: string | null;
}

export const metadata: Metadata = {
  title: "Subscription",
};

// Never cache — subscription state changes (cancel/resume/webhook) must show
// up on the next request without stale reads.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  CANCELED: "Cancelled",
  DEACTIVATED: "Deactivated",
  PAUSED: "Paused",
  DELINQUENT: "Payment failed",
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELED: "bg-gray-100 text-gray-800",
  DEACTIVATED: "bg-gray-100 text-gray-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  DELINQUENT: "bg-red-100 text-red-800",
};

export default async function SubscriptionPage() {
  const session = await requireSession();
  const user = await findUserById(session.user.id);
  const dbStatus = user?.subscription_status ?? "none";
  const isSubscribed = Boolean(user?.square_subscription_id);

  if (!isSubscribed) {
    // Next-billing-date preview: monthly billing → same day next month.
    const nextChargeDate = new Date();
    nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
    const nextChargeLabel = nextChargeDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl text-tal-plum">Subscription</h1>
        <p className="mt-2 text-sm text-tal-plum-soft">
          Manage your TAL Premium membership.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-tal-plum">
            Start TAL Premium
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            The full Adulting Life experience — records, Peace of Mind
            Planner, sharing, AI features and unlimited storage.
          </p>

          <dl className="mt-5 space-y-3 border-t border-tal-line pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tal-plum-soft">Price</dt>
              <dd className="text-right">
                <div className="font-semibold text-tal-plum">$9.99 AUD / month</div>
                <div className="text-xs text-tal-plum-soft">
                  Includes GST (approx. $0.91)
                </div>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tal-plum-soft">Billing</dt>
              <dd className="text-right text-tal-plum">
                Monthly, automatic renewal
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tal-plum-soft">First charge</dt>
              <dd className="text-right text-tal-plum">
                Today, when you click Subscribe
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tal-plum-soft">Next charge</dt>
              <dd className="text-right text-tal-plum">
                {nextChargeLabel}, then monthly on the same date
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tal-plum-soft">Cancel</dt>
              <dd className="text-right text-tal-plum">
                Anytime on this page — one click
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl bg-tal-cream-soft border border-tal-line p-3 text-xs text-tal-plum-soft">
            <strong className="text-tal-plum">If you cancel:</strong> you keep
            access until the end of the month you&apos;ve already paid for,
            then the subscription simply stops. No further charges. Your
            account and data are not deleted — deleting your account is a
            separate action in <em>Settings</em>.
          </div>

          <div className="mt-6 border-t border-tal-line pt-5">
            <h3 className="text-sm font-medium text-tal-plum mb-3">
              Payment details
            </h3>
            <SquareCardForm />
          </div>

          <p className="mt-4 text-[11px] text-tal-plum-soft">
            By clicking Subscribe you agree to our{" "}
            <a href="/terms" target="_blank" className="underline">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="underline">
              Privacy Policy
            </a>
            . Nothing here limits your rights under the Australian Consumer
            Law.
          </p>
        </div>
      </div>
    );
  }

  const client = getSquareClient();
  let squareStatus = "UNKNOWN";
  let startedOn: string | null = null;
  let chargedThrough: string | null = null;
  let canceledOn: string | null = null;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let cardExp: string | null = null;
  let loadError: string | null = null;
  let invoices: InvoiceRow[] = [];

  try {
    const subResp = await client.subscriptions.get({
      subscriptionId: user!.square_subscription_id!,
      include: "actions",
    });
    const sub = subResp.subscription;
    if (sub) {
      squareStatus = sub.status ?? "UNKNOWN";
      startedOn = sub.startDate ?? sub.createdAt?.slice(0, 10) ?? null;
      chargedThrough = sub.chargedThroughDate ?? null;
      canceledOn = sub.canceledDate ?? null;

      const cardId = sub.cardId;
      if (cardId) {
        try {
          const cardResp = await client.cards.get({ cardId });
          const card = cardResp.card;
          if (card) {
            cardBrand = card.cardBrand ?? null;
            cardLast4 = card.last4 ?? null;
            if (card.expMonth && card.expYear) {
              cardExp = `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
            }
          }
        } catch {
          // card lookup failing shouldn't block the whole page
        }
      }
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  // Fetch invoices for this subscription (separate try so a failure here
  // doesn't hide the main subscription details).
  if (user?.square_customer_id) {
    try {
      const invResp = await client.invoices.search({
        query: {
          filter: {
            locationIds: [getSquareLocationId()],
            customerIds: [user.square_customer_id],
          },
          sort: { field: "INVOICE_SORT_DATE", order: "DESC" },
        },
        limit: 25,
      });
      const rows = invResp.invoices ?? [];
      invoices = rows
        .filter((inv) => inv.subscriptionId === user.square_subscription_id)
        .map((inv) => {
          const req = inv.paymentRequests?.[0];
          const money =
            req?.totalCompletedAmountMoney ?? req?.computedAmountMoney ?? null;
          return {
            id: inv.id ?? "",
            number: inv.invoiceNumber ?? null,
            status: inv.status ?? "UNKNOWN",
            amountCents: money?.amount ? Number(money.amount) : null,
            currency: money?.currency ?? "AUD",
            dueDate: req?.dueDate ?? null,
            publicUrl: inv.publicUrl ?? null,
          };
        });
    } catch {
      // silent — invoice section will just be empty
    }
  }

  // Square doesn't flip status to CANCELED until the paid-through date
  // actually passes. Before that, a cancel-in-progress just adds a
  // canceledDate while status stays ACTIVE. Detect that state explicitly
  // so we can show the Resume UX instead of the (broken) Cancel button.
  const cancelPending =
    canceledOn !== null &&
    (squareStatus === "ACTIVE" || squareStatus === "PENDING") &&
    chargedThrough !== null &&
    new Date(chargedThrough).getTime() > Date.now();

  // For display, treat a pending-cancel subscription as "Cancelled".
  const displayStatus = cancelPending ? "CANCELED" : squareStatus;
  const label = STATUS_LABEL[displayStatus] ?? displayStatus;
  const tone = STATUS_TONE[displayStatus] ?? "bg-gray-100 text-gray-800";
  const cancelable =
    !cancelPending &&
    (squareStatus === "ACTIVE" || squareStatus === "PENDING");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-tal-plum">Subscription</h1>
        <p className="mt-2 text-sm text-tal-plum-soft">
          Manage your TAL Premium membership.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-tal-plum-soft">
              Plan
            </p>
            <p className="mt-1 text-xl font-semibold text-tal-plum">
              TAL Premium
            </p>
            <p className="mt-1 text-sm text-gray-700">$9.99 AUD / month</p>
          </div>
          <span
            className={
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider " +
              tone
            }
          >
            {label}
          </span>
        </div>

        {loadError && (
          <p className="mt-4 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Couldn&rsquo;t load live details from Square: {loadError}. Local
            status: <strong>{dbStatus}</strong>.
          </p>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              Started
            </dt>
            <dd className="mt-1 text-gray-800">
              {startedOn ? formatDate(startedOn) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              {squareStatus === "CANCELED" ? "Access ends" : "Next billing date"}
            </dt>
            <dd className="mt-1 text-gray-800">
              {chargedThrough ? formatDate(chargedThrough) : "—"}
            </dd>
          </div>
          {canceledOn && (
            <div>
              <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
                Cancelled on
              </dt>
              <dd className="mt-1 text-gray-800">{formatDate(canceledOn)}</dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              Payment method
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3 text-gray-800">
              <span>
                {cardBrand && cardLast4
                  ? `${prettyBrand(cardBrand)} ending ${cardLast4}${cardExp ? ` · exp ${cardExp}` : ""}`
                  : "—"}
              </span>
              {(squareStatus === "ACTIVE" ||
                squareStatus === "PENDING" ||
                squareStatus === "DELINQUENT") && <UpdateCardForm />}
            </dd>
          </div>
        </dl>
      </div>

      <InvoiceHistory invoices={invoices} />

      {cancelPending && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-tal-plum">
            Changed your mind?
          </h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Your subscription is cancelled but you still have access until{" "}
            <strong>{formatDate(chargedThrough!)}</strong>. Resume now and it
            will keep renewing at the end of the period — no new card needed.
          </p>
          <ResumeSubscriptionButton />
        </div>
      )}

      {squareStatus === "CANCELED" && !cancelPending && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-tal-plum">
            Restart subscription
          </h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Your subscription has lapsed. Restart anytime.
          </p>
          <SquareCardForm />
        </div>
      )}

      {cancelable && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-tal-plum">Danger zone</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Cancel any time. You&rsquo;ll keep access until the end of your
            current billing period.
          </p>
          <CancelSubscriptionButton />
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function prettyBrand(brand: string): string {
  return brand
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNPAID: "Unpaid",
  SCHEDULED: "Scheduled",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Refunded (partial)",
  REFUNDED: "Refunded",
  CANCELED: "Cancelled",
  FAILED: "Failed",
  PAYMENT_PENDING: "Pending",
};

const INVOICE_STATUS_TONE: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  UNPAID: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELED: "bg-gray-100 text-gray-700",
  REFUNDED: "bg-gray-100 text-gray-700",
  PARTIALLY_REFUNDED: "bg-gray-100 text-gray-700",
};

function InvoiceHistory({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-tal-plum">Billing history</h2>
      {invoices.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">
          No invoices yet &mdash; your first will appear here after your first
          billing cycle.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {invoices.map((inv) => {
            const label = INVOICE_STATUS_LABEL[inv.status] ?? inv.status;
            const tone =
              INVOICE_STATUS_TONE[inv.status] ?? "bg-gray-100 text-gray-700";
            const amount =
              inv.amountCents !== null
                ? new Intl.NumberFormat("en-AU", {
                    style: "currency",
                    currency: inv.currency,
                  }).format(inv.amountCents / 100)
                : "—";
            return (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {inv.number ? `#${inv.number}` : inv.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-gray-800">{amount}</span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                      tone
                    }
                  >
                    {label}
                  </span>
                  {inv.publicUrl && (
                    <a
                      href={inv.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tal-plum underline underline-offset-2 hover:opacity-80"
                    >
                      View
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
