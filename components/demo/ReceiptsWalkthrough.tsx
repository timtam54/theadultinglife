"use client"

// "Receipts from a photo" walkthrough (phone) for /demo: hand-built copies of
// the real screens with sample data for a made-up family (the Taylors,
// Brisbane) - no sign-in, no API calls. Receipt Register -> Add receipt ->
// Take a photo (a paper receipt drawn in HTML) -> AI reads supplier, date,
// amount, GST, ABN and category -> choose how to file it -> Save receipt ->
// it's on the list and the Totals / By category add up.
// Based on: app/(app)/receipts/ReceiptsClient.tsx, receipts/new/NewReceiptClient.tsx,
// lib/services/receipt-scan.ts (categories), components/AiDisclaimer and the
// mobile header in app/(app)/layout.tsx. Canvas 390 x 844; tall screens scroll
// under a fixed status bar + app header.

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Bell, Menu, Sparkles, Zap } from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

const W = 390
const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)

// ── Frame ────────────────────────────────────────────────────────────────────

const StatusBar = ({ dark }: { dark?: boolean }) => (
  <Box x={0} y={0} w={W} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${dark ? "bg-black text-white" : "bg-tal-cream-soft text-black"}`}>
    <span>10:42</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
// Mobile header from app/(app)/layout.tsx: logo, Ask TAL AI, bell, avatar, menu.
const AppHeader = () => (
  <Box x={0} y={44} w={W} h={64} className="border-b border-tal-line bg-tal-cream-soft">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/icons-pwa/icon-96.png" alt="" className="absolute rounded-xl" style={{ left: 16, top: 14, width: 36, height: 36 }} />
    <div className="absolute flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-medium text-white" style={{ left: 196, top: 14 }}><Sparkles className="h-3.5 w-3.5" />TAL AI</div>
    <div className="absolute flex h-10 w-10 items-center justify-center text-black" style={{ left: 272, top: 12 }}><Bell className="h-5 w-5" strokeWidth={1.6} /></div>
    <div className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-[#6b545a] text-sm font-semibold text-white" style={{ left: 314, top: 16 }}>S</div>
    <div className="absolute flex h-10 w-10 items-center justify-center text-black" style={{ left: 346, top: 12 }}><Menu className="h-5 w-5" /></div>
  </Box>
)
const Top = () => <><StatusBar /><AppHeader /></>
const Page = ({ h = 844, children }: { h?: number; children: ReactNode }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>{children}</div>
)
const Crumbs = ({ items }: { items: string[] }) => (
  <Box x={8} y={120} w={374} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft">
    {items.map((t, n) => <span key={t} className="flex items-center gap-2">{n > 0 && <span className="text-tal-plum-soft/50">/</span>}{t}</span>)}
  </Box>
)
const CameraIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)
const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n)

// ── The paper receipt (sample) ───────────────────────────────────────────────

const ITEMS: [string, number, boolean?][] = [
  ["Bananas 1.2kg", 4.68], ["Full cream milk 3L", 4.9], ["Sourdough loaf", 6.5], ["Chicken thigh 1kg", 13.99],
  ["Free-range eggs 12pk", 7.8], ["Baby spinach 120g", 3.5], ["Laundry liquid 2L", 14, true], ["Paper towel 4pk", 6.6, true], ["Chocolate block", 5.5, true],
]
function PaperReceipt() {
  return (
    <div className="w-[230px] bg-[#fdfcf8] px-4 pb-5 pt-4 font-mono text-[10px] leading-[1.35] text-gray-800 shadow-xl" style={{ clipPath: "polygon(0 0,100% 0,100% 97%,95% 100%,90% 97%,85% 100%,80% 97%,75% 100%,70% 97%,65% 100%,60% 97%,55% 100%,50% 97%,45% 100%,40% 97%,35% 100%,30% 97%,25% 100%,20% 97%,15% 100%,10% 97%,5% 100%,0 97%)" }}>
      <div className="text-center text-[12px] font-bold">NORTHSIDE FRESH MARKET</div>
      <div className="text-center">Shop 4, 120 Gympie Rd</div>
      <div className="text-center">Chermside QLD 4032</div>
      <div className="text-center">ABN 12 345 678 901</div>
      <div className="mt-1 text-center font-bold">TAX INVOICE</div>
      <div className="mt-1 flex justify-between"><span>17/11/2026 10:31</span><span>#004821</span></div>
      <div className="my-1 border-t border-dashed border-gray-400" />
      {ITEMS.map(([t, p, g]) => <div key={t} className="flex justify-between"><span>{t}{g ? " *" : ""}</span><span>{p.toFixed(2)}</span></div>)}
      <div className="my-1 border-t border-dashed border-gray-400" />
      <div className="flex justify-between text-[12px] font-bold"><span>TOTAL</span><span>$67.47</span></div>
      <div className="flex justify-between"><span>GST included *</span><span>2.37</span></div>
      <div className="flex justify-between"><span>VISA EFTPOS</span><span>67.47</span></div>
      <div className="mt-2 text-center">Thanks for shopping local!</div>
      <div className="text-center text-[8px] text-gray-500">SAMPLE RECEIPT</div>
    </div>
  )
}

// ── 1. Receipt Register ──────────────────────────────────────────────────────

type Rec = { s: string; st: "personal" | "ready" | "needs_checking"; cat: string; ai?: string; d: string; pay: string; desc: string; amt: number; ded?: number; isNew?: boolean }
const BEFORE: Rec[] = [
  { s: "Southbank Energy", st: "personal", cat: "Utilities", ai: "high", d: "2026-11-12", pay: "Direct debit", desc: "Electricity bill Aug–Oct", amt: 318.2 },
  { s: "Greenway Fuel", st: "needs_checking", cat: "Motor Vehicle", ai: "medium", d: "2026-11-10", pay: "Visa", desc: "Unleaded 52.4L", amt: 96.4 },
  { s: "Riverbend Office Supplies", st: "ready", cat: "Home Office", ai: "high", d: "2026-11-06", pay: "Visa", desc: "Desk lamp and printer paper", amt: 89.95, ded: 89.95 },
  { s: "Northside Fresh Market", st: "personal", cat: "Groceries", ai: "high", d: "2026-11-03", pay: "Visa", desc: "Weekly groceries", amt: 118.62 },
  { s: "Bayside Pharmacy", st: "personal", cat: "Health/Medical", d: "2026-11-02", pay: "Mastercard", desc: "Prescriptions", amt: 38.5 },
]
const NEW_REC: Rec = { s: "Northside Fresh Market", st: "personal", cat: "Groceries", ai: "high", d: "2026-11-17", pay: "Visa (EFTPOS)", desc: "Groceries — fruit, veg, meat, dairy, household", amt: 67.47, isNew: true }
const ROW0 = 830
const ROW_STEP = 104
const MONTHS = ["July (3)", "August (4)", "September (2)", "October (5)", "November", "December", "January", "February", "March", "April", "May", "June"]
const REG_H = 1940
const chip = (on?: boolean) => `flex h-8 items-center rounded-full border px-3 text-xs ${on ? "border-black bg-black text-white" : "border-tal-line bg-white"}`

function Register({ added }: { added?: boolean }) {
  const recs = added ? [NEW_REC, ...BEFORE] : BEFORE
  const total = recs.reduce((a, r) => a + r.amt, 0)
  const cats = new Map<string, { t: number; c: number }>()
  for (const r of recs) { const c = cats.get(r.cat) ?? { t: 0, c: 0 }; cats.set(r.cat, { t: c.t + r.amt, c: c.c + 1 }) }
  const catRows = [...cats.entries()].sort((a, b) => b[1].t - a[1].t)
  const listEnd = ROW0 + recs.length * ROW_STEP + 8
  const totY = listEnd + 16
  return (
    <Page h={REG_H}>
      <Crumbs items={["Dashboard", "Receipts"]} />
      <Box x={8} y={148} w={374} h={150} className="rounded-2xl bg-black text-white shadow-md" />
      <Box x={24} y={164} w={36} h={36} className="flex items-center justify-center rounded-xl bg-white/15"><CameraIcon /></Box>
      <Box x={70} y={162} w={300} h={30} className="font-display text-2xl leading-tight">Receipt Register</Box>
      <Box x={70} y={196} w={300} h={40} className="text-sm leading-snug text-white/80">Photograph or upload a receipt and check the details.</Box>
      <Box x={24} y={242} w={146} h={40} className="flex items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-black">+ Add receipt</Box>

      <Box x={8} y={314} w={374} h={36} className="flex items-center gap-3 text-sm text-tal-plum-soft">Financial year<span className="flex h-9 items-center rounded-xl border border-tal-line bg-white px-3 text-tal-plum">2026–27 ▾</span></Box>
      <Box x={8} y={358} w={374} h={150} className="flex flex-wrap content-start gap-1">
        <span className={chip()}>Full financial year</span>
        {MONTHS.map((m) => <span key={m} className={chip(m === "November")}>{m === "November" ? `November (${recs.length})` : m}</span>)}
      </Box>
      <Box x={8} y={512} w={374} h={36} className="flex items-center gap-2 text-sm text-tal-plum-soft">Supplier<span className="flex h-9 flex-1 items-center rounded-xl border border-tal-line bg-white px-3">Search supplier…</span></Box>
      <Box x={8} y={556} w={374} h={36} className="flex items-center gap-2 text-sm text-tal-plum-soft">Category<span className="flex h-9 items-center rounded-xl border border-tal-line bg-white px-3 text-tal-plum">All ▾</span></Box>
      <Box x={8} y={604} w={374} h={76} className="flex flex-wrap content-start items-center gap-1 text-sm text-tal-plum-soft">
        <span className="mr-1">Status</span>
        <span className={chip(true)}>All ({recs.length})</span>
        <span className={chip()}>Needs checking (1)</span>
        <span className={chip()}>Ready for accountant (1)</span>
        <span className={chip()}>Personal ({recs.filter((r) => r.st === "personal").length})</span>
      </Box>

      <Box x={8} y={692} w={374} h={listEnd - 692} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={24} y={708} w={342} h={20} className="text-sm text-tal-plum-soft">{recs.length} receipts — November</Box>
      <Box x={24} y={734} w={342} h={32} className="flex items-center gap-2 text-xs">
        <span className="inline-flex rounded-lg border border-tal-line p-0.5"><span className="rounded-md bg-black px-2.5 py-1 font-medium text-white">Cards</span><span className="px-2.5 py-1 font-medium">Table</span></span>
        <span className="flex h-8 items-center rounded-lg border border-tal-line px-3">Select all</span>
        <span className="flex h-8 items-center rounded-lg bg-black px-3 text-white opacity-40">Email selected</span>
      </Box>
      <Box x={24} y={774} w={342} h={44} className="text-[11px] leading-snug text-tal-plum-soft">Tick receipts on the left to email them to your accountant, or use Export view to download the full filtered list.</Box>
      {recs.map((r, n) => (
        <Box key={r.d + r.s} x={16} y={ROW0 + n * ROW_STEP} w={358} h={96} className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${r.isNew ? "border-emerald-400 bg-emerald-50/50" : "border-tal-line bg-white"}`}>
          <span className="mt-1 h-4 w-4 shrink-0 rounded-[3px] border border-gray-400 bg-white" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-medium">{r.s}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${r.st === "ready" ? "bg-emerald-100 text-emerald-800" : r.st === "personal" ? "bg-tal-cream text-tal-plum-soft" : "bg-amber-100 text-amber-800"}`}>{r.st === "ready" ? "Ready" : r.st === "personal" ? "Personal" : "Needs check"}</span>
              <span className="rounded-full bg-tal-cream-soft px-2 py-0.5 text-xs text-tal-plum-soft">{r.cat}</span>
              {r.ai && <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${r.ai === "high" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>AI {r.ai}</span>}
              {r.ai && <span className="text-[10px]">📎</span>}
            </div>
            <div className="mt-0.5 text-xs text-tal-plum-soft">{r.d} · November · {r.pay}</div>
            <div className="mt-0.5 truncate text-sm text-tal-plum-soft">{r.desc}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1"><span className="font-medium">{aud(r.amt)}</span><span className="flex h-7 w-7 items-center justify-center text-red-600">✕</span></div>
            {r.ded ? <div className="text-xs text-emerald-700">{aud(r.ded)} potentially</div> : null}
            <span className="mt-1 inline-flex h-7 items-center rounded-md border border-tal-line px-1.5 text-[11px]">{r.st === "ready" ? "Ready" : r.st === "personal" ? "Personal" : "Needs checking"} ▾</span>
          </div>
        </Box>
      ))}

      <Box x={8} y={totY} w={374} h={216} className="rounded-2xl border border-tal-line bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between"><span className="font-display text-lg">Totals</span><span className="text-[10px] uppercase tracking-wider text-tal-plum-soft">filtered view</span></div>
        <div className="mb-1 flex items-baseline justify-between"><span className="text-sm text-tal-plum-soft">Total spent</span><span className="font-medium">{aud(total)}</span></div>
        <div className="flex items-baseline justify-between"><span className="text-sm text-tal-plum-soft">Potentially deductible</span><span className="font-medium text-emerald-700">{aud(89.95)}</span></div>
        <div className="mt-3 space-y-0.5 border-t border-tal-line pt-3 text-[11px] text-tal-plum-soft">
          <div className="flex justify-between"><span>Whole year — total spent</span><span>{aud(4150.68 + total)}</span></div>
          <div className="flex justify-between"><span>Whole year — potentially deductible</span><span>{aud(1236.4)}</span></div>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-tal-plum-soft">&ldquo;Potentially deductible&rdquo; is amount × work-related % on receipts marked <em>Ready for accountant</em>. Personal receipts are excluded. This isn&apos;t tax advice.</p>
      </Box>
      <Box x={8} y={totY + 232} w={374} h={60 + catRows.length * 26} className="rounded-2xl border border-tal-line bg-white p-4">
        <div className="mb-2 font-display text-lg">By category</div>
        {catRows.map(([c, v]) => (
          <div key={c} className={`flex h-[26px] items-center justify-between text-sm ${added && c === "Groceries" ? "-mx-2 rounded-md bg-emerald-50 px-2" : ""}`}>
            <span>{c}</span><span className="text-tal-plum-soft">{aud(v.t)} <span className="text-xs">({v.c})</span></span>
          </div>
        ))}
      </Box>
    </Page>
  )
}
// Where the Totals / By category cards sit once the new receipt is added (6 rows).
const TOT_Y = ROW0 + 6 * ROW_STEP + 8 + 16
const CAT_Y = TOT_Y + 232

// ── 2. Add a receipt ─────────────────────────────────────────────────────────

function Choose() {
  return (
    <Page>
      <Top />
      <Crumbs items={["Dashboard", "Receipts", "Add"]} />
      <Box x={8} y={148} w={374} h={480} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={32} y={172} w={326} h={32} className="font-display text-2xl">Add a receipt</Box>
      <Box x={32} y={212} w={326} h={64} className="text-sm leading-snug text-tal-plum-soft">Snap a photo or upload a PDF and AI will fill in supplier, date, amount, GST and category for you. You confirm before saving.</Box>
      {[{ y: 290, t: "Take a photo", s: "Use camera", i: <CameraIcon s={28} /> }, { y: 430, t: "Upload a file", s: "Image or PDF", i: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> }].map((b) => (
        <Box key={b.t} x={32} y={b.y} w={326} h={128} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-tal-line bg-tal-cream-soft/40">
          {b.i}<span className="font-medium">{b.t}</span><span className="text-xs text-tal-plum-soft">{b.s}</span>
        </Box>
      ))}
      <Box x={32} y={580} w={326} h={20} className="text-center text-sm text-tal-plum-soft">Skip AI and enter manually</Box>
    </Page>
  )
}

// The phone's camera, pointed at the receipt on the kitchen bench.
function Camera() {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <StatusBar dark />
      <Box x={0} y={44} w={W} h={50} className="flex items-center justify-between px-6"><Zap className="h-5 w-5" /><span className="rounded-full bg-white/15 px-3 py-1 text-xs">HDR</span></Box>
      <Box x={0} y={94} w={W} h={560} className="overflow-hidden bg-gradient-to-br from-[#b08d63] via-[#c9a77c] to-[#8f6e4a]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(92deg, transparent 0 22px, rgba(60,35,10,.35) 22px 24px)" }} />
        <div className="absolute" style={{ left: 80, top: 34, transform: "rotate(-3deg)" }}><PaperReceipt /></div>
        {/* focus brackets */}
        {[[60, 24, "border-l-2 border-t-2"], [306, 24, "border-r-2 border-t-2"], [60, 512, "border-b-2 border-l-2"], [306, 512, "border-b-2 border-r-2"]].map(([x, y, c]) => (
          <span key={`${x}-${y}`} className={`absolute h-6 w-6 border-yellow-300 ${c}`} style={{ left: x as number, top: y as number }} />
        ))}
      </Box>
      <Box x={0} y={668} w={W} h={24} className="flex justify-center gap-6 text-xs font-semibold tracking-widest"><span className="text-white/60">VIDEO</span><span className="text-yellow-300">PHOTO</span><span className="text-white/60">PORTRAIT</span></Box>
      <Box x={156} y={712} w={78} h={78} className="flex items-center justify-center rounded-full border-4 border-white"><span className="h-[62px] w-[62px] rounded-full bg-white" /></Box>
      <Box x={32} y={730} w={60} h={40} className="flex items-center text-base">Cancel</Box>
    </div>
  )
}

function Scanning() {
  return (
    <Page>
      <Top />
      <Crumbs items={["Dashboard", "Receipts", "Add"]} />
      <Box x={8} y={148} w={374} h={130} className="rounded-2xl border border-tal-line bg-white p-8 text-center">
        <motion.div className="mb-2" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>Reading your receipt…</motion.div>
        <p className="text-sm text-tal-plum-soft">This usually takes a few seconds.</p>
      </Box>
    </Page>
  )
}

// ── 3. Confirm receipt details (tall, scrolled) ──────────────────────────────

const FORM_H = 1750
const FIELDS: { l: string; v?: string; ph?: string }[] = [
  { l: "Date *", v: "17/11/2026" }, { l: "Amount (incl. GST) *", v: "67.47" }, { l: "Supplier", v: "Northside Fresh Market" },
  { l: "ABN", v: "12 345 678 901" }, { l: "Description", v: "Groceries — fruit, veg, meat, dairy, household" }, { l: "Category", v: "Groceries ▾" },
  { l: "GST amount", v: "2.37" }, { l: "GST claimable", v: "No ▾" }, { l: "Payment method", v: "Visa (EFTPOS)" },
  { l: "Invoice / receipt no.", v: "004821" }, { l: "Business purpose", ph: "e.g. Client lunch, home office supplies" }, { l: "Work-related %", ph: "0–100" },
]
const FY = (n: number) => 420 + n * 64
const FILE_Y = 1244
const OPTS = [
  { v: "needs_checking", t: "Needs checking", h: "Come back and confirm the details later." },
  { v: "personal", t: "Personal / not for tax", h: "Just keeping the record. Excluded from tax totals." },
  { v: "ready", t: "Ready for accountant", h: "Reviewed and business/tax-relevant." },
]
const OPT_Y = (n: number) => FILE_Y + 22 + n * 72

function Confirm({ filed }: { filed?: boolean }) {
  return (
    <Page h={FORM_H}>
      <Crumbs items={["Dashboard", "Receipts", "Add"]} />
      <Box x={8} y={148} w={374} h={1580} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={32} y={170} w={326} h={32} className="font-display text-2xl">Confirm receipt details</Box>
      <Box x={32} y={208} w={160} h={20} className="flex items-center"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-800">AI confidence: high</span></Box>
      <Box x={32} y={236} w={326} h={56} className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] italic leading-snug text-violet-900">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</Box>
      <Box x={32} y={304} w={326} h={44} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-tal-cream-soft/50 px-3 text-xs text-tal-plum-soft">
        <span>🔒 Original image kept:</span><span className="font-medium text-tal-plum">IMG_4821.jpg</span><span>(412 KB)</span>
      </Box>
      <Box x={32} y={360} w={326} h={48} className="text-xs leading-snug text-tal-plum-soft">Please confirm date, supplier, amount and GST below before saving. The AI can misread; only you know what&apos;s right.</Box>
      {FIELDS.map((f, n) => (
        <Box key={f.l} x={32} y={FY(n)} w={326} h={54}>
          <div className="mb-1 text-xs text-tal-plum-soft">{f.l}</div>
          <div className={`flex h-9 items-center justify-between gap-2 rounded-xl border border-tal-line bg-white px-3 text-sm ${f.v ? "" : "text-gray-400"}`}>
            <span className="truncate">{f.v ?? f.ph}</span>
            {n === 1 && <span className="flex shrink-0 items-center gap-1.5 text-xs text-tal-plum"><span className="h-4 w-4 rounded-[3px] border border-gray-400" />Refund</span>}
          </div>
        </Box>
      ))}
      <Box x={32} y={1188} w={326} h={44}>
        <div className="mb-1 text-xs text-tal-plum-soft">Asset?</div>
        <div className="flex items-center gap-2 text-sm"><span className="h-4 w-4 rounded-[3px] border border-gray-400" />Yes, this is a depreciating asset</div>
      </Box>
      <Box x={32} y={FILE_Y} w={326} h={18} className="text-xs text-tal-plum-soft">How should we file this? *</Box>
      {OPTS.map((o, n) => {
        const on = filed && o.v === "personal"
        return (
          <Box key={o.v} x={32} y={OPT_Y(n)} w={326} h={64} className={`flex items-start gap-2 rounded-xl border p-3 ${on ? "border-black bg-tal-cream-soft shadow-sm" : "border-tal-line bg-white"}`}>
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-blue-600" : "border-gray-400"}`}>{on && <span className="h-2 w-2 rounded-full bg-blue-600" />}</span>
            <div><div className="text-sm font-medium">{o.t}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{o.h}</div></div>
          </Box>
        )
      })}
      <Box x={32} y={1484} w={326} h={100}>
        <div className="mb-1 text-xs text-tal-plum-soft">Notes</div>
        <div className="h-20 rounded-xl border border-tal-line bg-white" />
      </Box>
      <Box x={32} y={1596} w={326} h={48} className="text-xs leading-snug text-tal-plum-soft">Work-related % helps you and your accountant see what might be claimable. The Adulting Life doesn&apos;t give tax advice — always confirm deductibility with your accountant.</Box>
      <Box x={130} y={1660} w={100} h={40} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm">Start over</Box>
      <Box x={238} y={1660} w={120} h={40} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save receipt</Box>
    </Page>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const SCREENS: Record<string, ReactNode> = {
  register: <Register />,
  choose: <Choose />,
  camera: <Camera />,
  scanning: <Scanning />,
  confirm: <Confirm />,
  filed: <Confirm filed />,
  added: <Register added />,
}
const FIXED: Record<string, ReactNode> = { register: <Top />, confirm: <Top />, filed: <Top />, added: <Top /> }

const STEPS: WalkStep[] = [
  { screen: "register", caption: "Your Receipt Register", detail: "Every receipt for the financial year, by month - ready for tax time.", focus: { x: 195, y: 300, scale: 1.1 }, duration: 6000 },
  { screen: "register", caption: "Add receipt", focus: { x: 195, y: 240, scale: 1.35 }, ring: { x: 24, y: 242, w: 146, h: 40 }, click: { x: 97, y: 262 }, duration: 4500 },
  { screen: "choose", caption: "Take a photo", detail: "Or upload a photo or PDF - an emailed bill works too.", focus: { x: 195, y: 380, scale: 1.15 }, ring: { x: 32, y: 290, w: 326, h: 128 }, click: { x: 195, y: 354 }, duration: 6000 },
  { screen: "camera", caption: "Snap the receipt", detail: "Sarah's grocery shop from Northside Fresh Market.", focus: { x: 195, y: 380, scale: 1.12 }, click: { x: 195, y: 751 }, duration: 6000 },
  { screen: "scanning", caption: "AI reads it", detail: "Usually just a few seconds.", duration: 3800 },
  { screen: "confirm", caption: "Store, date and total - filled in", detail: "Check it - the AI shows how sure it is, and keeps the original photo.", focus: { x: 195, y: 470, scale: 1.12 }, ring: { x: 26, y: 414, w: 338, h: 192 }, duration: 7000 },
  { screen: "confirm", caption: "ABN, GST and category too", detail: "GST of $2.37 on the taxable items, and it's filed under Groceries.", scroll: 420, focus: { x: 195, y: 780, scale: 1.1 }, ring: { x: 26, y: FY(3) - 6, w: 338, h: 5 * 64 + 4 }, duration: 7000 },
  { screen: "confirm", caption: "Choose how to file it", detail: "Groceries aren't for tax - Personal keeps the record but leaves it out of tax totals.", scroll: 900, focus: { x: 195, y: OPT_Y(1) + 32, scale: 1.2 }, ring: { x: 32, y: OPT_Y(1), w: 326, h: 64 }, click: { x: 195, y: OPT_Y(1) + 32 }, duration: 6500 },
  { screen: "filed", caption: "Save receipt", scroll: 900, focus: { x: 250, y: 1600, scale: 1.25 }, ring: { x: 238, y: 1660, w: 120, h: 40 }, click: { x: 298, y: 1680 }, duration: 4500 },
  { screen: "added", caption: "It's in the register", detail: "Store, category, AI confidence and the photo attached - tap it any time to check or change it.", scroll: 640, focus: { x: 195, y: ROW0 + 120, scale: 1.12 }, ring: { x: 16, y: ROW0, w: 358, h: 96 }, duration: 7000 },
  { screen: "added", caption: "Your spending adds itself up", detail: "Total spent for November and the whole year, plus what's potentially deductible for your accountant.", scroll: 1096, focus: { x: 195, y: TOT_Y + 108, scale: 1.12 }, ring: { x: 8, y: TOT_Y, w: 374, h: 216 }, duration: 7000 },
  { screen: "added", caption: "And by category", detail: "Groceries now $186.09 this month - two shops. Email the register to your accountant at tax time.", scroll: 1096, focus: { x: 195, y: CAT_Y + 100, scale: 1.15 }, ring: { x: 8, y: CAT_Y, w: 374, h: 60 + 5 * 26 }, duration: 7000 },
]

export default function ReceiptsWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer device="phone" steps={STEPS} screens={SCREENS} fixed={FIXED} title="Receipts from a photo" autoStart={autoStart}
      intro={{ title: "Snap a receipt", subtitle: "AI reads the store, date, total, GST and category - and your spending adds itself up." }} />
  )
}
