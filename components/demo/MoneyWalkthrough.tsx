"use client"

// "Money tools" walkthrough (browser) for the public /demo page: hand-built
// copies of the real screens with the Taylor family's sample data - no sign-in,
// no API calls. Wages summary -> "Use in my budget" (WagesToBudget) -> the
// Money & Me budget (BudgetPlanner) -> Loans' loan calculator (LoanCalculator,
// lib/loan-math) -> "Add these figures as a new loan" -> Investments' projection
// (InvestmentCalculator). Figures are the real maths for these inputs.
// Canvas 1200 x 760 (see WalkthroughPlayer); the budget and loans pages scroll.
// If a real screen changes, update the matching screen here.

import type { ReactNode } from "react"
import {
  AlertTriangle, Bell, Bot, CheckCircle2, CreditCard, FileText, Folder, Home, Map, Receipt, Send, Settings, Share2, Sparkles,
} from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

// ── Building blocks ──────────────────────────────────────────────────────────

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)

const NAV: { t: string; i: ReactNode; badge?: string }[] = [
  { t: "Dashboard", i: <Home className="h-[18px] w-[18px]" /> },
  { t: "Setup guide", i: <Sparkles className="h-[18px] w-[18px]" /> },
  { t: "The Adulting Life Organiser", i: <Folder className="h-[18px] w-[18px]" /> },
  { t: "Documents", i: <FileText className="h-[18px] w-[18px]" /> },
  { t: "Receipts", i: <Receipt className="h-[18px] w-[18px]" />, badge: "New" },
  { t: "Peace of Mind Planner", i: <FileText className="h-[18px] w-[18px]" /> },
  { t: "Learn", i: <Send className="h-[18px] w-[18px]" />, badge: "New" },
  { t: "TAL AI", i: <Bot className="h-[18px] w-[18px]" /> },
  { t: "Tasks", i: <CheckCircle2 className="h-[18px] w-[18px]" /> },
  { t: "Reminders", i: <Bell className="h-[18px] w-[18px]" /> },
  { t: "Emergency", i: <AlertTriangle className="h-[18px] w-[18px]" /> },
  { t: "Settings", i: <Settings className="h-[18px] w-[18px]" /> },
  { t: "Subscription", i: <CreditCard className="h-[18px] w-[18px]" /> },
  { t: "Maps", i: <Map className="h-[18px] w-[18px]" /> },
]

/** The app frame: black sidebar (w-64) + cream header (h-16), as in app/(app)/layout.tsx. */
function Shell({ active, h = 760, children }: { active: string; h?: number; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={256} h={h} className="bg-black text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons-pwa/icon-192.png" alt="" className="absolute left-[92px] top-5 h-[72px] w-[72px] rounded-xl" />
        <div className="absolute left-0 top-[100px] w-full text-center text-[11px] leading-snug text-white/60">
          Your life. Organised.<br />Your future. Secured.
          <div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div>
        </div>
        {NAV.map((n, k) => (
          <div key={n.t} className={`absolute left-3 flex h-9 w-[232px] items-center gap-3 rounded-xl px-3 text-sm ${n.t === active ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`} style={{ top: 168 + k * 39 }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{n.i}</span>
            <span className="flex-1 truncate">{n.t}</span>
            {n.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${n.t === active ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
          </div>
        ))}
      </Box>
      <Box x={256} y={0} w={944} h={64} className="flex items-center gap-2 border-b border-tal-line bg-tal-cream-soft px-6">
        <div className="flex h-10 w-[340px] items-center rounded-full border border-tal-line bg-white pl-9 text-sm text-tal-plum-soft">Search your organiser…</div>
        <div className="flex h-10 items-center gap-1.5 rounded-full border border-tal-line bg-white px-4 text-sm font-medium">+ Add</div>
        <div className="flex-1" />
        <div className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"><Sparkles className="h-4 w-4" />Ask TAL AI</div>
        <div className="relative flex h-10 w-10 items-center justify-center"><Bell className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">3</span></div>
        <div className="flex items-center gap-2 pl-1 pr-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">S</span><span className="text-sm">Hi Sarah</span><span className="text-xs text-tal-plum-soft">▾</span></div>
      </Box>
      {children}
    </div>
  )
}

/** Breadcrumb + black folder header, as on /records/[category]/[subcategory]. */
function FolderTop({ category, title, hint, thumb, person = true, excel = true }: { category: string; title: string; hint?: string; thumb: string; person?: boolean; excel?: boolean }) {
  return (
    <>
      <Box x={288} y={74} w={880} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft">
        The Adulting Life Organiser<span className="text-tal-plum-soft/50">·</span>{category}
        {person && <><span className="text-tal-plum-soft/50">·</span><span className="flex items-center gap-1.5 rounded-full border border-tal-line bg-white px-2.5 py-0.5 text-xs text-tal-plum"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">S</span>Sarah Taylor ▾</span></>}
      </Box>
      <Box x={288} y={104} w={880} h={72} className="flex items-center gap-4 rounded-2xl bg-black px-5 text-white shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover ring-2 ring-white/20" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl leading-tight">{title}</div>
          {hint && <div className="mt-0.5 truncate text-xs text-white/70">{hint}</div>}
        </div>
        {excel && <span className="rounded-xl bg-white/15 px-3 py-2 text-xs font-medium">Export to Excel</span>}
      </Box>
    </>
  )
}

/** A form field as PageForm draws it: small uppercase label over an h-10/11 input. */
const Fld = ({ x, y, w, label, value, ph, hl, h = 40 }: { x: number; y: number; w: number; label: string; value?: string; ph?: string; hl?: boolean; h?: number }) => (
  <Box x={x} y={y} w={w} h={h + 20}>
    <div className="mb-1 text-[11px] uppercase tracking-wider text-tal-plum-soft">{label}</div>
    <div className={`flex items-center rounded-xl border bg-white px-3 text-sm ${hl ? "border-amber-400 ring-2 ring-amber-200" : "border-tal-line"} ${value ? "text-tal-plum" : "text-tal-plum-soft/60"}`} style={{ height: h }}>{value || ph}</div>
  </Box>
)

const PdfBtns = () => (
  <span className="flex gap-2">
    <span className="flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><Share2 className="h-4 w-4" /></span>
    <span className="flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><FileText className="h-4 w-4" />Download PDF</span>
    <span className="flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><Send className="h-4 w-4" />Share PDF</span>
  </span>
)

// 12-column entry grid inside a card (p-4, gap-4): column unit 56px.
const col = (c: number) => 16 + (c - 1) * 72
const span = (n: number) => n * 56 + (n - 1) * 16

// ── 1. Wages summary -> budget ───────────────────────────────────────────────

const WAGE_MSG = "Wages / salary in “Taylor family 2026–27” is now $6,304.91 monthly."
function Wages({ used }: { used?: boolean }) {
  return (
    <Shell active="The Adulting Life Organiser">
      <FolderTop category="Employment" title="Wages Summaries" thumb="/thumbnails/subcategories/employment.wages_summaries.webp" />
      <Box x={288} y={196} w={880} h={398} className="rounded-2xl border border-tal-line bg-white">
        <Box x={16} y={10} w={848} h={36} className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span>
          <PdfBtns />
        </Box>
        <Fld x={col(1)} y={54} w={span(6)} label="Employer" value="Riverside Health Clinic" h={44} />
        <Fld x={col(7)} y={54} w={span(3)} label="Period from" value="03/11/2026" h={44} />
        <Fld x={col(10)} y={54} w={span(3)} label="Period to" value="16/11/2026" h={44} />
        <Fld x={col(1)} y={132} w={span(3)} label="Gross ($)" value="3780.00" h={44} />
        <Fld x={col(4)} y={132} w={span(3)} label="Tax ($)" value="880.00" h={44} />
        <Fld x={col(7)} y={132} w={span(3)} label="Super ($)" value="453.60" h={44} />
        <Fld x={col(10)} y={132} w={span(3)} label="Net ($)" value="2900.00" h={44} />
        <Fld x={col(1)} y={210} w={span(4)} label="Hours worked" value="76" h={44} />
        <Box x={16} y={290} w={150} h={36} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm" style={{ zIndex: 1 }}>Use in my budget</Box>
        {used && <Box x={176} y={290} w={470} h={36} className="flex items-center text-xs text-tal-plum-soft">{WAGE_MSG}</Box>}
        {used && <Box x={656} y={290} w={120} h={36} className="flex items-center text-sm text-tal-plum underline underline-offset-2">Open budget →</Box>}
        <Box x={16} y={342} w={72} h={40} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      </Box>
      <Box x={288} y={612} w={140} h={40} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
    </Shell>
  )
}

// ── 2. The Money & Me budget (tall) ──────────────────────────────────────────

const BUDGET_H = 1420
const SectionBar = ({ title }: { title: string }) => <div className="flex h-10 items-center bg-black px-4 text-sm font-semibold text-white">{title}</div>
const CellLabel = ({ children }: { children: ReactNode }) => <div className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">{children}</div>
const Cell = ({ label, value, dim, w }: { label: string; value: string; dim?: boolean; w: number }) => (
  <div style={{ width: w }} className="shrink-0">
    <CellLabel>{label}</CellLabel>
    <div className={`flex h-9 items-center truncate rounded-lg border border-tal-line bg-white px-2 text-sm ${dim ? "text-tal-plum/50" : "text-tal-plum"}`}>{value}</div>
  </div>
)
const IncomeLine = ({ y, label, amount, notes }: { y: number; label: string; amount: string; notes: string }) => (
  <Box x={16} y={y} w={848} h={62} className="flex gap-2 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-2">
    <Cell label="Income source" value={label} w={361} />
    <Cell label="Amount this period" value={amount} w={144} />
    <Cell label="Notes" value={notes} w={271} />
    <div className="flex w-8 items-end justify-center pb-2 text-tal-plum-soft">×</div>
  </Box>
)
const BillLine = ({ y, label, amount, due = "dd/mm/yyyy", repeats, remind }: { y: number; label: string; amount: string; due?: string; repeats?: string; remind?: string }) => (
  <Box x={16} y={y} w={848} h={62} className="flex gap-2 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-2">
    <Cell label="Give this money a job" value={label} w={100} />
    <Cell label="Amount this period" value={amount} w={128} />
    <Cell label="Next bill due" value={due} dim={!repeats} w={152} />
    <Cell label="Repeats" value={repeats ?? "Doesn't repeat"} dim={!repeats} w={144} />
    <Cell label="App reminder?" value={remind ?? "No reminder"} dim={!repeats} w={152} />
    <Cell label="Notes" value="" w={76} />
    <div className="flex w-8 items-end justify-center pb-2 text-tal-plum-soft">×</div>
  </Box>
)

function Budget() {
  return (
    <Shell active="The Adulting Life Organiser" h={BUDGET_H}>
      <FolderTop category="Admin & Bookkeeping" title="Budgets" thumb="/thumbnails/subcategories/admin.budgets.webp" person={false} excel={false} />
      {/* Budget bar */}
      <Box x={288} y={196} w={880} h={128} className="rounded-2xl border border-tal-line bg-white">
        <Box x={16} y={12} w={420} h={60}>
          <div className="mb-1 text-xs uppercase tracking-widest text-tal-plum-soft">Budget name</div>
          <div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm">Taylor family 2026–27</div>
        </Box>
        <Box x={16} y={78} w={848} h={40} className="flex items-center gap-2 text-sm">
          <span className="flex h-10 items-center rounded-xl bg-black px-4 font-medium text-white">+ New budget</span>
          <span className="flex h-10 items-center rounded-xl border border-tal-line px-4">Archive</span>
          <span className="flex h-10 items-center rounded-xl border border-tal-line px-4">Import from Excel or a file</span>
          <PdfBtns />
        </Box>
      </Box>
      {/* 1. Period */}
      <Box x={288} y={340} w={880} h={186} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <SectionBar title="1. Choose your period" />
        <Box x={16} y={54} w={150} h={64}><div className="mb-1.5 text-sm">My budget period</div><div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm">Monthly ▾</div></Box>
        <Box x={182} y={54} w={170} h={64}><div className="mb-1.5 text-sm">Starting date</div><div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm">01/07/2026</div></Box>
        <Box x={780} y={92} w={84} h={20} className="text-right text-xs text-tal-plum-soft">Saved</Box>
        <Box x={0} y={130} w={880} h={56} className="space-y-1 border-t border-tal-line bg-tal-cream-soft/50 px-4 py-2.5 text-xs text-tal-plum-soft">
          <div>Use the same period for every amount you enter — everything below is monthly.</div>
          <div>Changing the period doesn’t convert amounts. Re-enter them for your new period.</div>
        </Box>
      </Box>
      {/* 2. Income */}
      <Box x={288} y={542} w={880} h={276} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <SectionBar title="2. Money coming in" />
        <Box x={16} y={52} w={848} h={20} className="text-sm text-tal-plum-soft">Add the money you expect to receive after tax during this period.</Box>
        <IncomeLine y={84} label="Wages / salary" amount="$ 6304.91" notes="From wages summary (Riverside Health Clinic): $2,900 take-home for 3 Nov 2026 – 16 Nov 2026" />
        <IncomeLine y={154} label="Other income" amount="$ 410" notes="Family Tax Benefit" />
        <Box x={16} y={226} w={848} h={36} className="flex items-center justify-between">
          <span className="flex h-9 items-center rounded-xl border border-tal-line px-3 text-sm font-medium">+ Add income</span>
          <span className="text-sm">Total income: <b>$6,714.91</b></span>
        </Box>
      </Box>
      {/* 3. Buckets */}
      <Box x={288} y={842} w={880} h={56} className="flex items-end justify-between">
        <div><div className="font-display text-xl">3. Give every dollar a job</div><div className="mt-1 text-sm text-tal-plum-soft">Start with 60 / 20 / 10 / 10. You can adjust the percentages to suit your life.</div></div>
        <span className="flex h-9 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">View as charts</span>
      </Box>
      <Box x={288} y={914} w={880} h={464} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <Box x={0} y={0} w={880} h={48} className="flex items-center justify-between bg-black px-4 text-white">
          <span className="border-b border-dashed border-white/40 text-sm font-semibold uppercase tracking-wide">Needs ✎</span>
          <span className="flex items-center gap-3 text-sm"><span className="flex h-8 w-16 items-center justify-end rounded-lg border border-white/30 bg-white/10 px-2">60</span>%<span className="text-white/80">Suggested amount: <span className="font-medium text-white">$4,028.95</span></span></span>
        </Box>
        <BillLine y={60} label="Rent / board / mortgage" amount="$ 2250" due="01/12/2026" repeats="Every month" remind="A week before" />
        <BillLine y={130} label="Groceries" amount="$ 1050" />
        <BillLine y={200} label="Fuel / transport" amount="$ 300" />
        <BillLine y={270} label="Phone / internet" amount="$ 119" due="05/12/2026" repeats="Every month" remind="The day before" />
        <BillLine y={340} label="Electricity / water" amount="$ 260" due="15/01/2027" repeats="Every quarter" remind="A week before" />
        <Box x={16} y={414} w={848} h={36} className="flex items-center justify-between text-sm">
          <span className="flex h-9 items-center rounded-xl border border-tal-line px-3 font-medium">+ Add a line</span>
          <span className="flex gap-4"><span>Total assigned: <b>$3,979.00</b></span><span>Left to assign: <b>$49.95</b></span></span>
        </Box>
      </Box>
    </Shell>
  )
}

// ── 3. Loans: the loan calculator (tall) ─────────────────────────────────────

const LOANS_H = 1680
const NOTE_LOAN = "This is an estimate only. It assumes your interest rate and repayments stay the same, with no fees, extra repayments or redraws. Your lender can give you the exact figures."
type LoanState = "closed" | "repay" | "payoff"
function LoanEntry({ y, title, isNew, v }: { y: number; title?: string; isNew?: boolean; v: Record<string, string> }) {
  const r = (n: number) => 52 + n * 66
  return (
    <Box x={288} y={y} w={880} h={508} className="rounded-2xl border border-tal-line bg-white">
      <Box x={16} y={10} w={848} h={36} className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {title ? <span className="text-sm font-medium">{title}</span> : <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 2</span>}
          {isNew && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">Not saved yet</span>}
        </span>
        {!isNew && <PdfBtns />}
      </Box>
      <Fld x={col(1)} y={r(0)} w={span(12)} label="Loan name" value={v.name} ph="e.g. Home loan — 123 Smith St, Car loan — Mazda CX-5" hl={isNew} />
      <Fld x={col(1)} y={r(1)} w={span(6)} label="Loan type" value={v.type} ph="Select…" />
      <Fld x={col(7)} y={r(1)} w={span(6)} label="Lender" value={v.lender} ph="" hl={isNew} />
      <Fld x={col(1)} y={r(2)} w={span(6)} label="Loan / account number" value={v.acct} />
      <Fld x={col(7)} y={r(2)} w={span(6)} label="Original amount ($)" value={v.orig} />
      <Fld x={col(1)} y={r(3)} w={span(6)} label="Start date" value={v.start} ph="dd/mm/yyyy" />
      <Fld x={col(7)} y={r(3)} w={span(6)} label="End date" value={v.end} ph="dd/mm/yyyy" />
      <Fld x={col(1)} y={r(4)} w={span(6)} label="Payment amount ($)" value={v.pay} />
      <Fld x={col(7)} y={r(4)} w={span(6)} label="Payment frequency" value={v.freq} ph="Select…" />
      <Fld x={col(1)} y={r(5)} w={span(6)} label="Interest rate (%)" value={v.rate} />
      <Box x={16} y={452} w={72} h={40} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </Box>
  )
}
const HOME_LOAN = { name: "Home loan — 14 Wattle St", type: "Mortgage", lender: "Bayview Mutual", acct: "HL-0048 2291", orig: "520000", start: "15/03/2019", end: "15/03/2049", pay: "3180", freq: "Monthly", rate: "6.09" }
const NEW_LOAN = { orig: "32000", start: "17/11/2026", end: "17/11/2031", pay: "641.21", freq: "Monthly", rate: "7.5" }

function Loans({ state, added }: { state: LoanState; added?: boolean }) {
  const open = state !== "closed"
  const repay = state === "repay"
  const inputs = repay
    ? [["Loan amount ($)", "32000"], ["Interest rate (% a year)", "7.5"], ["Loan term (years)", "5"], ["Repayments", "Monthly ▾"]]
    : [["Balance owing ($)", "24500"], ["Interest rate (% a year)", "7.5"], ["Repayment amount ($)", "750"], ["Repayments", "Monthly ▾"]]
  const entriesY = open ? 626 : 280
  return (
    <Shell active="The Adulting Life Organiser" h={LOANS_H}>
      <FolderTop category="Admin & Bookkeeping" title="Loans" hint="One entry per loan (mortgage, car loan, personal loan, credit card)." thumb="/thumbnails/subcategories/admin.loans_register.webp" />
      <Box x={288} y={196} w={880} h={open ? 398 : 64} className="rounded-2xl border border-tal-line bg-white">
        <Box x={16} y={10} w={848} h={44} className="flex items-center justify-between">
          <span><span className="block font-medium">Loan calculator</span><span className="block text-xs text-tal-plum-soft">Work out repayments, or how long a loan will take to pay off.</span></span>
          <span className="text-lg">{open ? "−" : "+"}</span>
        </Box>
        {open && (
          <>
            <Box x={16} y={60} w={444} h={44} className="flex gap-1 rounded-xl border border-tal-line p-1 text-sm">
              <span className={`flex h-9 w-[236px] items-center justify-center rounded-lg ${repay ? "bg-black text-white" : ""}`}>What will my repayments be?</span>
              <span className={`flex h-9 w-[196px] items-center justify-center rounded-lg ${!repay ? "bg-black text-white" : ""}`}>How long to pay it off?</span>
            </Box>
            {inputs.map(([l, v], k) => (
              <Box key={l} x={16 + k * 215} y={118} w={203} h={62}>
                <div className="mb-1 text-xs text-tal-plum-soft">{l}</div>
                <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">{v}</div>
              </Box>
            ))}
            <Box x={16} y={194} w={848} h={84} className="rounded-xl border-2 border-black bg-tal-cream-soft p-4 text-base">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-tal-plum-soft">Your result</div>
              {repay
                ? <>Repayments of about <b>$641.21</b> monthly, with about <b>$6,473</b> interest over the life of the loan.</>
                : <>About <b>3 years 1 month</b> to pay off — around <b>December 2029</b> — with about <b>$2,989</b> interest.</>}
            </Box>
            <Box x={16} y={294} w={848} h={40} className="flex items-center gap-3">
              <span className="flex h-10 w-[270px] shrink-0 items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Add these figures as a new loan</span>
              <span className="text-xs text-tal-plum-soft">Starts a new entry below with these figures filled in — check it, add the name and lender, then press Save.</span>
            </Box>
            <Box x={16} y={346} w={848} h={36} className="text-xs text-tal-plum-soft">{NOTE_LOAN}</Box>
          </>
        )}
      </Box>
      <LoanEntry y={entriesY} title={HOME_LOAN.name} v={HOME_LOAN} />
      {added && <LoanEntry y={entriesY + 524} isNew v={NEW_LOAN} />}
    </Shell>
  )
}

// ── 4. Investments: the projection ───────────────────────────────────────────

const NOTE_INV = "This is general information and an estimate only — not financial advice. Real returns go up and down, can be negative and aren't guaranteed, and this doesn't include fees or tax. Consider speaking with a licensed financial adviser before making investment decisions."
const INV_DESC = "Every investment you hold — shares, managed funds, ETFs, crypto, investment properties, plus any title deeds. Add one entry per holding: pick the type, record the institution / broker, account or HIN, approximate value and adviser. For adults with any investments outside super."
function Invest({ rate }: { rate?: 6 | 8 }) {
  const open = rate != null
  const entryY = open ? 648 : 384
  return (
    <Shell active="The Adulting Life Organiser">
      <FolderTop category="Admin & Bookkeeping" title="Investments, Shares & Deeds" thumb="/thumbnails/subcategories/admin.investments_deeds.webp" />
      <Box x={288} y={196} w={880} h={84} className="flex gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10 text-sm font-bold">i</span>
        <span className="text-sm leading-relaxed">{INV_DESC}</span>
      </Box>
      <Box x={288} y={300} w={880} h={open ? 328 : 64} className="rounded-2xl border border-tal-line bg-white">
        <Box x={16} y={10} w={848} h={44} className="flex items-center justify-between">
          <span><span className="block font-medium">Investment projection</span><span className="block text-xs text-tal-plum-soft">See what an investment could grow to over time — or tap “Project this investment” on one below.</span></span>
          <span className="text-lg">{open ? "−" : "+"}</span>
        </Box>
        {open && (
          <>
            <Box x={16} y={62} w={203} h={84}>
              <div className="mb-1 text-xs text-tal-plum-soft">Starting amount ($)</div>
              <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">15000</div>
              <div className="mt-1 text-xs text-tal-plum-soft">From “Growth ETF — Northgate Invest”</div>
            </Box>
            <Box x={231} y={62} w={203} h={62}>
              <div className="mb-1 text-xs text-tal-plum-soft">Regular contribution ($)</div>
              <div className="flex gap-2"><div className="flex h-10 flex-1 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">200</div><div className="flex h-10 w-[96px] items-center rounded-xl border border-tal-line bg-white px-3 text-sm">Monthly ▾</div></div>
            </Box>
            <Box x={446} y={62} w={203} h={96}>
              <div className="mb-1 text-xs text-tal-plum-soft">Assumed return (% a year)</div>
              <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">{rate}</div>
            </Box>
            {(["Cautious 4%", "Balanced 6%", "Growth 8%"] as const).map((p, k) => {
              const on = (k === 1 && rate === 6) || (k === 2 && rate === 8)
              return <Box key={p} x={446 + [0, 68, 146][k]} y={126} w={[64, 74, 64][k]} h={28} className={`flex items-center justify-center whitespace-nowrap rounded-lg border text-[11px] ${on ? "border-black bg-black text-white" : "border-tal-line"}`}>{p}</Box>
            })}
            <Box x={661} y={62} w={203} h={62}>
              <div className="mb-1 text-xs text-tal-plum-soft">Years</div>
              <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">10</div>
            </Box>
            <Box x={16} y={170} w={848} h={84} className="rounded-xl border-2 border-black bg-tal-cream-soft p-4 text-base">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-tal-plum-soft">Your projection</div>
              {rate === 6
                ? <>In 10 years this could be worth about <b>$60,067</b> — you’d put in <b>$39,000</b>, and about <b>$21,067</b> would be growth at 6% a year.</>
                : <>In 10 years this could be worth about <b>$69,884</b> — you’d put in <b>$39,000</b>, and about <b>$30,884</b> would be growth at 8% a year.</>}
            </Box>
            <Box x={16} y={268} w={848} h={50} className="text-xs text-tal-plum-soft">{NOTE_INV}</Box>
          </>
        )}
      </Box>
      <Box x={288} y={entryY} w={880} h={300} className="rounded-2xl border border-tal-line bg-white">
        <Box x={16} y={10} w={848} h={36} className="flex items-center justify-between"><span className="text-sm font-medium">Growth ETF — Northgate Invest</span><PdfBtns /></Box>
        <Fld x={col(1)} y={52} w={span(12)} label="Title" value="Growth ETF — Northgate Invest" />
        <Fld x={col(1)} y={118} w={span(6)} label="Investment Type" value="ETF" />
        <Fld x={col(7)} y={118} w={span(6)} label="Institution / Broker" value="Northgate Invest" />
        <Fld x={col(1)} y={184} w={span(6)} label="Approx. Value ($)" value="15000" />
        <Fld x={col(7)} y={184} w={span(6)} label="Last Reviewed" value="30/06/2026" />
        <Box x={16} y={256} w={178} h={36} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm">Project this investment</Box>
      </Box>
    </Shell>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const SCREENS: Record<string, ReactNode> = {
  wages: <Wages />,
  wagesUsed: <Wages used />,
  budget: <Budget />,
  loans: <Loans state="closed" />,
  loanRepay: <Loans state="repay" />,
  loanAdded: <Loans state="repay" added />,
  loanPayoff: <Loans state="payoff" />,
  invest: <Invest />,
  invest6: <Invest rate={6} />,
  invest8: <Invest rate={8} />,
}

const U = "app.theadultinglife.com.au/records"
const STEPS: WalkStep[] = [
  { screen: "wages", url: `${U}/employment/employment.wages_summaries`, caption: "Start with your pay", detail: "Sarah's latest wages summary - gross, tax, super and take-home - is saved in Employment.",
    focus: { x: 728, y: 380, scale: 1.25 }, ring: { x: 288, y: 196, w: 880, h: 280 }, duration: 6500 },
  { screen: "wages", url: `${U}/employment/employment.wages_summaries`, caption: "Use in my budget", detail: "One click puts her take-home pay on the budget's Wages / salary line.",
    focus: { x: 520, y: 500, scale: 1.6 }, ring: { x: 304, y: 486, w: 150, h: 36 }, click: { x: 379, y: 504 }, duration: 6000 },
  { screen: "wagesUsed", url: `${U}/employment/employment.wages_summaries`, caption: "Worked out for your budget's period", detail: "$2,900 a fortnight becomes $6,304.91 a month - no maths needed.",
    focus: { x: 769, y: 500, scale: 1.5 }, ring: { x: 464, y: 486, w: 610, h: 36 }, click: { x: 1004, y: 504 }, duration: 7000 },
  { screen: "budget", url: `${U}/admin/admin.budgets`, caption: "The Money & Me budget", detail: "Choose your period, then list the money coming in. The wages line is already filled in.",
    focus: { x: 728, y: 640, scale: 1.3 }, ring: { x: 304, y: 626, w: 848, h: 62 }, duration: 7000 },
  { screen: "budget", url: `${U}/admin/admin.budgets`, scroll: 640, caption: "Give every dollar a job", detail: "Needs, Emergencies, Wants and Goals savings - start at 60 / 20 / 10 / 10 and see the suggested amount for each.",
    focus: { x: 728, y: 960, scale: 1.25 }, ring: { x: 288, y: 914, w: 880, h: 48 }, duration: 7000 },
  { screen: "budget", url: `${U}/admin/admin.budgets`, scroll: 640, caption: "Bills that remind you", detail: "Give a bill a due date and choose an app reminder - it shows in Reminders and on your dashboard.",
    focus: { x: 790, y: 1010, scale: 1.6 }, ring: { x: 556, y: 974, w: 464, h: 62 }, duration: 7000 },
  { screen: "loans", url: `${U}/admin/admin.loans`, caption: "A loan calculator, right in Loans", detail: "Work out repayments, or how long a loan will take to pay off.",
    focus: { x: 728, y: 260, scale: 1.4 }, ring: { x: 288, y: 196, w: 880, h: 64 }, click: { x: 1150, y: 228 }, duration: 6000 },
  { screen: "loanRepay", url: `${U}/admin/admin.loans`, caption: "What will my repayments be?", detail: "A $32,000 car loan at 7.5% over 5 years - the result appears as you type, no button needed.",
    focus: { x: 728, y: 400, scale: 1.3 }, ring: { x: 304, y: 390, w: 848, h: 84 }, duration: 7500 },
  { screen: "loanRepay", url: `${U}/admin/admin.loans`, caption: "Add these figures as a new loan", detail: "Happy with it? Turn the figures into a loan record.",
    focus: { x: 600, y: 500, scale: 1.5 }, ring: { x: 304, y: 490, w: 270, h: 40 }, click: { x: 439, y: 510 }, duration: 5500 },
  { screen: "loanAdded", url: `${U}/admin/admin.loans`, scroll: 910, caption: "Filled in for you", detail: "Amount, rate, repayment, frequency and dates are in. Add the name and lender, then press Save.",
    focus: { x: 728, y: 1300, scale: 1.15 }, ring: { x: 288, y: 1150, w: 880, h: 508 }, duration: 7500 },
  { screen: "loanPayoff", url: `${U}/admin/admin.loans`, caption: "How long to pay it off?", detail: "$24,500 owing at $750 a month: about 3 years 1 month - around December 2029.",
    focus: { x: 728, y: 390, scale: 1.3 }, ring: { x: 304, y: 390, w: 848, h: 84 }, click: { x: 646, y: 278 }, duration: 7500 },
  { screen: "invest", url: `${U}/admin/admin.investments_deeds`, caption: "Project this investment", detail: "Every saved investment has a button to see what it could grow to.",
    focus: { x: 600, y: 600, scale: 1.4 }, ring: { x: 304, y: 640, w: 178, h: 36 }, click: { x: 393, y: 658 }, duration: 6000 },
  { screen: "invest6", url: `${U}/admin/admin.investments_deeds`, caption: "What it could be worth", detail: "Starts from the ETF's $15,000. Add $200 a month for 10 years at a Balanced 6%: about $60,067.",
    focus: { x: 728, y: 440, scale: 1.3 }, ring: { x: 304, y: 470, w: 848, h: 84 }, duration: 7500 },
  { screen: "invest8", url: `${U}/admin/admin.investments_deeds`, caption: "Cautious, Balanced or Growth", detail: "Tap a preset to compare. General information only - not financial advice.",
    focus: { x: 728, y: 440, scale: 1.3 }, ring: { x: 880, y: 426, w: 64, h: 28 }, click: { x: 912, y: 440 }, duration: 7000 },
]

export default function MoneyWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/demo-music.mp3" steps={STEPS} screens={SCREENS} title="Money tools" autoStart={autoStart} url={`${U}/admin/admin.budgets`}
      intro={{ title: "Money, made simpler", subtitle: "Build a budget from your pay, check loan repayments and see what an investment could grow to." }} />
  )
}
