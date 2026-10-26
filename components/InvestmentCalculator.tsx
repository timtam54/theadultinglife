"use client";

import { useEffect, useRef, useState } from "react";

// Investment projection at the top of Investments, Shares & Deeds: what a
// starting amount plus regular contributions could grow to at an assumed
// yearly return. Each saved investment's "Project this investment" button
// opens it with that investment's value. Nothing is saved; general
// information only.

export const PROJECT_INVESTMENT_EVENT = "tal:project-investment";

export function projectInvestment(value: number, label?: string) {
  window.dispatchEvent(new CustomEvent(PROJECT_INVESTMENT_EVENT, { detail: { value, label } }));
}

const NOTE =
  "This is general information and an estimate only — not financial advice. Real returns go up and down, can be negative and aren't guaranteed, and this doesn't include fees or tax. Consider speaking with a licensed financial adviser before making investment decisions.";

const PRESETS = [
  { label: "Cautious", pct: 4 },
  { label: "Balanced", pct: 6 },
  { label: "Growth", pct: 8 },
];
const FREQS = { weekly: 52, fortnightly: 26, monthly: 12, yearly: 1 } as const;
type Freq = keyof typeof FREQS;

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const input = "w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum";

/** Value after `years`, compounding monthly, contributions spread evenly. */
function project(start: number, contribution: number, perYear: number, ratePct: number, years: number) {
  const months = Math.round(years * 12);
  const r = ratePct / 100 / 12;
  const monthlyIn = (contribution * perYear) / 12;
  let value = start;
  for (let m = 0; m < months; m++) value = value * (1 + r) + monthlyIn;
  const contributed = start + monthlyIn * months;
  return { value, contributed, growth: value - contributed };
}

export function InvestmentCalculator() {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  const [contribution, setContribution] = useState("");
  const [freq, setFreq] = useState<Freq>("monthly");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("10");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onProject = (e: Event) => {
      const d = (e as CustomEvent<{ value: number; label?: string }>).detail;
      setStart(String(Math.round(d.value)));
      setFrom(d.label ?? null);
      setOpen(true);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(PROJECT_INVESTMENT_EVENT, onProject);
    return () => window.removeEventListener(PROJECT_INVESTMENT_EVENT, onProject);
  }, []);

  const n = (s: string) => Number(s.replace(/[$,\s]/g, "")) || 0;
  const ready = (n(start) > 0 || n(contribution) > 0) && rate !== "" && n(years) > 0;
  const result = ready ? project(n(start), n(contribution), FREQS[freq], n(rate), n(years)) : null;

  return (
    <section ref={ref} className="mb-6 rounded-2xl border border-tal-line bg-white scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="no-hover-fx w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block font-medium text-tal-plum">Investment projection</span>
          <span className="block text-xs text-tal-plum-soft">
            See what an investment could grow to over time — or tap “Project this investment” on one below.
          </span>
        </span>
        <span aria-hidden className="text-tal-plum">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Starting amount ($)</span>
              <input
                inputMode="decimal"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setFrom(null);
                }}
                className={input}
                placeholder="e.g. 10000"
              />
              {from && <span className="block text-xs text-tal-plum-soft mt-1">From “{from}”</span>}
            </label>
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Regular contribution ($)</span>
              <div className="flex gap-2">
                <input inputMode="decimal" value={contribution} onChange={(e) => setContribution(e.target.value)} className={input} placeholder="e.g. 200" />
                <select value={freq} onChange={(e) => setFreq(e.target.value as Freq)} className={input + " max-w-[8.5rem]"}>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </label>
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Assumed return (% a year)</span>
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
              <span className="mt-1 flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setRate(String(p.pct))}
                    className={
                      "no-hover-fx h-7 px-2 rounded-lg border text-xs " +
                      (n(rate) === p.pct ? "border-black bg-black text-white" : "border-tal-line text-tal-plum hover:bg-tal-cream-soft")
                    }
                  >
                    {p.label} {p.pct}%
                  </button>
                ))}
              </span>
            </label>
            <label className="block">
              <span className="block text-xs text-tal-plum-soft mb-1">Years</span>
              <input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} className={input} />
            </label>
          </div>
          {/* Works it out as you type — no button needed. */}
          <div className="rounded-xl border-2 border-black bg-tal-cream-soft p-4 text-base text-tal-plum" aria-live="polite">
            <div className="text-xs font-semibold uppercase tracking-wider text-tal-plum-soft mb-1">Your projection</div>
            {!result ? (
              <span className="text-sm text-tal-plum-soft">Fill in the boxes above — your projection appears here as you type.</span>
            ) : (
              <>
                In {n(years)} year{n(years) === 1 ? "" : "s"} this could be worth about <strong>{money(result.value)}</strong> — you’d put
                in <strong>{money(result.contributed)}</strong>, and about <strong>{money(result.growth)}</strong> would be growth at{" "}
                {n(rate)}% a year.
              </>
            )}
          </div>
          <p className="text-xs text-tal-plum-soft">{NOTE}</p>
        </div>
      )}
    </section>
  );
}

/** On a saved investment: open the projection with its value. */
export function ProjectInvestmentButton({ answers }: { answers: Record<string, string | null> }) {
  const value = Number(answers["pom.investment.approx_value"] ?? "");
  if (!(value > 0)) return null;
  const label = answers["investments_deeds.title"] || answers["pom.investment.institution"] || undefined;
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => projectInvestment(value, label ?? undefined)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
      >
        Project this investment
      </button>
    </div>
  );
}
