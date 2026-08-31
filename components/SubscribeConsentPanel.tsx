"use client";

import { useMemo, useState } from "react";
import { SquareCardForm } from "@/components/SquareCardForm";

type PlanKey = "monthly" | "annual";

interface PlanConfig {
  key: PlanKey;
  label: string;
  price: number; // AUD
  cadenceLabel: string;
  gstPortion: number; // AUD, informational
  nextChargeAfterFreeTrialLabel: string;
  advanceMonths: number; // used to compute next charge date preview
}

const PLANS: Record<PlanKey, PlanConfig> = {
  monthly: {
    key: "monthly",
    label: "Monthly",
    price: 12.99,
    cadenceLabel: "monthly",
    gstPortion: 1.18, // 12.99 / 11
    nextChargeAfterFreeTrialLabel: "monthly on the same date",
    advanceMonths: 1,
  },
  annual: {
    key: "annual",
    label: "Annual",
    price: 129.99,
    cadenceLabel: "yearly",
    gstPortion: 11.82, // 129.99 / 11

    nextChargeAfterFreeTrialLabel: "yearly on the same date",
    advanceMonths: 12,
  },
};

const VALID_PROMO_CODES = new Set(["adulting101"]);

interface Props {
  hasAlreadyUsedPromo: boolean;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function currency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function SubscribeConsentPanel({ hasAlreadyUsedPromo }: Props) {
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [promoInput, setPromoInput] = useState("");

  const promoNormalised = promoInput.trim().toLowerCase();
  const promoValid =
    !!promoNormalised && VALID_PROMO_CODES.has(promoNormalised);
  const promoRedeemable = promoValid && !hasAlreadyUsedPromo;

  const cfg = PLANS[plan];

  // First charge date preview:
  //   - normal: today
  //   - with valid unredeemed promo: today + 30 days
  const firstChargeDate = useMemo(() => {
    const d = new Date();
    if (promoRedeemable) d.setDate(d.getDate() + 30);
    return d;
  }, [promoRedeemable]);

  // Next-after-first date preview:
  //   - monthly → firstCharge + 1 month
  //   - annual → firstCharge + 12 months
  const nextChargeDate = useMemo(() => {
    const d = new Date(firstChargeDate);
    d.setMonth(d.getMonth() + cfg.advanceMonths);
    return d;
  }, [firstChargeDate, cfg.advanceMonths]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-tal-plum">Start TAL Premium</h2>
      <p className="mt-1 text-sm text-gray-600">
        The full Adulting Life experience: records, Peace of Mind Planner,
        sharing, AI features and unlimited storage.
      </p>

      {/* Plan toggle */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-tal-cream-soft p-1">
        {(["monthly", "annual"] as const).map((k) => {
          const p = PLANS[k];
          const active = plan === k;
          const savingsBadge =
            k === "annual"
              ? `Save ${currency(PLANS.monthly.price * 12 - PLANS.annual.price)}`
              : null;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPlan(k)}
              aria-pressed={active}
              className={
                "rounded-lg py-3 px-3 text-sm font-medium transition-colors " +
                (active
                  ? "bg-white shadow-sm text-tal-plum"
                  : "text-tal-plum-soft hover:text-tal-plum")
              }
            >
              <div className="font-semibold">{p.label}</div>
              <div className="text-xs mt-0.5">
                {currency(p.price)} / {k === "monthly" ? "month" : "year"}
              </div>
              {savingsBadge && (
                <div className="mt-1 inline-block rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 font-medium">
                  {savingsBadge}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <dl className="mt-5 space-y-3 border-t border-tal-line pt-5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tal-plum-soft">Price</dt>
          <dd className="text-right">
            <div className="font-semibold text-tal-plum">
              {currency(cfg.price)} AUD /{" "}
              {plan === "monthly" ? "month" : "year"}
            </div>
            <div className="text-xs text-tal-plum-soft">
              Includes GST (approx. {currency(cfg.gstPortion)})
            </div>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tal-plum-soft">Billing</dt>
          <dd className="text-right text-tal-plum">
            {plan === "monthly" ? "Monthly" : "Yearly"}, automatic renewal
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tal-plum-soft">First charge</dt>
          <dd className="text-right text-tal-plum">
            {promoRedeemable ? (
              <>
                <div className="font-medium text-emerald-700">
                  Free for your first month
                </div>
                <div className="text-xs text-tal-plum-soft mt-0.5">
                  Card charged on {fmtDate(firstChargeDate)} unless you cancel
                </div>
              </>
            ) : (
              "Today, when you click Subscribe"
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tal-plum-soft">Next charge after that</dt>
          <dd className="text-right text-tal-plum">
            {fmtDate(nextChargeDate)}, then {cfg.nextChargeAfterFreeTrialLabel}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-tal-plum-soft">Cancel</dt>
          <dd className="text-right text-tal-plum">
            Anytime on this page, one click
          </dd>
        </div>
      </dl>

      {/* Discount code */}
      <div className="mt-5 border-t border-tal-line pt-5">
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
            Have a discount code?
          </span>
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="e.g. Adulting101"
            className="w-full h-10 rounded-lg border border-tal-line px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
          />
        </label>
        {promoInput.trim().length > 0 && (
          <div className="mt-2 text-xs">
            {promoValid && promoRedeemable && (
              <span className="text-emerald-700">
                ✓ Code applied. Your first month is free.
              </span>
            )}
            {promoValid && !promoRedeemable && (
              <span className="text-amber-700">
                Code recognised, but you&apos;ve already used it once. Only one
                promotional trial per account.
              </span>
            )}
            {!promoValid && (
              <span className="text-red-700">Code isn&apos;t recognised.</span>
            )}
          </div>
        )}
      </div>

      {/* If-you-cancel note */}
      <div className="mt-4 rounded-xl bg-tal-cream-soft border border-tal-line p-3 text-xs text-tal-plum-soft">
        <strong className="text-tal-plum">If you cancel:</strong> you keep
        access until the end of the {plan === "monthly" ? "month" : "year"}{" "}
        you&apos;ve already paid for, then the subscription simply stops. No
        further charges. Your account and data are not deleted. Deleting your
        account is a separate action in <em>Settings</em>.
      </div>

      {/* Card form + Subscribe button */}
      <div className="mt-6 border-t border-tal-line pt-5">
        <h3 className="text-sm font-medium text-tal-plum mb-3">
          Payment details
        </h3>
        <SquareCardForm
          plan={plan}
          promoCode={promoRedeemable ? promoNormalised : null}
        />
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
        . Nothing here limits your rights under the Australian Consumer Law.
      </p>
    </div>
  );
}
