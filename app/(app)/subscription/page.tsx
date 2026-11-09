import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe/server";
import { SubscribeConsentPanel } from "@/components/SubscribeConsentPanel";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { ResumeSubscriptionButton } from "@/components/ResumeSubscriptionButton";
import { UpdateCardButton } from "@/components/UpdateCardButton";

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  amountCents: number | null;
  currency: string;
  dueDate: string | null;
  publicUrl: string | null;
  pdfUrl: string | null;
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
  TRIALING: "Free trial",
  PENDING: "Pending",
  CANCELED: "Cancelled",
  DEACTIVATED: "Deactivated",
  PAUSED: "Paused",
  DELINQUENT: "Payment failed",
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  TRIALING: "bg-emerald-100 text-emerald-800",
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
  const isSubscribed = Boolean(user?.stripe_subscription_id) && dbStatus !== "deactivated";

  if (!isSubscribed) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl text-tal-plum">Subscription</h1>
        <p className="mt-2 text-sm text-tal-plum-soft">
          Manage your TAL Premium membership.
        </p>
        {dbStatus === "deactivated" && (
          <p className="mt-4 rounded-xl bg-tal-cream-soft border border-tal-line px-4 py-3 text-sm text-tal-plum">
            Your subscription has ended. Choose a plan below to restart.
          </p>
        )}
        <div className="mt-6">
          <SubscribeConsentPanel
            hasAlreadyUsedPromo={Boolean(user?.promo_code_used)}
          />
        </div>
      </div>
    );
  }

  // Live details from Stripe. The webhook keeps the user row current, so if
  // Stripe can't be reached we still show the saved status.
  let stripeStatus = "";
  let cancelAtPeriodEnd = false;
  let startedOn: string | null = null;
  let periodEnd: string | null = user?.subscription_period_end ?? null;
  let trialEnd: string | null = user?.subscription_trial_end ?? null;
  let priceLabel: string | null = null;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let cardExp: string | null = null;
  let loadError: string | null = null;
  let invoices: InvoiceRow[] = [];
  const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(user!.stripe_subscription_id!, {
      expand: ["default_payment_method"],
    });
    stripeStatus = sub.status;
    cancelAtPeriodEnd = sub.cancel_at_period_end;
    startedOn = iso(sub.start_date);
    trialEnd = sub.status === "trialing" ? iso(sub.trial_end) : null;
    const item = sub.items.data[0];
    periodEnd = iso(item?.current_period_end) ?? periodEnd;
    const price = item?.price;
    if (price?.unit_amount != null) {
      const amount = new Intl.NumberFormat("en-AU", { style: "currency", currency: price.currency.toUpperCase() }).format(price.unit_amount / 100);
      priceLabel = `${amount} ${price.currency.toUpperCase()} / ${price.recurring?.interval === "year" ? "year" : "month"}`;
    }
    const pm = sub.default_payment_method;
    if (pm && typeof pm !== "string" && pm.card) {
      cardBrand = pm.card.brand;
      cardLast4 = pm.card.last4;
      cardExp = `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}`;
    }
    const list = await stripe.invoices.list({ customer: user!.stripe_customer_id!, limit: 24 });
    invoices = list.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: (inv.status ?? "unknown").toUpperCase(),
      amountCents: inv.amount_paid || inv.amount_due || 0,
      currency: inv.currency.toUpperCase(),
      dueDate: iso(inv.status_transitions?.paid_at ?? inv.created),
      publicUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const status = stripeStatus || dbStatus;
  const displayStatus =
    cancelAtPeriodEnd ? "CANCELED"
    : status === "trialing" ? "TRIALING"
    : status === "past_due" || status === "unpaid" || status === "delinquent" ? "DELINQUENT"
    : status.toUpperCase();
  const label = STATUS_LABEL[displayStatus] ?? displayStatus;
  const tone = STATUS_TONE[displayStatus] ?? "bg-gray-100 text-gray-800";
  const running = ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(stripeStatus);
  const cancelable = running && !cancelAtPeriodEnd;

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
              TAL Premium{user?.subscription_plan ? ` — ${user.subscription_plan === "annual" ? "Annual" : "Monthly"}` : ""}
            </p>
            {priceLabel && <p className="mt-1 text-sm text-gray-700">{priceLabel}</p>}
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
            Couldn&rsquo;t load live details from Stripe just now. Saved
            status: <strong>{dbStatus}</strong>.
          </p>
        )}
        {displayStatus === "DELINQUENT" && (
          <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            Your last payment didn&rsquo;t go through. Change your card below and we&rsquo;ll try again straight away.
          </p>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              Started
            </dt>
            <dd className="mt-1 text-gray-800">
              {startedOn ? formatDate(startedOn) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              {trialEnd ? "Free trial ends" : cancelAtPeriodEnd ? "Access ends" : "Next billing date"}
            </dt>
            <dd className="mt-1 text-gray-800">
              {trialEnd ? formatDate(trialEnd) : periodEnd ? formatDate(periodEnd) : "-"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-widest text-tal-plum-soft">
              Payment method
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3 text-gray-800">
              <span>
                {cardBrand && cardLast4
                  ? `${prettyBrand(cardBrand)} ending ${cardLast4}${cardExp ? ` · exp ${cardExp}` : ""}`
                  : "-"}
              </span>
              {running && <UpdateCardButton />}
            </dd>
          </div>
        </dl>
      </div>

      <InvoiceHistory invoices={invoices} />

      {cancelAtPeriodEnd && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-tal-plum">
            Changed your mind?
          </h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Your subscription is cancelled but you still have access until{" "}
            <strong>{periodEnd ? formatDate(periodEnd) : "the end of the period"}</strong>. Resume now and it
            will keep renewing, no new card needed.
          </p>
          <ResumeSubscriptionButton />
        </div>
      )}

      {cancelable && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-tal-plum">Danger zone</h2>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Cancel any time. You&rsquo;ll keep access until the end of your
            current {trialEnd ? "free trial" : "billing period"}.
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
  OPEN: "Due",
  VOID: "Void",
  UNCOLLECTIBLE: "Unpaid",
};

const INVOICE_STATUS_TONE: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  UNPAID: "bg-yellow-100 text-yellow-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  UNCOLLECTIBLE: "bg-red-100 text-red-800",
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
                : "-";
            return (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {inv.dueDate ? formatDate(inv.dueDate) : "-"}
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
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tal-plum underline underline-offset-2 hover:opacity-80"
                    >
                      PDF
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
