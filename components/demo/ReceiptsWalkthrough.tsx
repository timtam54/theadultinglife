"use client"

// "Receipts" walkthrough for /demo (#receipts) and the Receipts page's tour button.
// Hand-built copies of the real screens with sample data for a made-up family
// (the Taylors, Brisbane) - no sign-in, no API calls. Two versions
// (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up), lg 3-column grid
//   phone    - 390 x 844, the mobile layout: header with logo, TAL AI, bell, avatar,
//              hamburger; MonthStepper (‹ month ›) instead of the month buttons;
//              Totals / By category under the list
// Copies: app/(app)/receipts/ReceiptsClient.tsx (Financial year, month buttons /
// MonthStepper, Supplier search, Category, Clear filters, Status chips, Cards /
// Table, Select all, Export view CSV / Excel / PDF, Email selected + its panel,
// the row card (status badge, category, AI confidence, 📎, delete ✕, status
// select), Totals, By category), components/EditReceiptModal.tsx,
// components/confirm-dialog.tsx, app/(app)/receipts/new/page.tsx +
// NewReceiptClient.tsx (Add a receipt, Reading your receipt…, Confirm receipt
// details, duplicate warning, How should we file this?), components/AiConsentGate
// ("scan-receipt"), components/AiDisclaimer, lib/services/receipt-scan.ts
// (categories), lib/services/receipt-csv.ts + receipt-export.ts (CSV columns,
// Excel Summary sheet, PDF summary), lib/services/receipts.ts
// emailReceiptsToAccountant (the email the accountant gets).
// The shell (sidebar, header, round buttons) is copied from OrganiserWalkthrough /
// DashboardWalkthrough. If one of those pages changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Zap } from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"
import { useWalkthroughView, type WalkthroughDevice } from "./useWalkthroughDevice"

type Rect = { x: number; y: number; w: number; h: number }

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)
const Img = ({ src, x, y, w, h, className = "rounded-xl" }: { src: string; x: number; y: number; w: number; h?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute object-cover ${className}`} style={{ left: x, top: y, width: w, height: h ?? w }} />
)
const mid = (r: Rect) => ({ x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) })
const pad = (r: Rect, p = 4): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p })
const span = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 600, speed = 70 }: { text: string; delay?: number; speed?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let i = 0
    let iv: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i += 1
        setN(i)
        if (i >= text.length && iv) clearInterval(iv)
      }, speed)
    }, delay)
    return () => { clearTimeout(t); if (iv) clearInterval(iv) }
  }, [text, delay, speed])
  return <>{text.slice(0, n)}{n < text.length && <span className="ml-px inline-block h-4 w-px animate-pulse bg-tal-plum align-middle" />}</>
}

const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n)
const r2 = (n: number) => Math.round(n * 100) / 100

// ── Icons (nav-items.tsx, layout.tsx, ReceiptsClient) ────────────────────────

const sv = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const
const st = { stroke: "currentColor", strokeWidth: 1.6 } as const
const ICONS: Record<string, ReactNode> = {
  home: <svg {...sv}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z" {...st} strokeLinejoin="round" /></svg>,
  sparkle: <svg {...sv}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" {...st} strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>,
  folder: <svg {...sv}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" {...st} strokeLinejoin="round" /></svg>,
  doc: <svg {...sv}><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" {...st} strokeLinejoin="round" /><path d="M15 3v4h4" {...st} /><path d="M9 12h6M9 16h6" {...st} strokeLinecap="round" /></svg>,
  receipt: <svg {...sv}><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3Z" {...st} strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h4" {...st} strokeLinecap="round" /></svg>,
  plane: <svg {...sv}><path d="M3 12 21 4l-4 17-5-7-9-2Z" {...st} strokeLinejoin="round" /></svg>,
  robot: <svg {...sv}><rect x="4" y="7" width="16" height="12" rx="2" {...st} /><path d="M9 12h.01M15 12h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M12 4v3M8 19v2M16 19v2" {...st} strokeLinecap="round" /></svg>,
  check: <svg {...sv}><circle cx="12" cy="12" r="9" {...st} /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  bell: <svg {...sv}><path d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z" {...st} strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" {...st} strokeLinecap="round" /></svg>,
  emergency: <svg {...sv}><path d="M12 2 3 20h18L12 2Z" {...st} strokeLinejoin="round" /><path d="M12 9v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>,
  gear: <svg {...sv}><circle cx="12" cy="12" r="3" {...st} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" {...st} strokeLinecap="round" /></svg>,
  card: <svg {...sv}><rect x="3" y="6" width="18" height="12" rx="2" {...st} /><path d="M3 10h18" {...st} /></svg>,
  map: <svg {...sv}><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11Z" {...st} strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" {...st} /></svg>,
}
const NAV = [
  { t: "Dashboard", i: "home" }, { t: "Setup guide", i: "sparkle" }, { t: "The Adulting Life Organiser", i: "folder" },
  { t: "Documents", i: "doc" }, { t: "Receipts", i: "receipt", badge: "New" }, { t: "Peace of Mind Planner", i: "doc" },
  { t: "Learn", i: "plane", badge: "New" }, { t: "TAL AI", i: "robot" }, { t: "Tasks", i: "check" }, { t: "Reminders", i: "bell" },
  { t: "Emergency", i: "emergency" }, { t: "Settings", i: "gear" }, { t: "Subscription", i: "card" }, { t: "Maps", i: "map" },
]
const ACTIVE_NAV = 4 // Receipts
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
const TalAiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
const Avatar = ({ size = 36 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white" style={{ width: size, height: size }}>S</span>
)
const CameraIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)
const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const XIcon = ({ s = 18, w = 2.5 }: { s?: number; w?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
)
const Tick = ({ on }: { on?: boolean }) => (
  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-400 bg-white"}`}>
    {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
  </span>
)

// The two round buttons, bottom right: HelpButton (right-6) and the tour compass
// (right 1.5rem + 72px), which plays this page's walkthrough.
function Fabs({ y, right }: { y: number; right: number }) {
  return (
    <>
      <Box x={right - 56} y={y} w={56} h={56} className="flex items-center justify-center rounded-full text-tal-plum shadow-xl">
        <span className="absolute inset-0 rounded-full border border-white/50" style={{ background: "linear-gradient(135deg, rgba(253,224,71,0.95) 0%, rgba(251,191,36,0.95) 55%, rgba(245,158,11,0.95) 100%)" }} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" opacity="0.55" /><path d="M9.4 9.2a2.6 2.6 0 015.05.85c0 1.35-.9 1.8-1.75 2.25-.7.37-1.2.72-1.2 1.55v.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><circle cx="11.5" cy="17.1" r="1.1" fill="currentColor" /></svg>
      </Box>
      <Box x={right - 128} y={y} w={56} h={56} className="flex items-center justify-center rounded-full text-white shadow-xl">
        <span className="absolute inset-0 rounded-full border border-white/40" style={{ background: "linear-gradient(135deg, rgba(30,58,138,0.95) 0%, rgba(37,99,235,0.95) 55%, rgba(2,132,199,0.95) 100%)" }} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.65" /><path d="M15 9l-2 5-5 2 2-5 5-2z" fill="currentColor" /></svg>
      </Box>
    </>
  )
}

// ── Sample data (Sarah Taylor's receipts, 2026–27) ───────────────────────────

const MONTHS = [
  { n: 7, label: "July" }, { n: 8, label: "August" }, { n: 9, label: "September" }, { n: 10, label: "October" },
  { n: 11, label: "November" }, { n: 12, label: "December" }, { n: 1, label: "January" }, { n: 2, label: "February" },
  { n: 3, label: "March" }, { n: 4, label: "April" }, { n: 5, label: "May" }, { n: 6, label: "June" },
]
const monthLabel = (m: number) => MONTHS.find((x) => x.n === m)?.label ?? String(m)
const monthOf = (d: string) => Number(d.slice(5, 7))

type St = "needs_checking" | "personal" | "ready"
type Conf = "high" | "medium" | "low"
interface Rec {
  id: string; s: string; st: St; cat: string; ai?: Conf; d: string; pay?: string; desc?: string; amt: number
  pct?: number; file?: "jpeg" | "pdf"; abn?: string; gst?: number; gstc?: boolean; inv?: string; purpose?: string; notes?: string
}
const statusLabel = (s: St) => (s === "needs_checking" ? "Needs checking" : s === "personal" ? "Personal / not for tax" : "Ready for accountant")

const BASE_RECS: Rec[] = [
  { id: "se-nov", s: "Southbank Energy", st: "personal", cat: "Utilities", ai: "high", d: "2026-11-12", pay: "Direct debit", desc: "Electricity bill Aug–Oct", amt: 318.2, file: "pdf" },
  { id: "gf-nov", s: "Greenway Fuel", st: "needs_checking", cat: "Motor Vehicle", ai: "medium", d: "2026-11-10", pay: "Visa", desc: "Unleaded 52.4L", amt: 96.4, file: "jpeg", abn: "88 123 456 789", gst: 8.76, gstc: true, inv: "TX-88213" },
  { id: "ro-nov", s: "Riverbend Office Supplies", st: "ready", cat: "Home Office", ai: "high", d: "2026-11-06", pay: "Visa", desc: "Desk lamp and printer paper", amt: 89.95, pct: 100, file: "jpeg" },
  { id: "bp-nov", s: "Bayside Pharmacy", st: "personal", cat: "Health/Medical", d: "2026-11-02", pay: "Mastercard", desc: "Prescriptions", amt: 38.5 },
  { id: "nf-oct", s: "Northside Fresh Market", st: "personal", cat: "Groceries", ai: "high", d: "2026-10-27", pay: "Visa", desc: "Weekly groceries", amt: 142.1, file: "jpeg" },
  { id: "gf-oct", s: "Greenway Fuel", st: "ready", cat: "Motor Vehicle", ai: "high", d: "2026-10-15", pay: "Visa", desc: "Unleaded 48.1L", amt: 88.2, pct: 40, file: "jpeg" },
  { id: "bt-oct", s: "Brisbane Tech Hub", st: "ready", cat: "Work Equipment", ai: "high", d: "2026-10-04", pay: "Mastercard", desc: "Laptop stand and keyboard", amt: 249, pct: 100, file: "jpeg" },
  { id: "lc-sep", s: "Lakeside Café", st: "personal", cat: "Entertainment", ai: "high", d: "2026-09-20", pay: "Visa", desc: "Leo's birthday lunch", amt: 46.8, file: "jpeg" },
  { id: "ql-sep", s: "Queensland Learning Co", st: "ready", cat: "Education", ai: "high", d: "2026-09-08", pay: "Visa", desc: "Online bookkeeping course", amt: 395, pct: 100, file: "pdf" },
  { id: "nf-aug", s: "Northside Fresh Market", st: "personal", cat: "Groceries", ai: "high", d: "2026-08-23", pay: "Visa", desc: "Weekly groceries", amt: 131.55, file: "jpeg" },
  { id: "rw-aug", s: "Redgum Workwear", st: "ready", cat: "Uniform/PPE", ai: "medium", d: "2026-08-11", pay: "Visa", desc: "Steel-cap boots", amt: 129, pct: 100, file: "jpeg" },
  { id: "cp-jul", s: "City Parking Co", st: "needs_checking", cat: "Travel", ai: "low", d: "2026-07-28", pay: "Visa", desc: "Parking — client meeting", amt: 24, file: "jpeg" },
  { id: "se-jul", s: "Southbank Energy", st: "personal", cat: "Utilities", ai: "high", d: "2026-07-19", pay: "Direct debit", desc: "Electricity bill May–Jul", amt: 296.4, file: "pdf" },
  { id: "cc-jul", s: "Coral Coast Rescue Fund", st: "ready", cat: "Donations", ai: "high", d: "2026-07-05", pay: "Visa", desc: "Tax-deductible donation", amt: 50, pct: 100, file: "jpeg" },
]
const NEW_REC: Rec = { id: "nf-nov", s: "Northside Fresh Market", st: "personal", cat: "Groceries", ai: "high", d: "2026-11-17", pay: "Visa (EFTPOS)", desc: "Groceries — fruit, veg, meat, dairy, household", amt: 67.47, file: "jpeg", abn: "12 345 678 901", gst: 2.37, gstc: false, inv: "004821" }
const GREEN = "gf-nov"
const GREEN_EDIT = { pct: 40, purpose: "Driving to client sites", notes: "Logbook: 40% work use" }
const ACCOUNTANT = "lisa@brightbooks.example.com"
const NOTE = "Hi Lisa, November's receipts. The fuel is 40% work use - logbook attached last month. Thanks, Sarah"

// 0 = before adding the grocery receipt, 1 = added, 2 = Greenway Fuel edited to Ready / 40%.
type Stage = 0 | 1 | 2
function recsAt(stage: Stage): Rec[] {
  const list = BASE_RECS.map((r) => (stage >= 2 && r.id === GREEN ? { ...r, st: "ready" as St, ...GREEN_EDIT } : r))
  if (stage >= 1) list.push(NEW_REC)
  return list.sort((a, b) => (a.d < b.d ? 1 : -1))
}
const dedOf = (r: Rec) => (r.pct ? r2((r.amt * r.pct) / 100) : 0)

interface View { stage: Stage; month: number | null; sup?: string; cat?: string; status?: St | "all" }
// Mirrors ReceiptsClient: counts, filters and totals all come from the
// receipts the server sent for the chosen year (and month).
function compute(v: View) {
  const receipts = recsAt(v.stage).filter((r) => v.month == null || monthOf(r.d) === v.month)
  const monthCounts = new Map<number, number>()
  for (const r of receipts) monthCounts.set(monthOf(r.d), (monthCounts.get(monthOf(r.d)) ?? 0) + 1)
  const statusCounts: Record<St, number> = { needs_checking: 0, personal: 0, ready: 0 }
  for (const r of receipts) statusCounts[r.st] += 1
  const cats = Array.from(new Set(receipts.map((r) => r.cat))).sort()
  const sup = (v.sup ?? "").trim().toLowerCase()
  const status = v.status ?? "all"
  const visible = receipts.filter((r) => (status === "all" || r.st === status) && (!v.cat || r.cat === v.cat) && (!sup || r.s.toLowerCase().includes(sup)))
  const active = (status !== "all" ? 1 : 0) + (v.cat ? 1 : 0) + (sup ? 1 : 0)
  const sum = (list: Rec[]) => {
    let total = 0, ded = 0
    const by = new Map<string, { total: number; count: number }>()
    for (const r of list) {
      total += r.amt
      if (r.st !== "personal") ded += dedOf(r)
      const c = by.get(r.cat) ?? { total: 0, count: 0 }
      by.set(r.cat, { total: c.total + r.amt, count: c.count + 1 })
    }
    const categories = Array.from(by.entries()).map(([category, x]) => ({ category, ...x })).sort((a, b) => b.total - a.total)
    return { total: r2(total), ded: r2(ded), categories }
  }
  return { receipts, monthCounts, statusCounts, cats, visible, active, status, totals: sum(visible), rollup: sum(receipts) }
}

// ── Layout of the register (both devices) ────────────────────────────────────

const L = 272 // content left (sidebar 240 + md:px-8)
const CW = 896 // content width
const chipW = (t: string) => Math.round(26 + t.length * 6.4)
function flow(ws: number[], x0: number, y0: number, maxW: number, gap: number, h: number, rowGap: number, firstX = x0): Rect[] {
  const out: Rect[] = []
  let x = firstX, y = y0
  for (const w of ws) {
    if (x + w > x0 + maxW && x > x0) { x = x0; y += h + rowGap }
    out.push({ x, y, w, h })
    x += w + gap
  }
  return out
}
const withCount = (label: string, n: number) => (n > 0 ? `${label} (${n})` : label)

interface Reg extends View {
  table?: boolean; sel?: boolean; email?: "open" | "sent"; hl?: string
  fyOpen?: boolean; catOpen?: boolean; monthOpen?: boolean; menu?: string; del?: string; typing?: boolean; fabs?: boolean
}
type TbKey = "view" | "selN" | "clearSel" | "selAll" | "exp" | "email"

function lay(v: Reg, phone: boolean) {
  const c = compute(v)
  const X = phone ? 8 : L, W = phone ? 374 : CW
  const crumbs = { x: X, y: phone ? 116 : 72, w: W, h: 20 }
  const band = phone ? { x: 8, y: 148, w: 374, h: 162 } : { x: L, y: 104, w: CW, h: 84 }
  const add = phone ? { x: 32, y: 254, w: 140, h: 40 } : { x: L + CW - 24 - 136, y: 120, w: 136, h: 40 }
  let y = band.y + band.h + 24
  const fyLabel = { x: X, y, w: 92, h: 36 }
  const fySel = { x: X + 104, y, w: 92, h: 36 }
  y += 48
  const monthLabels = ["Full financial year", ...MONTHS.map((m) => withCount(m.label, c.monthCounts.get(m.n) ?? 0))]
  let months: Rect[] = []
  const stepper = { prev: { x: 8, y, w: 36, h: 36 }, sel: { x: 52, y, w: 286, h: 36 }, next: { x: 346, y, w: 36, h: 36 } }
  if (phone) y += 36
  else { months = flow(monthLabels.map(chipW), X, y, W, 4, 32, 4); y = months[months.length - 1].y + 32 }
  y += 16
  const supLabel = { x: X, y, w: 56, h: 36 }
  const supInput = { x: X + 64, y, w: phone ? 180 : 200, h: 36 }
  const catLabel = { x: supInput.x + supInput.w + 16, y, w: 60, h: 36 }
  let catSel: Rect
  let clear: Rect | null = null
  if (phone) { y += 44; catSel = { x: 8, y, w: 150, h: 36 }; if (c.active) clear = { x: 166, y, w: 124, h: 36 } }
  else { catSel = { x: catLabel.x + 68, y, w: 150, h: 36 }; if (c.active) clear = { x: catSel.x + catSel.w + 8, y, w: 124, h: 36 } }
  y += 48
  const stLabels = [
    { v: "all" as const, label: "All", n: c.receipts.length },
    { v: "needs_checking" as const, label: "Needs checking", n: c.statusCounts.needs_checking },
    { v: "ready" as const, label: "Ready for accountant", n: c.statusCounts.ready },
    { v: "personal" as const, label: "Personal", n: c.statusCounts.personal },
  ]
  const statusLabelR = { x: X, y, w: 44, h: 32 }
  const statusChips = flow(stLabels.map((s) => chipW(withCount(s.label, s.n))), X, y, W, 8, 32, 8, X + 52)
  y = statusChips[statusChips.length - 1].y + 48

  const gridY = y
  const cardX = X, cardW = phone ? 374 : 592
  const ix = cardX + 16, iw = cardW - 32
  const count = { x: ix, y: gridY + 16, w: iw, h: 20 }
  const tbDefs: [TbKey, number][] = [["view", 104], ...(v.sel ? ([["selN", 62], ["clearSel", 46]] as [TbKey, number][]) : []), ["selAll", 66], ["exp", 172], ["email", v.sel ? 112 : 100]]
  const tbR = flow(tbDefs.map((d) => d[1]), ix, gridY + 44, iw, 8, 32, 8)
  const tb = Object.fromEntries(tbDefs.map((d, n) => [d[0], tbR[n]])) as Record<TbKey, Rect>
  const tbEnd = tbR[tbR.length - 1].y + 32
  const hint = { x: ix, y: tbEnd + 8, w: iw, h: phone ? 44 : 30 }
  let ly = hint.y + hint.h + 12
  let email: Rect | null = null
  if (v.email) {
    const eh = phone ? 248 + (v.email === "sent" ? 48 : 0) : 172 + (v.email === "sent" ? 28 : 0)
    email = { x: ix, y: ly, w: iw, h: eh }
    ly += eh + 16
  }
  const RH = phone ? 176 : 104
  let rows: Rect[] = []
  let tableHead: Rect | null = null
  let empty: Rect | null = null
  const n = c.visible.length
  if (n === 0) { empty = { x: ix, y: ly, w: iw, h: 124 }; ly += 124 }
  else if (v.table) {
    tableHead = { x: cardX, y: ly, w: cardW, h: 33 }
    rows = c.visible.map((_, k) => ({ x: cardX, y: ly + 33 + k * 53, w: cardW, h: 53 }))
    ly += 33 + n * 53
  } else {
    ly += 4
    rows = c.visible.map((_, k) => ({ x: ix, y: ly + k * (RH + 8), w: iw, h: RH }))
    ly += n * (RH + 8)
  }
  const card = { x: cardX, y: gridY, w: cardW, h: ly - gridY + 16 }
  const block = c.active > 0 || v.month != null
  const tot = phone ? { x: 8, y: card.y + card.h + 16, w: 374, h: block ? 246 : 190 } : { x: 880, y: gridY, w: 288, h: block ? 260 : 204 }
  const catsCard = { x: tot.x, y: tot.y + tot.h + 12, w: tot.w, h: 64 + Math.max(1, c.totals.categories.length) * 26 }
  const h = Math.max(phone ? 844 : 760, Math.max(card.y + card.h, catsCard.y + catsCard.h) + 40)
  const rowSel = (r: Rect): Rect => ({ x: r.x + r.w - 16 - 112, y: r.y + 64, w: 112, h: 28 })
  const rowDel = (r: Rect): Rect => ({ x: r.x + r.w - 16 - 32, y: r.y + 12, w: 32, h: 32 })
  const rowOf = (id: string) => rows[Math.max(0, c.visible.findIndex((r) => r.id === id))]
  return { c, h, crumbs, band, add, fyLabel, fySel, months, monthLabels, stepper, supLabel, supInput, catLabel, catSel, clear, statusLabelR, stLabels, statusChips, card, count, tb, hint, email, rows, tableHead, empty, tot, catsCard, block, rowSel, rowDel, rowOf }
}
type Lay = ReturnType<typeof lay>

// ── Shells ───────────────────────────────────────────────────────────────────

const SB = 240
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const FAB_Y = 680
const FAB_R = 1176

function DShell({ children, h = 760, fabs }: { children: ReactNode; h?: number; fabs?: boolean }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37} className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === ACTIVE_NAV ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === ACTIVE_NAV ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm"><span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span></Box>
      <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
      {fabs && <Fabs y={FAB_Y} right={FAB_R} />}
    </div>
  )
}

const PW = 390
const P_FAB_Y = 764
const P_FAB_R = 366
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const StatusBar = ({ dark }: { dark?: boolean }) => (
  <Box x={0} y={0} w={PW} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${dark ? "bg-black text-white" : "text-tal-plum-dark"}`}>
    <span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
function PHeader() {
  return (
    <>
      <Box x={0} y={44} w={PW} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box x={218} y={56} w={40} h={40} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box x={262} y={58} w={64} h={40} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}
const PPage = ({ children, h = 844, fabs }: { children: ReactNode; h?: number; fabs?: boolean }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
    <StatusBar />
    <PHeader />
    {children}
    {fabs && <Fabs y={P_FAB_Y} right={P_FAB_R} />}
  </div>
)
const Shell = ({ phone, h, fabs, children }: { phone: boolean; h?: number; fabs?: boolean; children: ReactNode }) =>
  phone ? <PPage h={h} fabs={fabs}>{children}</PPage> : <DShell h={h} fabs={fabs}>{children}</DShell>

const Crumbs = ({ r, items }: { r: Rect; items: string[] }) => (
  <Box {...r} className="flex items-center gap-2 text-sm text-tal-plum-soft">
    {items.map((t, n) => <span key={t} className="flex items-center gap-2">{n > 0 && <span className="text-tal-plum-soft/50">/</span>}{t}</span>)}
  </Box>
)
const Dim = ({ h }: { h: number }) => <div className="absolute left-0 top-0 w-full bg-black/40" style={{ height: h }} />
const chipCls = (on?: boolean) => `flex items-center justify-center whitespace-nowrap rounded-full border text-xs ${on ? "border-black bg-black text-white" : "border-tal-line bg-white text-tal-plum"}`
const Chip = ({ r, label, n, on }: { r: Rect; label: string; n?: number; on?: boolean }) => (
  <Box {...r} className={chipCls(on)}>{label}{n ? <span className={`ml-1 ${on ? "text-white/80" : "text-tal-plum-soft"}`}>({n})</span> : null}</Box>
)
// A native <select> drawn open: the list of options under it.
function OptionList({ x, y, w, options, on }: { x: number; y: number; w: number; options: string[]; on?: string }) {
  return (
    <Box x={x} y={y} w={w} h={options.length * 28 + 8} className="z-20 rounded-lg border border-gray-300 bg-white py-1 text-sm shadow-xl">
      {options.map((o) => <div key={o} className={`flex h-7 items-center px-3 ${o === on ? "bg-blue-600 text-white" : "text-gray-900"}`}>{o}</div>)}
    </Box>
  )
}

// ── The register (ReceiptsClient) ────────────────────────────────────────────

const statusBadge = (s: St) => (s === "ready" ? "bg-emerald-100 text-emerald-800" : s === "personal" ? "bg-tal-cream text-tal-plum-soft" : "bg-amber-100 text-amber-800")
const aiBadge = (a: Conf) => (a === "high" ? "bg-emerald-100 text-emerald-800" : a === "medium" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
const rowStatus = (s: St) => (s === "needs_checking" ? "Needs checking" : s === "personal" ? "Personal" : "Ready")

function RowCard({ r, box, checked, hl }: { r: Rec; box: Rect; checked?: boolean; hl?: boolean }) {
  const ded = r.st !== "personal" ? dedOf(r) : 0
  return (
    <Box {...box} className={`flex items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 ${hl ? "border-emerald-400 bg-emerald-50/60" : "border-tal-line bg-white"}`}>
      <span className="mt-1"><Tick on={checked} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-tal-plum">{r.s}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${statusBadge(r.st)}`}>{r.st === "needs_checking" ? "Needs check" : r.st === "personal" ? "Personal" : "Ready"}</span>
          <span className="rounded-full bg-tal-cream-soft px-2 py-0.5 text-xs text-tal-plum-soft">{r.cat}</span>
          {r.ai && <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${aiBadge(r.ai)}`}>AI {r.ai}</span>}
          {r.file && <span className="text-[10px] text-tal-plum-soft">📎</span>}
        </div>
        <div className="mt-0.5 text-xs text-tal-plum-soft">{r.d} · {monthLabel(monthOf(r.d))} {r.pay ? `· ${r.pay}` : ""}</div>
        {r.desc && <div className="mt-1 truncate text-sm text-tal-plum-soft">{r.desc}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-2"><span className="font-medium text-tal-plum">{aud(r.amt)}</span><span className="flex h-8 w-8 items-center justify-center rounded-full text-red-600"><XIcon /></span></div>
        <div className="h-4 text-xs text-emerald-700">{ded > 0 ? `${aud(ded)} potentially` : ""}</div>
        <span className="mt-1 inline-flex h-7 w-[112px] items-center justify-between rounded-md border border-tal-line bg-white px-1.5 text-[11px] text-tal-plum">{rowStatus(r.st)}<span className="text-[9px]">▾</span></span>
      </div>
    </Box>
  )
}

function Register({ v, phone, dlgTop = 0 }: { v: Reg; phone: boolean; dlgTop?: number }) {
  const g = lay(v, phone)
  const c = g.c
  const monthText = v.month ? monthLabel(v.month) : "full financial year"
  const menuRow = v.menu ? g.rowOf(v.menu) : null
  const delRow = v.del ? c.visible.find((r) => r.id === v.del) : null
  return (
    <Shell phone={phone} h={g.h} fabs={v.fabs}>
      <Crumbs r={g.crumbs} items={["Dashboard", "Receipts"]} />
      {/* Header band */}
      <Box {...g.band} className="rounded-2xl bg-black shadow-md" />
      <Box x={g.band.x + 24} y={g.band.y + 16} w={36} h={36} className="flex items-center justify-center rounded-xl bg-white/15 text-white"><CameraIcon /></Box>
      <Box x={g.band.x + 72} y={g.band.y + 14} w={phone ? 280 : 560} h={phone ? 76 : 56} className="text-white">
        <div className="font-display text-2xl leading-tight">Receipt Register</div>
        <p className="mt-1 text-sm text-white/80">Photograph or upload a receipt and check the details.</p>
      </Box>
      <Box {...g.add} className="flex items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-tal-plum"><PlusIcon s={16} />Add receipt</Box>

      {/* Financial year + months */}
      <Box {...g.fyLabel} className="flex items-center text-sm text-tal-plum-soft">Financial year</Box>
      <Box {...g.fySel} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-3 text-sm">2026–27<span className="text-[10px]">▾</span></Box>
      {phone ? (
        <>
          <Box {...g.stepper.prev} className={`flex items-center justify-center rounded-xl border border-tal-line bg-white text-tal-plum ${v.month == null ? "opacity-40" : ""}`}>‹</Box>
          <Box {...g.stepper.sel} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-3 text-sm">{v.month ? withCount(monthLabel(v.month), c.monthCounts.get(v.month) ?? 0) : "Full financial year"}<span className="text-[10px]">▾</span></Box>
          <Box {...g.stepper.next} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-tal-plum">›</Box>
        </>
      ) : (
        g.months.map((r, k) => {
          const m = k === 0 ? null : MONTHS[k - 1].n
          const n = m == null ? 0 : c.monthCounts.get(m) ?? 0
          return <Chip key={k} r={r} label={k === 0 ? "Full financial year" : MONTHS[k - 1].label} n={n} on={v.month === m} />
        })
      )}

      {/* Supplier / Category / Clear filters */}
      <Box {...g.supLabel} className="flex items-center text-sm text-tal-plum-soft">Supplier</Box>
      <Box {...g.supInput} className={`flex items-center rounded-xl border bg-white px-3 text-sm ${v.sup ? "border-tal-plum/50 text-tal-plum" : "border-tal-line text-gray-400"}`}>
        {v.sup ? (v.typing ? <Typed text={v.sup} /> : v.sup) : "Search supplier…"}
      </Box>
      {v.sup && v.typing && !phone && <OptionList x={g.supInput.x} y={g.supInput.y + 40} w={g.supInput.w} options={c.cats.length ? Array.from(new Set(c.receipts.map((r) => r.s))).filter((s) => s.toLowerCase().includes(v.sup!.toLowerCase())) : []} />}
      <Box {...g.catLabel} className="flex items-center text-sm text-tal-plum-soft">Category</Box>
      <Box {...g.catSel} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-3 text-sm">{v.cat || "All"}<span className="text-[10px]">▾</span></Box>
      {g.clear && <Box {...g.clear} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-xs">Clear filters ({c.active})</Box>}

      {/* Status chips */}
      <Box {...g.statusLabelR} className="flex items-center text-sm text-tal-plum-soft">Status</Box>
      {g.stLabels.map((s, k) => <Chip key={s.v} r={g.statusChips[k]} label={s.label} n={s.n} on={c.status === s.v} />)}

      {/* The list card */}
      <Box {...g.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box {...g.count} className="text-sm text-tal-plum-soft">{c.visible.length} receipt{c.visible.length === 1 ? "" : "s"} — {monthText}{c.status !== "all" && <> · {statusLabel(c.status)}</>}</Box>
      <Box {...g.tb.view} className="flex items-center gap-0.5 rounded-lg border border-tal-line bg-white p-0.5 text-xs font-medium">
        <span className={`flex h-7 flex-1 items-center justify-center rounded-md ${!v.table ? "bg-black text-white" : ""}`}>Cards</span>
        <span className={`flex h-7 flex-1 items-center justify-center rounded-md ${v.table ? "bg-black text-white" : ""}`}>Table</span>
      </Box>
      {v.sel && <Box {...g.tb.selN} className="flex items-center text-sm">{c.visible.length} selected</Box>}
      {v.sel && <Box {...g.tb.clearSel} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-xs">Clear</Box>}
      <Box {...g.tb.selAll} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-xs">Select all</Box>
      <Box {...g.tb.exp} className="flex items-center gap-1 rounded-lg border border-tal-line bg-white p-0.5 text-xs">
        <span className="whitespace-nowrap px-1.5 text-[10px] text-tal-plum-soft">Export view</span><span className="px-1.5">CSV</span><span className="px-1.5">Excel</span><span className="px-1.5">PDF</span>
      </Box>
      <Box {...g.tb.email} className={`flex items-center justify-center rounded-lg bg-black text-xs text-white ${v.sel ? "" : "opacity-40"}`}>{v.sel ? `Email ${c.visible.length} selected` : "Email selected"}</Box>
      <Box {...g.hint} className="text-[11px] leading-snug text-tal-plum-soft">
        {v.sel ? `Emails a CSV register + ${c.visible.length} attached receipt files to the address you provide. Not sent anywhere else.` : "Tick receipts on the left to email them to your accountant, or use Export view to download the full filtered list."}
      </Box>
      {g.email && (
        <Box {...g.email} className="space-y-2 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-3">
          <div className="text-xs text-tal-plum-soft">Sends a CSV register of the {c.visible.length} selected receipts plus each attached photo/PDF to the address below. Typically your accountant — the file isn&apos;t sent to the ATO.</div>
          <div className={`flex gap-2 ${phone ? "flex-col" : ""}`}>
            <div className="flex h-9 flex-1 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">{v.email === "open" ? <Typed text={ACCOUNTANT} speed={45} /> : ACCOUNTANT}</div>
            <div className="flex h-9 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white">Send {c.visible.length} receipts</div>
          </div>
          <div className="h-16 rounded-xl border border-tal-line bg-white px-3 py-2 text-sm leading-snug">{v.email === "open" ? <Typed text={NOTE} delay={3600} speed={22} /> : NOTE}</div>
          {v.email === "sent" && <div className="text-sm text-tal-plum">Sent {c.visible.length} receipt(s) to {ACCOUNTANT}.</div>}
        </Box>
      )}
      {g.empty && (
        <Box {...g.empty} className="flex flex-col items-center justify-center text-center">
          <p className="mb-3 text-tal-plum-soft">{c.status === "all" ? `No receipts yet for this ${v.month ? "month" : "financial year"}.` : `No "${statusLabel(c.status)}" receipts here.`}</p>
          <span className="flex h-9 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">Add your first receipt</span>
        </Box>
      )}
      {g.tableHead && <ReceiptTable g={g} sel={v.sel} />}
      {!v.table && c.visible.map((r, k) => <RowCard key={r.id} r={r} box={g.rows[k]} checked={v.sel} hl={v.hl === r.id} />)}

      {/* Totals + By category */}
      <Box {...g.tot} className="rounded-2xl border border-tal-line bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between"><span className="font-display text-lg">Totals</span><span className="text-[10px] uppercase tracking-wider text-tal-plum-soft">{g.block ? "filtered view" : "whole year"}</span></div>
        <div className="mb-1 flex items-baseline justify-between"><span className="text-sm text-tal-plum-soft">Total spent</span><span className="font-medium">{aud(c.totals.total)}</span></div>
        <div className="flex items-baseline justify-between"><span className="text-sm text-tal-plum-soft">Potentially deductible</span><span className="font-medium text-emerald-700">{aud(c.totals.ded)}</span></div>
        {g.block && (
          <div className="mt-3 space-y-0.5 border-t border-tal-line pt-3 text-[11px] text-tal-plum-soft">
            <div className="flex justify-between"><span>Whole year — total spent</span><span>{aud(c.rollup.total)}</span></div>
            <div className="flex justify-between"><span>Whole year — potentially deductible</span><span>{aud(c.rollup.ded)}</span></div>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-snug text-tal-plum-soft">&ldquo;Potentially deductible&rdquo; is amount × work-related % on receipts marked <em>Ready for accountant</em>. Personal receipts are excluded. This isn&apos;t tax advice. Confirm what&apos;s actually claimable with your tax agent.</p>
      </Box>
      <Box {...g.catsCard} className="rounded-2xl border border-tal-line bg-white p-4">
        <div className="mb-2 font-display text-lg">By category</div>
        {c.totals.categories.length === 0 ? <p className="text-sm text-tal-plum-soft">Nothing to show yet.</p> : c.totals.categories.map((x) => (
          <div key={x.category} className={`flex h-[26px] items-center justify-between text-sm ${v.hl === NEW_REC.id && x.category === "Groceries" ? "-mx-2 rounded-md bg-emerald-50 px-2" : ""}`}>
            <span>{x.category}</span><span className="text-tal-plum-soft">{aud(x.total)} <span className="text-xs">({x.count})</span></span>
          </div>
        ))}
      </Box>

      {/* Open menus and dialogs */}
      {v.fyOpen && <OptionList x={g.fySel.x} y={g.fySel.y + 40} w={120} options={["2026–27", "2025–26"]} on="2026–27" />}
      {v.catOpen && <OptionList x={g.catSel.x} y={g.catSel.y + 40} w={170} options={["All", ...c.cats]} on={v.cat || "All"} />}
      {v.monthOpen && <OptionList x={g.stepper.sel.x} y={g.stepper.sel.y + 40} w={g.stepper.sel.w} options={g.monthLabels} on={v.month ? withCount(monthLabel(v.month), c.monthCounts.get(v.month) ?? 0) : "Full financial year"} />}
      {menuRow && <OptionList x={g.rowSel(menuRow).x - 20} y={g.rowSel(menuRow).y + 32} w={150} options={["Needs checking", "Personal", "Ready"]} on={rowStatus(c.visible.find((r) => r.id === v.menu)!.st)} />}
      {delRow && (
        <>
          <Dim h={g.h} />
          <Box x={phone ? 16 : 408} y={dlgTop + (phone ? 330 : 290)} w={phone ? 358 : 384} h={150} className="rounded-2xl bg-white p-5 shadow-xl">
            <div className="font-display text-lg leading-snug">Delete this receipt?</div>
            <p className="mt-2 text-sm text-tal-plum-soft">This can&apos;t be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <span className="flex h-10 items-center rounded-xl border border-tal-line px-4 text-sm">Cancel</span>
              <span className="flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white">Delete</span>
            </div>
          </Box>
        </>
      )}
    </Shell>
  )
}
// Where the delete dialog's Cancel button lands (for the click).
const dlgCancel = (phone: boolean, top: number): Rect => (phone ? { x: 200, y: top + 330 + 90, w: 80, h: 40 } : { x: 600, y: top + 290 + 90, w: 80, h: 40 })

function ReceiptTable({ g, sel }: { g: Lay; sel?: boolean }) {
  const head = g.tableHead!
  return (
    <Box x={head.x} y={head.y} w={head.w} h={33 + g.rows.length * 53} className="overflow-hidden">
      <div style={{ width: Math.max(head.w, 560) }}>
        <div className="flex h-[33px] items-center border-b border-tal-line text-left text-[10px] uppercase tracking-widest text-tal-plum-soft">
          <span className="w-8 px-2" /><span className="w-[92px] px-2">Date</span><span className="flex-1 px-2">Supplier</span><span className="w-[110px] px-2">Category</span><span className="w-[96px] px-2">Status</span><span className="w-[84px] px-2 text-right">Amount</span><span className="w-[64px] px-2 text-right">Actions</span>
        </div>
        {g.c.visible.map((r) => {
          const ded = r.st !== "personal" ? dedOf(r) : 0
          return (
            <div key={r.id} className="flex h-[53px] items-center border-b border-tal-line text-sm">
              <span className="w-8 px-2"><Tick on={sel} /></span>
              <span className="w-[92px] whitespace-nowrap px-2 text-tal-plum-soft">{r.d}</span>
              <span className="min-w-0 flex-1 px-2"><div className="truncate font-medium">{r.s}</div>{r.desc && <div className="truncate text-xs text-tal-plum-soft">{r.desc}</div>}</span>
              <span className="w-[110px] truncate px-2 text-tal-plum-soft">{r.cat}</span>
              <span className="w-[96px] px-2"><span className="inline-flex h-7 w-[86px] items-center justify-between rounded-md border border-tal-line px-1.5 text-[11px]">{rowStatus(r.st)}<span className="text-[9px]">▾</span></span></span>
              <span className="w-[84px] whitespace-nowrap px-2 text-right"><div className="font-medium">{aud(r.amt)}</div>{ded > 0 && <div className="text-[10px] text-emerald-700">{aud(ded)} pot.</div>}</span>
              <span className="flex w-[64px] justify-end px-2 text-red-600"><span className="flex h-8 w-8 items-center justify-center"><XIcon /></span></span>
            </div>
          )
        })}
      </div>
    </Box>
  )
}

// ── Edit receipt (EditReceiptModal) ──────────────────────────────────────────

type EF = { label: string; value?: string; ph?: string; select?: boolean; span?: boolean; kind?: "asset" | "notes" | "amount" }
function editFields(r: Rec, edited: boolean): EF[] {
  return [
    { label: "Date", value: r.d.split("-").reverse().join("/") },
    { label: "Amount (incl. GST)", value: String(r.amt), kind: "amount" },
    { label: "Supplier", value: r.s },
    { label: "ABN", value: r.abn ?? "" },
    { label: "Description", value: r.desc, span: true },
    { label: "Category", value: r.cat, select: true },
    { label: "Payment method", value: r.pay },
    { label: "GST amount", value: r.gst != null ? String(r.gst) : "" },
    { label: "GST claimable", value: r.gstc == null ? "— n/a —" : r.gstc ? "Yes" : "No", select: true },
    { label: "Invoice / receipt no.", value: r.inv ?? "" },
    { label: "Work-related %", value: edited ? String(GREEN_EDIT.pct) : "", ph: "0–100" },
    { label: "Business purpose", value: edited ? GREEN_EDIT.purpose : "", ph: "e.g. Client lunch, home office supplies", span: true },
    { label: "Asset?", span: true, kind: "asset" },
    { label: "Notes", value: edited ? GREEN_EDIT.notes : "", span: true, kind: "notes" },
    { label: "Status", value: edited ? "Ready for accountant" : statusLabel(r.st), select: true, span: true },
  ]
}
// Positions of the fields inside the modal (relative to the fields' top).
function editLayout(phone: boolean, w: number) {
  const out: Rect[] = []
  let y = 0
  const colW = phone ? w : (w - 12) / 2
  let col = 0
  const fields = editFields(BASE_RECS[1], false)
  for (const f of fields) {
    const h = f.kind === "asset" ? 38 : f.kind === "notes" ? 94 : 58
    if (phone || f.span) {
      if (col === 1) { y += 70; col = 0 }
      out.push({ x: 0, y, w, h })
      y += h + 12
    } else {
      out.push({ x: col * (colW + 12), y, w: colW, h })
      if (col === 1) { y += 70; col = 0 } else col = 1
    }
  }
  return { rects: out, end: y }
}
const ED = {
  d: { x: 264, top: 38, w: 672, h: 684 },
  p: { x: 16, top: 42, w: 358, h: 760 },
}
const EDIT_OFF = { d: 196, p: 502 }
function editGeom(phone: boolean, scroll: number, off: number) {
  const m = phone ? ED.p : ED.d
  const top = scroll + m.top
  const inner = m.w - 48
  const fieldsTop = phone ? 120 : 88
  const lay2 = editLayout(phone, inner)
  const abs = (k: number): Rect => { const r = lay2.rects[k]; return { x: m.x + 24 + r.x, y: top + fieldsTop + r.y - off, w: r.w, h: r.h } }
  const btnY = top + fieldsTop + lay2.end + 12 - off
  const save = { x: m.x + m.w - 24 - 70, y: btnY, w: 70, h: 40 }
  return { m, top, abs, save, fieldsTop, lay: lay2 }
}

function EditModal({ phone, scroll, off, edited, under }: { phone: boolean; scroll: number; off: number; edited?: boolean; under: ReactNode }) {
  const g = editGeom(phone, scroll, off)
  const r = BASE_RECS.find((x) => x.id === GREEN)!
  const fields = editFields(r, !!edited)
  const pageH = phone ? 4000 : 2400
  return (
    <>
      {under}
      <Dim h={pageH} />
      <Box x={g.m.x} y={g.top} w={g.m.w} h={g.m.h} className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="absolute left-0 right-0" style={{ top: -off }}>
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-tal-plum-soft"><XIcon w={2} /></div>
          <div className="absolute left-6 pr-8 font-display text-lg text-tal-plum" style={{ top: 24 }}>Edit receipt</div>
          <p className="absolute left-6 right-6 text-xs text-tal-plum-soft" style={{ top: 56 }}>Changes are saved to your Sydney database. Attached image (if any) stays as-is.</p>
          {fields.map((f, k) => {
            const rr = g.lay.rects[k]
            return (
              <div key={f.label} className="absolute" style={{ left: 24 + rr.x, top: g.fieldsTop + rr.y, width: rr.w }}>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">{f.label}</div>
                {f.kind === "asset" ? (
                  <div className="flex items-center gap-2 text-sm"><Tick />Yes, this is a depreciating asset</div>
                ) : f.kind === "notes" ? (
                  <div className={`h-[76px] rounded-xl border border-tal-line px-3 py-2 text-sm ${edited ? "border-tal-plum/50" : ""}`}>{f.value}</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`flex h-10 flex-1 items-center justify-between rounded-xl border bg-white px-3 text-sm ${edited && (f.label === "Work-related %" || f.label === "Business purpose" || f.label === "Status") ? "border-tal-plum/60 ring-2 ring-tal-plum/20" : "border-tal-line"} ${f.value ? "" : "text-gray-400"}`}>
                      <span className="truncate">{f.value || f.ph}</span>{f.select && <span className="text-[10px] text-tal-plum">▾</span>}
                    </div>
                    {f.kind === "amount" && <span className="flex shrink-0 items-center gap-1.5 text-xs"><Tick />Refund</span>}
                  </div>
                )}
              </div>
            )
          })}
          <div className="absolute flex items-center justify-end gap-2" style={{ right: 24, top: g.fieldsTop + g.lay.end + 12 }}>
            <span className="flex h-10 items-center rounded-xl px-4 text-sm">Cancel</span>
            <span className="flex h-10 w-[70px] items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</span>
          </div>
        </div>
      </Box>
    </>
  )
}

// ── Add a receipt (receipts/new) ─────────────────────────────────────────────

const NEW_CRUMBS = ["Dashboard", "Receipts", "Add"]
function chooseGeom(phone: boolean) {
  if (phone) return { card: { x: 8, y: 148, w: 374, h: 470 }, photo: { x: 32, y: 290, w: 326, h: 128 }, upload: { x: 32, y: 430, w: 326, h: 128 }, manual: { x: 32, y: 582, w: 326, h: 20 } }
  return { card: { x: L, y: 104, w: CW, h: 324 }, photo: { x: L + 24, y: 232, w: 418, h: 128 }, upload: { x: L + 24 + 430, y: 232, w: 418, h: 128 }, manual: { x: L + 24, y: 384, w: 848, h: 20 } }
}
function Choose({ phone, consent }: { phone: boolean; consent?: boolean }) {
  const g = chooseGeom(phone)
  const cg = consentGeom(phone)
  return (
    <Shell phone={phone}>
      <Crumbs r={{ x: phone ? 8 : L, y: phone ? 116 : 72, w: 600, h: 20 }} items={NEW_CRUMBS} />
      <Box {...g.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={g.card.x + 24} y={g.card.y + 24} w={g.card.w - 48} h={36} className="font-display text-2xl">Add a receipt</Box>
      <Box x={g.card.x + 24} y={g.card.y + 64} w={phone ? 326 : 512} h={64} className="text-sm leading-snug text-tal-plum-soft">Snap a photo or upload a PDF and AI will fill in supplier, date, amount, GST and category for you. You confirm before saving.</Box>
      <Box {...g.photo} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-tal-line bg-tal-cream-soft/40"><CameraIcon s={28} /><span className="font-medium">Take a photo</span><span className="text-xs text-tal-plum-soft">Use camera</span></Box>
      <Box {...g.upload} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-tal-line bg-tal-cream-soft/40"><UploadIcon /><span className="font-medium">Upload a file</span><span className="text-xs text-tal-plum-soft">Image or PDF</span></Box>
      <Box {...g.manual} className="text-center text-sm text-tal-plum-soft">Skip AI and enter manually</Box>
      {consent && (
        <>
          <Dim h={phone ? 844 : 760} />
          <Box {...cg.box} className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-2 font-display text-lg">AI will read this receipt</div>
            <p className="mb-4 text-sm text-tal-plum-soft">The receipt image is sent to OpenAI to extract supplier, date, amount and GST. You confirm every field before it&apos;s saved. It isn&apos;t used to train their models.</p>
            <div className="mb-5 flex items-center gap-2 text-xs text-tal-plum-soft"><Tick on />Don&apos;t ask me again on this device</div>
          </Box>
          <Box {...cg.cancel} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>
          <Box {...cg.go} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Continue with AI</Box>
        </>
      )}
    </Shell>
  )
}
function consentGeom(phone: boolean) {
  const box = phone ? { x: 16, y: 270, w: 358, h: 270 } : { x: 376, y: 230, w: 448, h: 236 }
  const by = box.y + box.h - 24 - 36
  return { box, go: { x: box.x + box.w - 24 - 140, y: by, w: 140, h: 36 }, cancel: { x: box.x + box.w - 24 - 140 - 8 - 76, y: by, w: 76, h: 36 } }
}

function Scanning({ phone }: { phone: boolean }) {
  return (
    <Shell phone={phone}>
      <Crumbs r={{ x: phone ? 8 : L, y: phone ? 116 : 72, w: 600, h: 20 }} items={NEW_CRUMBS} />
      <Box x={phone ? 8 : L} y={phone ? 148 : 104} w={phone ? 374 : CW} h={120} className="rounded-2xl border border-tal-line bg-white p-8 text-center">
        <motion.div className="mb-2" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>Reading your receipt…</motion.div>
        <p className="text-sm text-tal-plum-soft">This usually takes a few seconds.</p>
      </Box>
    </Shell>
  )
}

// The paper receipt the phone photographs (and the computer uploads).
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
// The phone's camera, pointed at the receipt on the kitchen bench.
function Camera() {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <StatusBar dark />
      <Box x={0} y={44} w={PW} h={50} className="flex items-center justify-between px-6"><Zap className="h-5 w-5" /><span className="rounded-full bg-white/15 px-3 py-1 text-xs">HDR</span></Box>
      <Box x={0} y={94} w={PW} h={560} className="overflow-hidden bg-gradient-to-br from-[#b08d63] via-[#c9a77c] to-[#8f6e4a]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(92deg, transparent 0 22px, rgba(60,35,10,.35) 22px 24px)" }} />
        <div className="absolute" style={{ left: 80, top: 34, transform: "rotate(-3deg)" }}><PaperReceipt /></div>
        {([[60, 24, "border-l-2 border-t-2"], [306, 24, "border-r-2 border-t-2"], [60, 512, "border-b-2 border-l-2"], [306, 512, "border-b-2 border-r-2"]] as const).map(([x, y, c]) => (
          <span key={`${x}-${y}`} className={`absolute h-6 w-6 border-yellow-300 ${c}`} style={{ left: x, top: y }} />
        ))}
      </Box>
      <Box x={0} y={668} w={PW} h={24} className="flex justify-center gap-6 text-xs font-semibold tracking-widest"><span className="text-white/60">VIDEO</span><span className="text-yellow-300">PHOTO</span><span className="text-white/60">PORTRAIT</span></Box>
      <Box x={156} y={712} w={78} h={78} className="flex items-center justify-center rounded-full border-4 border-white"><span className="h-[62px] w-[62px] rounded-full bg-white" /></Box>
      <Box x={32} y={730} w={60} h={40} className="flex items-center text-base">Cancel</Box>
    </div>
  )
}

// Confirm receipt details (NewReceiptClient form). Field order is the real grid's.
const CONFIRM_FIELDS: { l: string; v?: string; ph?: string; sel?: boolean; refund?: boolean }[] = [
  { l: "Date *", v: "17/11/2026" }, { l: "Amount (incl. GST) *", v: "67.47", refund: true }, { l: "Supplier", v: "Northside Fresh Market" },
  { l: "ABN", v: "12 345 678 901" }, { l: "Description", v: "Groceries — fruit, veg, meat, dairy, household" }, { l: "Category", v: "Groceries", sel: true },
  { l: "GST amount", v: "2.37" }, { l: "GST claimable", v: "No", sel: true }, { l: "Payment method", v: "Visa (EFTPOS)" },
  { l: "Invoice / receipt no.", v: "004821" }, { l: "Business purpose", ph: "e.g. Client lunch, home office supplies" }, { l: "Work-related %", ph: "0–100" },
]
const OPTS = [
  { v: "needs_checking", t: "Needs checking", h: "Come back and confirm the details later." },
  { v: "personal", t: "Personal / not for tax", h: "Just keeping the record. Excluded from tax totals." },
  { v: "ready", t: "Ready for accountant", h: "Reviewed and business/tax-relevant." },
]
const DUP_H = { d: 100, p: 116 }
function confirmGeom(phone: boolean, dup?: boolean) {
  const o = dup ? (phone ? DUP_H.p : DUP_H.d) : 0
  if (phone) {
    const fy = (n: number) => 420 + o + n * 64
    const fileY = 1244 + o
    return {
      h: 1760 + o, card: { x: 8, y: 148, w: 374, h: 1580 + o }, title: { x: 32, y: 170, w: 326, h: 32 }, badge: { x: 32, y: 208, w: 200, h: 20 },
      disc: { x: 32, y: 236, w: 326, h: 56 }, dup: { x: 32, y: 304, w: 326, h: DUP_H.p - 12 }, file: { x: 32, y: 304 + o, w: 326, h: 44 }, check: { x: 32, y: 360 + o, w: 326, h: 48 },
      field: (n: number): Rect => ({ x: 32, y: fy(n), w: 326, h: 54 }), asset: { x: 32, y: 1188 + o, w: 326, h: 44 },
      fileLabel: { x: 32, y: fileY, w: 326, h: 18 }, opt: (n: number): Rect => ({ x: 32, y: fileY + 22 + n * 72, w: 326, h: 64 }),
      notes: { x: 32, y: 1484 + o, w: 326, h: 100 }, foot: { x: 32, y: 1596 + o, w: 326, h: 48 },
      over: { x: 130, y: 1660 + o, w: 100, h: 40 }, save: { x: 238, y: 1660 + o, w: 120, h: 40 },
    }
  }
  const x0 = L + 24, colW = 418
  const gy = 302 + o
  return {
    h: Math.max(760, 1110 + o), card: { x: L, y: 104, w: CW, h: 984 + o }, title: { x: x0, y: 128, w: 500, h: 32 }, badge: { x: L + CW - 24 - 160, y: 134, w: 160, h: 20 },
    disc: { x: x0, y: 188, w: 848, h: 34 }, dup: { x: x0, y: 236, w: 848, h: DUP_H.d - 12 }, file: { x: x0, y: 236 + o, w: 848, h: 32 }, check: { x: x0, y: 280 + o, w: 848, h: 16 },
    field: (n: number): Rect => ({ x: x0 + (n % 2) * (colW + 12), y: gy + Math.floor(n / 2) * 68, w: colW, h: 56 }), asset: { x: x0, y: gy + 408, w: 848, h: 40 },
    fileLabel: { x: x0, y: gy + 460, w: 848, h: 18 }, opt: (n: number): Rect => ({ x: x0 + n * (277 + 8), y: gy + 482, w: 277, h: 72 }),
    notes: { x: x0, y: gy + 570, w: 848, h: 104 }, foot: { x: x0, y: gy + 690, w: 848, h: 20 },
    over: { x: L + CW - 24 - 124 - 8 - 100, y: gy + 726, w: 100, h: 40 }, save: { x: L + CW - 24 - 124, y: gy + 726, w: 124, h: 40 },
  }
}
function Confirm({ phone, filed, dup }: { phone: boolean; filed?: boolean; dup?: boolean }) {
  const g = confirmGeom(phone, dup)
  return (
    <Shell phone={phone} h={g.h}>
      <Crumbs r={{ x: phone ? 8 : L, y: phone ? 116 : 72, w: 600, h: 20 }} items={NEW_CRUMBS} />
      <Box {...g.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box {...g.title} className="font-display text-2xl">Confirm receipt details</Box>
      <Box {...g.badge} className={`flex items-center ${phone ? "" : "justify-end"}`}><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-800">AI confidence: high</span></Box>
      <Box {...g.disc} className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] italic leading-snug text-violet-900">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</Box>
      {dup && (
        <Box {...g.dup} className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
          <div className="mb-1 text-sm font-medium text-rose-900">Looks like a duplicate</div>
          <div className="mb-2 text-xs text-rose-800">2026-11-17 · Northside Fresh Market · $67.47</div>
          <div className="flex items-center gap-2 text-xs text-rose-900"><Tick />Save anyway — this isn&apos;t a duplicate.</div>
        </Box>
      )}
      <Box {...g.file} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-tal-cream-soft/50 px-3 text-xs text-tal-plum-soft">
        <span>🔒 Original image kept:</span><span className="font-medium text-tal-plum">{phone ? "IMG_4821.jpg" : "Northside_receipt_17Nov.jpg"}</span><span>(412 KB)</span>
      </Box>
      <Box {...g.check} className="text-xs leading-snug text-tal-plum-soft">Please confirm date, supplier, amount and GST below before saving. The AI can misread; only you know what&apos;s right.</Box>
      {CONFIRM_FIELDS.map((f, n) => (
        <Box key={f.l} {...g.field(n)}>
          <div className="mb-1 text-xs text-tal-plum-soft">{f.l}</div>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 flex-1 items-center justify-between gap-2 rounded-xl border border-tal-line bg-white px-3 text-sm ${f.v ? "" : "text-gray-400"}`}>
              <span className="truncate">{f.v ?? f.ph}</span>{f.sel && <span className="text-[10px] text-tal-plum">▾</span>}
            </div>
            {f.refund && <span className="flex shrink-0 items-center gap-1.5 text-xs"><Tick />Refund</span>}
          </div>
        </Box>
      ))}
      <Box {...g.asset}>
        <div className="mb-1 text-xs text-tal-plum-soft">Asset?</div>
        <div className="flex items-center gap-2 text-sm"><Tick />Yes, this is a depreciating asset</div>
      </Box>
      <Box {...g.fileLabel} className="text-xs text-tal-plum-soft">How should we file this? *</Box>
      {OPTS.map((o, n) => {
        const on = filed && o.v === "personal"
        return (
          <Box key={o.v} {...g.opt(n)} className={`flex items-start gap-2 rounded-xl border p-3 ${on ? "border-tal-plum bg-tal-cream-soft shadow-sm" : "border-tal-line bg-white"}`}>
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-blue-600" : "border-gray-400"}`}>{on && <span className="h-2 w-2 rounded-full bg-blue-600" />}</span>
            <div><div className="text-sm font-medium">{o.t}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{o.h}</div></div>
          </Box>
        )
      })}
      <Box {...g.notes}>
        <div className="mb-1 text-xs text-tal-plum-soft">Notes</div>
        <div className="h-20 rounded-xl border border-tal-line bg-white" />
      </Box>
      <Box {...g.foot} className="text-xs leading-snug text-tal-plum-soft">Work-related % helps you and your accountant see what might be claimable. The Adulting Life doesn&apos;t give tax advice — always confirm deductibility with your accountant.</Box>
      <Box {...g.over} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm">Start over</Box>
      <Box {...g.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save receipt</Box>
    </Shell>
  )
}

// ── What the buttons produce: the accountant's email, CSV, Excel, PDF ───────

const SEL_VIEW: View = { stage: 2, month: 11 }
function emailParts() {
  const c = compute(SEL_VIEW)
  const rows = c.visible
  const t = c.rollup
  const files = ["receipt-register.csv", ...rows.filter((r) => r.file).map((r) => `${r.d}_${r.s.replace(/[^a-zA-Z0-9._-]/g, "_")}.${r.file}`)]
  const lines = [
    "Hi,", "", `Please find attached ${rows.length} receipts from Sarah Taylor.`, "",
    `Total (incl. GST): $${t.total.toFixed(2)}`, `Potentially deductible (excludes personal receipts): $${t.ded.toFixed(2)}`, "",
    "Breakdown by category:", ...t.categories.map((x) => `  • ${x.category}: $${x.total.toFixed(2)} (${x.count} receipt${x.count === 1 ? "" : "s"})`), "",
    "The CSV is a full register with all fields. Individual receipt images/PDFs are attached separately.", "",
    "Note from sender:", NOTE, "", "Sent via The Adulting Life.",
  ]
  return { n: rows.length, files, lines }
}
function MailView({ phone }: { phone: boolean }) {
  const e = emailParts()
  const W2 = phone ? PW : 1200
  return (
    <div className="absolute left-0 top-0 w-full bg-white font-sans text-gray-900" style={{ height: phone ? 844 : 760 }}>
      {phone && <StatusBar />}
      <Box x={0} y={phone ? 44 : 0} w={W2} h={52} className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 text-sm text-gray-600"><span className="font-semibold text-gray-900">Inbox</span><span>· Lisa (Bright Books Accounting)</span></Box>
      <Box x={phone ? 16 : 120} y={phone ? 112 : 76} w={phone ? 358 : 960} h={phone ? 720 : 670} className="text-sm">
        <div className="mb-3 text-lg font-semibold leading-snug">Receipt Register — {e.n} receipts from Sarah Taylor</div>
        <div className="mb-1 text-xs text-gray-500">To: {ACCOUNTANT}</div>
        <div className="mb-3 text-xs text-gray-500">Reply-to: sarah.taylor@example.com</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {e.files.map((f) => <span key={f} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px]">📎 {f}</span>)}
        </div>
        <pre className={`whitespace-pre-wrap font-sans leading-snug text-gray-800 ${phone ? "text-[12px]" : "text-[13px]"}`}>{e.lines.join("\n")}</pre>
      </Box>
    </div>
  )
}
const CSV_HEAD = ["Financial Year", "Month", "Date", "Supplier", "ABN", "Description", "Category", "Business Purpose", "Amount (incl. GST)", "GST", "GST Claimable", "Payment Method", "Invoice No.", "Asset", "Work-related %", "Potentially Deductible Amount", "Status", "Receipt Attached", "Notes"]
function SheetView({ kind }: { kind: "csv" | "xlsx" }) {
  const c = compute(SEL_VIEW)
  const colW = [96, 72, 86, 170, 104, 220, 110, 160, 120, 60, 96]
  const cell = "flex h-7 shrink-0 items-center overflow-hidden whitespace-nowrap border-b border-r border-gray-200 px-2"
  const rowVals = (r: Rec) => ["2026-2027", "November", r.d, r.s, r.abn ?? "", r.desc ?? "", r.cat, r.purpose ?? "", r.amt.toFixed(2), r.gst != null ? r.gst.toFixed(2) : "", r.gstc == null ? "" : r.gstc ? "Yes" : "No"]
  return (
    <div className="absolute left-0 top-0 h-[760px] w-full bg-white font-sans text-[12px] text-gray-900">
      <Box x={0} y={0} w={1200} h={44} className="flex items-center gap-3 border-b border-gray-200 bg-emerald-700 px-4 text-sm font-medium text-white">{kind === "csv" ? "receipts-2026-2027-11.csv" : "receipts-2026-2027-11.xlsx"}</Box>
      {kind === "csv" ? (
        <Box x={0} y={44} w={1200} h={716} className="overflow-hidden">
          <div className="flex bg-gray-100 font-semibold">{CSV_HEAD.slice(0, colW.length).map((h, k) => <div key={h} className={cell} style={{ width: colW[k] }}>{h}</div>)}</div>
          {c.visible.map((r) => <div key={r.id} className="flex">{rowVals(r).map((x, k) => <div key={k} className={cell} style={{ width: colW[k] }}>{x}</div>)}</div>)}
          <div className="mt-4 px-3 text-[11px] text-gray-500">…then Payment Method, Invoice No., Asset, Work-related %, Potentially Deductible Amount, Status, Receipt Attached and Notes.</div>
        </Box>
      ) : (
        <Box x={0} y={44} w={1200} h={716}>
          <div className="w-[560px]">
            {[["Receipt Register", "2026–27", "font-bold text-[14px]"], ["", ""], ["Total spent (incl. GST)", aud(c.totals.total)], ["Potentially deductible", aud(c.totals.ded), "", "font-bold text-emerald-700"], ["Receipts included", String(c.visible.length)], ["", ""], ["By category", "", "font-bold"],
              ...c.totals.categories.map((x) => [x.category, aud(x.total)])].map((row, k) => (
              <div key={k} className={`flex ${row[2] ?? ""}`}><div className={cell} style={{ width: 300 }}>{row[0]}</div><div className={`${cell} ${row[3] ?? ""}`} style={{ width: 180 }}>{row[1]}</div></div>
            ))}
            <div className="mt-2 w-[480px] border border-gray-200 p-2 text-[11px] italic text-gray-600">Note: &apos;Potentially deductible&apos; is the sum of amount × work-related % on receipts marked Ready for accountant. Personal receipts are excluded. This isn&apos;t tax advice — confirm what&apos;s actually claimable with your accountant.</div>
          </div>
          <div className="absolute bottom-0 left-0 flex h-9 w-full items-center gap-1 border-t border-gray-200 bg-gray-50 px-3 text-xs">
            <span className="rounded-t border-b-2 border-emerald-700 bg-white px-3 py-1.5 font-medium">Summary</span><span className="px-3 py-1.5">Register</span>
          </div>
        </Box>
      )}
    </div>
  )
}
function PdfView({ phone }: { phone: boolean }) {
  const c = compute(SEL_VIEW)
  const W2 = phone ? PW : 1200
  const pw = phone ? 330 : 520
  return (
    <div className="absolute left-0 top-0 w-full bg-gray-500 font-sans" style={{ height: phone ? 844 : 760 }}>
      {phone && <StatusBar dark />}
      <Box x={0} y={phone ? 44 : 0} w={W2} h={40} className="flex items-center bg-gray-800 px-4 text-sm text-white">receipts-2026-2027-11-summary.pdf</Box>
      <Box x={(W2 - pw) / 2} y={phone ? 104 : 60} w={pw} h={phone ? 460 : 680} className="bg-white p-8 text-[#26182f] shadow-2xl">
        <div className="text-[22px] font-bold">Receipt Register</div>
        <div className="mb-5 text-sm text-[#705776]">2026–27</div>
        <div className="mb-4 text-sm">Receipts included: {c.visible.length}</div>
        <div className="flex justify-between text-sm"><span className="text-[#705776]">Total spent (incl. GST)</span><b>{aud(c.totals.total)}</b></div>
        <div className="mb-4 flex justify-between text-sm"><span className="text-[#705776]">Potentially deductible</span><b className="text-emerald-700">{aud(c.totals.ded)}</b></div>
        <div className="mb-1 text-[15px] font-bold">By category</div>
        {c.totals.categories.map((x) => <div key={x.category} className="flex justify-between text-sm"><span className="text-[#705776]">{x.category}  ({x.count})</span><span>{aud(x.total)}</span></div>)}
        <p className="absolute bottom-6 left-8 right-8 text-[10px] italic leading-snug text-[#705776]">Note: &apos;Potentially deductible&apos; is the sum of amount x work-related % on receipts marked Ready for accountant. Personal receipts are excluded. This is not tax advice — confirm what&apos;s actually claimable with your accountant.</p>
      </Box>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Views used by both versions
// ═════════════════════════════════════════════════════════════════════════════

const V: Record<string, Reg> = {
  reg: { stage: 0, month: null, fabs: true },
  fy: { stage: 0, month: null, fyOpen: true },
  monthOpen: { stage: 0, month: null, monthOpen: true },
  nov0: { stage: 0, month: 11 },
  added: { stage: 1, month: null, hl: NEW_REC.id },
  nov1: { stage: 1, month: 11 },
  nov2: { stage: 2, month: 11, hl: GREEN },
  nov2plain: { stage: 2, month: 11 },
  menu: { stage: 2, month: 11, menu: "se-nov" },
  del: { stage: 2, month: 11, del: "bp-nov" },
  sel: { stage: 2, month: 11, sel: true },
  email: { stage: 2, month: 11, sel: true, email: "open" },
  sent: { stage: 2, month: 11, sel: true, email: "sent" },
  table: { stage: 2, month: 11, table: true },
  sup: { stage: 2, month: null, sup: "Greenway", typing: true },
  catOpen: { stage: 2, month: null, catOpen: true },
  cat: { stage: 2, month: null, cat: "Groceries" },
  catNeeds: { stage: 2, month: null, cat: "Groceries", status: "needs_checking" },
  fy2: { stage: 2, month: null },
  ready: { stage: 2, month: null, status: "ready" },
  end: { stage: 2, month: null, fabs: true },
}
const BASE = "app.theadultinglife.com.au"
const U_REG = `${BASE}/receipts`
const U_FY = `${BASE}/receipts?fy=2026-2027`
const U_NOV = `${BASE}/receipts?fy=2026-2027&month=11`
const U_NEW = `${BASE}/receipts/new`
const U_EXP = (f: string) => `${BASE}/api/receipts/export?format=${f}&fy=2026-2027&month=11`
const U_MAIL = "mail.brightbooks.example.com/inbox"

// ═════════════════════════════════════════════════════════════════════════════
// COMPUTER (1200 x 760)
// ═════════════════════════════════════════════════════════════════════════════

const D = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, lay(v, false)])) as Record<keyof typeof V, Lay>
const dScroll = (g: Lay, y: number) => Math.max(0, Math.min(g.h - 760, Math.round(y)))
const D_GREEN_ROW = D.nov1.rowOf(GREEN)
const D_EDIT_SCROLL = dScroll(D.nov1, D_GREEN_ROW.y - 300)
const D_DEL_ROW = D.nov2.rowOf("bp-nov")
const D_DEL_SCROLL = dScroll(D.nov2, D_DEL_ROW.y - 360)
const D_MENU_ROW = D.menu.rowOf("se-nov")
const D_MENU_SCROLL = dScroll(D.menu, D_MENU_ROW.y - 300)
const dCf = confirmGeom(false)
const dCfDup = confirmGeom(false, true)
const dCh = chooseGeom(false)
const dCo = consentGeom(false)
const dEdTop = editGeom(false, D_EDIT_SCROLL, 0)
const dEdBot = editGeom(false, D_EDIT_SCROLL, EDIT_OFF.d)
const D_CF_SCROLL = 350

const D_SCREENS: Record<string, ReactNode> = {
  ...Object.fromEntries(Object.entries(V).map(([k, v]) => [k, <Register key={k} v={v} phone={false} dlgTop={k === "del" ? D_DEL_SCROLL : 0} />])),
  choose: <Choose phone={false} />,
  consent: <Choose phone={false} consent />,
  scanning: <Scanning phone={false} />,
  confirm: <Confirm phone={false} />,
  filed: <Confirm phone={false} filed />,
  dup: <Confirm phone={false} dup />,
  edit: <EditModal phone={false} scroll={D_EDIT_SCROLL} off={0} under={<Register v={V.nov1} phone={false} />} />,
  edited: <EditModal phone={false} scroll={D_EDIT_SCROLL} off={EDIT_OFF.d} edited under={<Register v={V.nov1} phone={false} />} />,
  mail: <MailView phone={false} />,
  csv: <SheetView kind="csv" />,
  xlsx: <SheetView kind="xlsx" />,
  pdf: <PdfView phone={false} />,
}

const D_STEPS: WalkStep[] = [
  // The register
  { screen: "reg", url: U_REG, caption: "Your Receipt Register", detail: "Photograph or upload a receipt and check the details. Every receipt for the financial year, ready for tax time. Open it from Receipts in the sidebar.", duration: 6500 },
  { screen: "reg", url: U_REG, caption: "Pick the financial year", detail: "Australian financial years, 1 July to 30 June.", focus: { x: 420, y: 260, scale: 1.7 }, ring: pad(D.reg.fySel, 3), click: mid(D.reg.fySel), duration: 5000 },
  { screen: "fy", url: U_REG, caption: "Every year you've kept receipts for", detail: "2026–27 now, and last year's are still here.", focus: { x: 440, y: 280, scale: 1.7 }, ring: { x: D.fy.fySel.x - 4, y: D.fy.fySel.y - 4, w: 128, h: 108 }, duration: 5000 },
  { screen: "reg", url: U_REG, caption: "The whole year, or one month", detail: "Each month shows how many receipts are in it. Click November.", focus: { x: 700, y: 290, scale: 1.3 }, ring: pad({ x: L, y: D.reg.months[0].y, w: CW, h: D.reg.months[D.reg.months.length - 1].y + 32 - D.reg.months[0].y }, 4), click: mid(D.reg.months[5]), duration: 6500 },
  { screen: "nov0", url: U_NOV, caption: "November: 4 receipts", detail: "Supplier, status, category, how sure the AI was, a 📎 when the photo is attached - and the amount.", focus: { x: 570, y: 640, scale: 1.2 }, ring: pad(span(D.nov0.rows[0], D.nov0.rows[2]), 4), duration: 7000 },
  { screen: "nov0", url: U_NOV, caption: "Totals and By category", detail: "Total spent this month, and what's potentially deductible - only receipts you've marked Ready for accountant count. Then each category's total.", focus: { x: 1020, y: 560, scale: 1.4 }, ring: pad(span(D.nov0.tot, D.nov0.catsCard), 4), duration: 8000 },
  // Add a receipt
  { screen: "nov0", url: U_NOV, caption: "+ Add receipt", focus: { x: 1000, y: 160, scale: 1.7 }, ring: pad(D.nov0.add, 3), click: mid(D.nov0.add), duration: 4500 },
  { screen: "choose", url: U_NEW, caption: "Add a receipt: three ways", detail: "Take a photo (on a computer it opens your files), upload a photo or PDF - an emailed bill works too - or Skip AI and enter manually.", focus: { x: 720, y: 300, scale: 1.2 }, ring: pad(span(dCh.photo, dCh.manual), 6), duration: 7000 },
  { screen: "choose", url: U_NEW, caption: "Upload a file", detail: "Sarah's grocery shop from Northside Fresh Market.", focus: { x: 920, y: 300, scale: 1.4 }, ring: dCh.upload, click: mid(dCh.upload), duration: 5000 },
  { screen: "consent", url: U_NEW, caption: "The first time, it asks", detail: "The image goes to OpenAI to read supplier, date, amount and GST - never used to train their models. Tick Don't ask me again and it won't.", focus: { x: 600, y: 350, scale: 1.5 }, ring: pad(dCo.box, 4), click: mid(dCo.go), duration: 7500 },
  { screen: "scanning", url: U_NEW, caption: "AI reads it", detail: "Usually just a few seconds.", duration: 3800 },
  { screen: "confirm", url: U_NEW, caption: "Confirm receipt details", detail: "How sure the AI is, a reminder it's a guide only, and the original image is kept with the receipt.", focus: { x: 720, y: 220, scale: 1.25 }, ring: pad(span(dCf.title, dCf.check), 6), duration: 7000 },
  { screen: "confirm", url: U_NEW, caption: "Date, amount, supplier and ABN", detail: "All read off the receipt. Tick Refund if money came back to you.", focus: { x: 720, y: 400, scale: 1.25 }, ring: pad(span(dCf.field(0), dCf.field(3)), 6), duration: 6500 },
  { screen: "confirm", url: U_NEW, scroll: D_CF_SCROLL - 150, caption: "Description, category and GST", detail: "Filed under Groceries, with $2.37 GST. Plus payment method and the receipt number.", focus: { x: 720, y: 540, scale: 1.2 }, ring: pad(span(dCf.field(4), dCf.field(9)), 6), duration: 7000 },
  { screen: "confirm", url: U_NEW, scroll: D_CF_SCROLL, caption: "Business purpose, work-related % and assets", detail: "For anything you use for work: what it was for and how much is work use. Tick Asset for something that depreciates, like a laptop.", focus: { x: 720, y: 720, scale: 1.25 }, ring: pad(span(dCf.field(10), dCf.asset), 6), duration: 7500 },
  { screen: "confirm", url: U_NEW, scroll: D_CF_SCROLL, caption: "How should we file this?", detail: "You have to choose. Groceries aren't for tax - Personal keeps the record but leaves it out of tax totals.", focus: { x: 720, y: dCf.opt(1).y + 36, scale: 1.35 }, ring: pad(span(dCf.opt(0), dCf.opt(2)), 4), click: mid(dCf.opt(1)), duration: 7000 },
  { screen: "filed", url: U_NEW, scroll: D_CF_SCROLL, caption: "Add any notes, then Save receipt", detail: "Start over throws this one away and goes back to the start.", focus: { x: 900, y: dCf.save.y - 60, scale: 1.4 }, ring: pad(dCf.save, 3), click: mid(dCf.save), duration: 5500 },
  { screen: "added", url: U_REG, caption: "It's in the register", detail: "Back on the whole year, the new receipt is at the top: Personal, Groceries, AI high and the photo attached.", focus: { x: 570, y: 560, scale: 1.25 }, ring: pad(D.added.rows[0], 3), duration: 7000 },
  { screen: "dup", url: U_NEW, caption: "Snapped the same receipt twice?", detail: "It spots a match on the date and amount and says so. Start over to skip it, or tick Save anyway if it really is a different one.", focus: { x: 720, y: 290, scale: 1.4 }, ring: pad(dCfDup.dup, 4), duration: 7500 },
  // Edit
  { screen: "added", url: U_REG, caption: "Back to November", focus: { x: 700, y: 290, scale: 1.4 }, ring: pad(D.added.months[5], 3), click: mid(D.added.months[5]), duration: 4500 },
  { screen: "nov1", url: U_NOV, scroll: D_EDIT_SCROLL, caption: "Click a receipt to edit it", detail: "Greenway Fuel still says Needs check - the AI was only medium sure.", focus: { x: 570, y: D_GREEN_ROW.y + 52, scale: 1.4 }, ring: pad(D_GREEN_ROW, 3), click: { x: D_GREEN_ROW.x + 200, y: D_GREEN_ROW.y + 30 }, duration: 5500 },
  { screen: "edit", url: U_NOV, scroll: D_EDIT_SCROLL, caption: "Edit receipt", detail: "Every detail can be changed. The attached photo stays as it is.", focus: { x: 600, y: D_EDIT_SCROLL + 380, scale: 1.12 }, ring: pad(span(dEdTop.abs(0), { ...dEdTop.abs(9), w: ED.d.w - 48 }), 6), duration: 7000 },
  { screen: "edited", url: U_NOV, scroll: D_EDIT_SCROLL, caption: "Work use, and Ready for accountant", detail: "Sarah drives to clients: 40% work-related, a business purpose and a note. Then Status: Ready for accountant - and Save.", focus: { x: 600, y: D_EDIT_SCROLL + 460, scale: 1.15 }, ring: pad(span({ ...dEdBot.abs(10), x: ED.d.x + 24 }, dEdBot.abs(14)), 6), click: mid(dEdBot.save), duration: 8000 },
  { screen: "nov2", url: U_NOV, scroll: D_EDIT_SCROLL, caption: "Now it's Ready - and $38.56 potentially", detail: "40% of $96.40. The potentially-deductible total goes up to match.", focus: { x: 720, y: D_GREEN_ROW.y + 20, scale: 1.12 }, ring: pad(D.nov2.rowOf(GREEN), 3), duration: 7000 },
  { screen: "menu", url: U_NOV, scroll: D_MENU_SCROLL, caption: "Or change the status right on the row", detail: "Needs checking, Personal or Ready - no need to open it.", focus: { x: 760, y: D_MENU_ROW.y + 110, scale: 1.5 }, ring: pad(D.menu.rowSel(D_MENU_ROW), 3), duration: 6000 },
  { screen: "nov2plain", url: U_NOV, scroll: D_DEL_SCROLL, caption: "The red ✕ deletes a receipt", focus: { x: 760, y: D_DEL_ROW.y + 30, scale: 1.6 }, ring: pad(D.nov2plain.rowDel(D_DEL_ROW), 2), click: mid(D.nov2plain.rowDel(D_DEL_ROW)), duration: 4500 },
  { screen: "del", url: U_NOV, scroll: D_DEL_SCROLL, caption: "It checks first", detail: "Delete this receipt? This can't be undone. Cancel keeps it.", focus: { x: 600, y: D_DEL_SCROLL + 365, scale: 1.6 }, ring: { x: 404, y: D_DEL_SCROLL + 286, w: 392, h: 158 }, click: mid(dlgCancel(false, D_DEL_SCROLL)), duration: 5500 },
  // Email + export
  { screen: "nov2plain", url: U_NOV, caption: "Send them to your accountant", detail: "Tick receipts one by one, or Select all.", focus: { x: 500, y: 520, scale: 1.6 }, ring: pad(D.nov2plain.tb.selAll, 3), click: mid(D.nov2plain.tb.selAll), duration: 5000 },
  { screen: "sel", url: U_NOV, caption: "Email 5 selected", detail: "A CSV register plus each attached receipt file - only to the address you give.", focus: { x: 560, y: 520, scale: 1.45 }, ring: pad(span(D.sel.tb.selN, D.sel.tb.email), 3), click: mid(D.sel.tb.email), duration: 6000 },
  { screen: "email", url: U_NOV, caption: "Your accountant's email, and a note", detail: "Usually your accountant - it doesn't go to the ATO.", focus: { x: 570, y: 640, scale: 1.4 }, ring: pad(D.email.email!, 3), click: { x: D.email.email!.x + D.email.email!.w - 70, y: D.email.email!.y + 70 }, duration: 9000 },
  { screen: "sent", url: U_NOV, caption: "Sent", detail: `Sent 5 receipt(s) to ${ACCOUNTANT}.`, focus: { x: 570, y: 640, scale: 1.4 }, ring: { x: D.sent.email!.x, y: D.sent.email!.y + D.sent.email!.h - 36, w: D.sent.email!.w, h: 30 }, duration: 5000 },
  { screen: "mail", url: U_MAIL, caption: "What Lisa receives", detail: "Totals, potentially deductible and a breakdown by category - with the CSV register and the receipt photos and PDFs attached.", focus: { x: 600, y: 330, scale: 1.15 }, duration: 8000 },
  { screen: "nov2plain", url: U_NOV, caption: "Export view: CSV, Excel or PDF", detail: "Downloads whatever you're looking at - this year, this month, and any filters.", focus: { x: 640, y: 520, scale: 1.6 }, ring: pad(D.nov2plain.tb.exp, 3), click: { x: D.nov2plain.tb.exp.x + 84, y: D.nov2plain.tb.exp.y + 16 }, duration: 5500 },
  { screen: "csv", url: U_EXP("csv"), caption: "CSV: the full register", detail: "One row per receipt, every field - opens in Excel, Numbers or Google Sheets.", focus: { x: 500, y: 200, scale: 1.2 }, duration: 6500 },
  { screen: "xlsx", url: U_EXP("xlsx"), caption: "Excel: a Summary sheet and a Register sheet", detail: "Totals, potentially deductible, receipts included and By category - and the register on its own tab.", focus: { x: 360, y: 260, scale: 1.3 }, duration: 7000 },
  { screen: "pdf", url: U_EXP("pdf"), caption: "PDF: a one-page summary", detail: "Handy to print or attach.", duration: 6000 },
  { screen: "nov2plain", url: U_NOV, caption: "Cards or Table", detail: "Table puts date, supplier, category, status and amount in columns.", focus: { x: 360, y: 520, scale: 1.7 }, ring: pad(D.nov2plain.tb.view, 3), click: { x: D.nov2plain.tb.view.x + 78, y: D.nov2plain.tb.view.y + 16 }, duration: 5000 },
  { screen: "table", url: U_NOV, caption: "Table view", detail: "Change the status or delete from here too. Click a row to edit it.", focus: { x: 570, y: 620, scale: 1.2 }, ring: pad({ ...D.table.tableHead!, h: 33 + D.table.rows.length * 53 }, 3), duration: 6500 },
  // Filters
  { screen: "table", url: U_NOV, caption: "Back to the full year", focus: { x: 500, y: 290, scale: 1.5 }, ring: pad(D.table.months[0], 3), click: mid(D.table.months[0]), duration: 4500 },
  { screen: "sup", url: U_FY, caption: "Search by supplier", detail: "Start typing and it suggests suppliers you've used. Greenway Fuel: 2 receipts this year. Clear filters undoes it.", focus: { x: 620, y: 400, scale: 1.4 }, ring: pad(span(D.sup.supInput, D.sup.clear!), 4), click: mid(D.sup.clear!), duration: 7500 },
  { screen: "catOpen", url: U_FY, caption: "Filter by category", detail: "Only the categories you've used are listed. Pick Groceries.", focus: { x: 760, y: 470, scale: 1.4 }, ring: pad(D.catOpen.catSel, 3), click: { x: D.catOpen.catSel.x + 60, y: D.catOpen.catSel.y + 44 + 4 * 28 + 14 }, duration: 6500 },
  { screen: "cat", url: U_FY, caption: "Groceries: 3 shops this year", detail: "And the totals switch to just these. Now add a status as well - Needs checking.", focus: { x: 620, y: 420, scale: 1.4 }, ring: pad(D.cat.statusChips[1], 3), click: mid(D.cat.statusChips[1]), duration: 6500 },
  { screen: "catNeeds", url: U_FY, caption: "Filters add up", detail: "No grocery receipts need checking. Clear filters (2) puts everything back.", focus: { x: 600, y: 480, scale: 1.3 }, ring: pad(span(D.catNeeds.clear!, D.catNeeds.empty!), 4), click: mid(D.catNeeds.clear!), duration: 6500 },
  { screen: "fy2", url: U_FY, caption: "Status: All, Needs checking, Ready, Personal", detail: "Click Ready for accountant to see what's going to your accountant.", focus: { x: 560, y: 410, scale: 1.5 }, ring: pad(span(D.fy2.statusChips[0], D.fy2.statusChips[3]), 4), click: mid(D.fy2.statusChips[2]), duration: 6000 },
  { screen: "ready", url: U_FY, caption: "7 ready for your accountant", detail: "Fuel, office supplies, work equipment, a course, boots, a donation. Personal shows the rest.", focus: { x: 720, y: 560, scale: 1.12 }, ring: pad(span(D.ready.rows[0], D.ready.tot), 4), duration: 7500 },
  // Header + round buttons
  { screen: "end", url: U_FY, caption: "The header, on every page", detail: "Search your organiser, + Add, Ask TAL AI, reminders under the bell, and your account.", focus: { x: 720, y: 120, scale: 1.4 }, ring: { x: SEARCH.x - 4, y: 8, w: USER.x + USER.w - SEARCH.x + 8, h: 48 }, duration: 6000 },
  { screen: "end", url: U_FY, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 1080, y: 640, scale: 1.8 }, ring: { x: FAB_R - 132, y: FAB_Y - 4, w: 136, h: 64 }, click: { x: FAB_R - 100, y: FAB_Y + 28 }, duration: 7000 },
]

// ═════════════════════════════════════════════════════════════════════════════
// PHONE (390 x 844)
// ═════════════════════════════════════════════════════════════════════════════

const P = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, lay(v, true)])) as Record<keyof typeof V, Lay>
const pScroll = (g: Lay, y: number) => Math.max(0, Math.min(g.h - 844, Math.round(y)))
const P_GREEN_ROW = P.nov1.rowOf(GREEN)
const P_EDIT_SCROLL = pScroll(P.nov1, P_GREEN_ROW.y - 360)
const P_DEL_ROW = P.nov2plain.rowOf("bp-nov")
const P_DEL_SCROLL = pScroll(P.nov2plain, P_DEL_ROW.y - 420)
const P_MENU_ROW = P.menu.rowOf("se-nov")
const P_MENU_SCROLL = pScroll(P.menu, P_MENU_ROW.y - 300)
const P_TB_SCROLL = pScroll(P.nov2plain, P.nov2plain.card.y - 200)
const pCf = confirmGeom(true)
const pCfDup = confirmGeom(true, true)
const pCh = chooseGeom(true)
const pCo = consentGeom(true)
const pEdTop = editGeom(true, P_EDIT_SCROLL, 0)
const pEdBot = editGeom(true, P_EDIT_SCROLL, EDIT_OFF.p)
const P_FULL = (g: Lay, a: Rect, b: Rect): Rect => pad(span(a, b), 4)

const P_SCREENS: Record<string, ReactNode> = {
  ...Object.fromEntries(Object.entries(V).map(([k, v]) => [k, <Register key={k} v={v} phone dlgTop={k === "del" ? P_DEL_SCROLL : 0} />])),
  choose: <Choose phone />,
  consent: <Choose phone consent />,
  camera: <Camera />,
  scanning: <Scanning phone />,
  confirm: <Confirm phone />,
  filed: <Confirm phone filed />,
  dup: <Confirm phone dup />,
  edit: <EditModal phone scroll={P_EDIT_SCROLL} off={0} under={<Register v={V.nov1} phone />} />,
  edited: <EditModal phone scroll={P_EDIT_SCROLL} off={EDIT_OFF.p} edited under={<Register v={V.nov1} phone />} />,
  mail: <MailView phone />,
  pdf: <PdfView phone />,
}

const P_STEPS: WalkStep[] = [
  // The register
  { screen: "reg", url: U_REG, caption: "Your Receipt Register", detail: "Every receipt for the financial year, ready for tax time. Open it from Receipts in the ☰ menu.", duration: 6000 },
  { screen: "reg", url: U_REG, caption: "Pick the financial year", detail: "Australian financial years, 1 July to 30 June.", focus: { x: 195, y: 360, scale: 1.4 }, ring: pad(P.reg.fySel, 3), click: mid(P.reg.fySel), duration: 5000 },
  { screen: "fy", url: U_REG, caption: "Every year you've kept receipts for", detail: "2026–27 now, and last year's are still here.", focus: { x: 195, y: 380, scale: 1.4 }, ring: { x: P.fy.fySel.x - 4, y: P.fy.fySel.y - 4, w: 128, h: 108 }, duration: 5000 },
  { screen: "reg", url: U_REG, caption: "The whole year, or one month", detail: "‹ and › step a month at a time, or tap the month to pick one.", focus: { x: 195, y: 400, scale: 1.3 }, ring: pad(span(P.reg.stepper.prev, P.reg.stepper.next), 3), click: mid(P.reg.stepper.sel), duration: 6000 },
  { screen: "monthOpen", url: U_REG, caption: "Each month shows how many", detail: "Tap November.", focus: { x: 195, y: 560, scale: 1.12 }, ring: pad({ x: P.monthOpen.stepper.sel.x, y: P.monthOpen.stepper.sel.y + 40, w: P.monthOpen.stepper.sel.w, h: 13 * 28 + 8 }, 2), click: { x: 195, y: P.monthOpen.stepper.sel.y + 44 + 5 * 28 + 14 }, duration: 5500 },
  { screen: "nov0", url: U_NOV, scroll: pScroll(P.nov0, P.nov0.card.y - 120), caption: "November: 4 receipts", detail: "Supplier, status, category, how sure the AI was, a 📎 when the photo is attached - and the amount.", focus: { x: 195, y: P.nov0.rows[0].y + 150, scale: 1.05 }, ring: pad(span(P.nov0.rows[0], P.nov0.rows[1]), 3), duration: 7000 },
  { screen: "nov0", url: U_NOV, scroll: pScroll(P.nov0, P.nov0.tot.y - 140), caption: "Totals and By category", detail: "Total spent this month, and what's potentially deductible - only receipts marked Ready for accountant count. Then each category.", focus: { x: 195, y: P.nov0.tot.y + 240, scale: 1.05 }, ring: P_FULL(P.nov0, P.nov0.tot, P.nov0.catsCard), duration: 8000 },
  // Add
  { screen: "nov0", url: U_NOV, caption: "+ Add receipt", focus: { x: 195, y: 260, scale: 1.4 }, ring: pad(P.nov0.add, 3), click: mid(P.nov0.add), duration: 4500 },
  { screen: "choose", url: U_NEW, caption: "Take a photo", detail: "Or upload a photo or PDF - an emailed bill works too - or Skip AI and enter manually.", focus: { x: 195, y: 400, scale: 1.12 }, ring: pCh.photo, click: mid(pCh.photo), duration: 6000 },
  { screen: "consent", url: U_NEW, caption: "The first time, it asks", detail: "The image goes to OpenAI to read supplier, date, amount and GST - never used to train their models.", focus: { x: 195, y: 420, scale: 1.1 }, ring: pad(pCo.box, 4), click: mid(pCo.go), duration: 7000 },
  { screen: "camera", url: U_NEW, caption: "Snap the receipt", detail: "Sarah's grocery shop from Northside Fresh Market.", focus: { x: 195, y: 380, scale: 1.12 }, click: { x: 195, y: 751 }, duration: 5500 },
  { screen: "scanning", url: U_NEW, caption: "AI reads it", detail: "Usually just a few seconds.", duration: 3800 },
  { screen: "confirm", url: U_NEW, caption: "Confirm receipt details", detail: "How sure the AI is, a reminder it's a guide only, and the original photo is kept.", focus: { x: 195, y: 300, scale: 1.1 }, ring: pad(span(pCf.title, pCf.check), 4), duration: 7000 },
  { screen: "confirm", url: U_NEW, scroll: 280, caption: "Store, date, total and ABN", detail: "All read off the receipt. Tick Refund if money came back to you.", focus: { x: 195, y: 560, scale: 1.1 }, ring: pad(span(pCf.field(0), pCf.field(3)), 4), duration: 6500 },
  { screen: "confirm", url: U_NEW, scroll: 560, caption: "Category, GST and how you paid", detail: "Groceries, $2.37 GST, Visa - and the receipt number.", focus: { x: 195, y: 900, scale: 1.08 }, ring: pad(span(pCf.field(4), pCf.field(9)), 4), duration: 7000 },
  { screen: "confirm", url: U_NEW, scroll: 860, caption: "Work use and assets", detail: "For work things: the business purpose and the work-related %. Tick Asset for something that depreciates.", focus: { x: 195, y: 1150, scale: 1.1 }, ring: pad(span(pCf.field(10), pCf.asset), 4), duration: 7000 },
  { screen: "confirm", url: U_NEW, scroll: 900, caption: "How should we file this?", detail: "You have to choose. Groceries aren't for tax - Personal keeps the record but leaves it out of tax totals.", focus: { x: 195, y: pCf.opt(1).y + 32, scale: 1.12 }, ring: pad(span(pCf.opt(0), pCf.opt(2)), 4), click: mid(pCf.opt(1)), duration: 7000 },
  { screen: "filed", url: U_NEW, scroll: 916, caption: "Notes, then Save receipt", detail: "Start over throws this one away.", focus: { x: 250, y: pCf.save.y - 60, scale: 1.25 }, ring: pad(pCf.save, 3), click: mid(pCf.save), duration: 5000 },
  { screen: "added", url: U_REG, scroll: pScroll(P.added, P.added.card.y - 80), caption: "It's in the register", detail: "Back on the whole year, the new receipt is at the top: Personal, Groceries, AI high, photo attached.", focus: { x: 195, y: P.added.rows[0].y + 60, scale: 1.08 }, ring: pad(P.added.rows[0], 3), duration: 7000 },
  { screen: "dup", url: U_NEW, caption: "Snapped it twice?", detail: "It spots the match and says so. Start over to skip it, or tick Save anyway if it's really a different one.", focus: { x: 195, y: 360, scale: 1.1 }, ring: pad(pCfDup.dup, 4), duration: 7000 },
  // Edit
  { screen: "nov1", url: U_NOV, scroll: P_EDIT_SCROLL, caption: "Tap a receipt to edit it", detail: "Greenway Fuel says Needs check - the AI was only medium sure.", focus: { x: 195, y: P_GREEN_ROW.y + 70, scale: 1.1 }, ring: pad(P_GREEN_ROW, 3), click: { x: 140, y: P_GREEN_ROW.y + 40 }, duration: 5500 },
  { screen: "edit", url: U_NOV, scroll: P_EDIT_SCROLL, caption: "Edit receipt", detail: "Every detail can be changed. The attached photo stays as it is.", focus: { x: 195, y: P_EDIT_SCROLL + 450, scale: 1.05 }, ring: pad(span(pEdTop.abs(0), pEdTop.abs(7)), 4), duration: 7000 },
  { screen: "edited", url: U_NOV, scroll: P_EDIT_SCROLL, caption: "Work use, and Ready for accountant", detail: "40% work-related, a business purpose and a note, Status: Ready for accountant - then Save.", focus: { x: 195, y: P_EDIT_SCROLL + 450, scale: 1.05 }, ring: pad(span(pEdBot.abs(10), pEdBot.abs(14)), 4), click: mid(pEdBot.save), duration: 8000 },
  { screen: "nov2", url: U_NOV, scroll: P_EDIT_SCROLL, caption: "Ready - and $38.56 potentially", detail: "40% of $96.40. The potentially-deductible total goes up to match.", focus: { x: 195, y: P.nov2.rowOf(GREEN).y + 70, scale: 1.1 }, ring: pad(P.nov2.rowOf(GREEN), 3), duration: 6500 },
  { screen: "menu", url: U_NOV, scroll: P_MENU_SCROLL, caption: "Or change the status on the row", detail: "Needs checking, Personal or Ready - no need to open it.", focus: { x: 260, y: P_MENU_ROW.y + 110, scale: 1.3 }, ring: pad(P.menu.rowSel(P_MENU_ROW), 3), duration: 6000 },
  { screen: "nov2plain", url: U_NOV, scroll: P_DEL_SCROLL, caption: "The red ✕ deletes a receipt", focus: { x: 300, y: P_DEL_ROW.y + 40, scale: 1.4 }, ring: pad(P.nov2plain.rowDel(P_DEL_ROW), 2), click: mid(P.nov2plain.rowDel(P_DEL_ROW)), duration: 4500 },
  { screen: "del", url: U_NOV, scroll: P_DEL_SCROLL, caption: "It checks first", detail: "Delete this receipt? This can't be undone. Cancel keeps it.", focus: { x: 195, y: P_DEL_SCROLL + 405, scale: 1.12 }, ring: { x: 12, y: P_DEL_SCROLL + 326, w: 366, h: 158 }, click: mid(dlgCancel(true, P_DEL_SCROLL)), duration: 5500 },
  // Email + export
  { screen: "nov2plain", url: U_NOV, scroll: P_TB_SCROLL, caption: "Send them to your accountant", detail: "Tick receipts one by one, or Select all.", focus: { x: 195, y: P.nov2plain.tb.selAll.y + 30, scale: 1.3 }, ring: pad(P.nov2plain.tb.selAll, 3), click: mid(P.nov2plain.tb.selAll), duration: 5000 },
  { screen: "sel", url: U_NOV, scroll: P_TB_SCROLL, caption: "Email 5 selected", detail: "A CSV register plus each attached receipt file - only to the address you give.", focus: { x: 195, y: P.sel.tb.email.y, scale: 1.2 }, ring: pad(span(P.sel.tb.selN, P.sel.tb.email), 3), click: mid(P.sel.tb.email), duration: 6000 },
  { screen: "email", url: U_NOV, scroll: pScroll(P.email, P.email.email!.y - 220), caption: "Your accountant's email, and a note", detail: "Usually your accountant - it doesn't go to the ATO.", focus: { x: 195, y: P.email.email!.y + 120, scale: 1.08 }, ring: pad(P.email.email!, 3), click: { x: 195, y: P.email.email!.y + 140 }, duration: 9000 },
  { screen: "sent", url: U_NOV, scroll: pScroll(P.sent, P.sent.email!.y - 220), caption: "Sent", detail: `Sent 5 receipt(s) to ${ACCOUNTANT}.`, focus: { x: 195, y: P.sent.email!.y + P.sent.email!.h - 40, scale: 1.12 }, ring: { x: P.sent.email!.x, y: P.sent.email!.y + P.sent.email!.h - 56, w: P.sent.email!.w, h: 50 }, duration: 5000 },
  { screen: "mail", url: U_MAIL, caption: "What Lisa receives", detail: "Totals, potentially deductible and each category - with the CSV register and the receipt photos and PDFs attached.", focus: { x: 195, y: 420, scale: 1.04 }, duration: 8000 },
  { screen: "nov2plain", url: U_NOV, scroll: P_TB_SCROLL, caption: "Export view: CSV, Excel or PDF", detail: "Downloads what you're looking at - this month and any filters. CSV and Excel open in a spreadsheet app. Tap PDF.", focus: { x: 220, y: P.nov2plain.tb.exp.y + 20, scale: 1.3 }, ring: pad(P.nov2plain.tb.exp, 3), click: { x: P.nov2plain.tb.exp.x + P.nov2plain.tb.exp.w - 18, y: P.nov2plain.tb.exp.y + 16 }, duration: 6500 },
  { screen: "pdf", url: U_EXP("pdf"), caption: "A one-page summary", detail: "Total spent, potentially deductible and By category.", focus: { x: 195, y: 340, scale: 1.08 }, duration: 6000 },
  { screen: "nov2plain", url: U_NOV, scroll: P_TB_SCROLL, caption: "Cards or Table", focus: { x: 140, y: P.nov2plain.tb.view.y + 20, scale: 1.4 }, ring: pad(P.nov2plain.tb.view, 3), click: { x: P.nov2plain.tb.view.x + 78, y: P.nov2plain.tb.view.y + 16 }, duration: 4500 },
  { screen: "table", url: U_NOV, scroll: P_TB_SCROLL, caption: "Table view", detail: "Date, supplier, category, status and amount in columns - swipe sideways for the rest.", focus: { x: 195, y: P.table.tableHead!.y + 100, scale: 1.05 }, ring: pad({ ...P.table.tableHead!, h: 33 + P.table.rows.length * 53 }, 2), duration: 6000 },
  // Filters
  { screen: "sup", url: U_FY, scroll: 200, caption: "Search by supplier", detail: "Back on the full year. Type part of a name - Greenway Fuel: 2 receipts. Clear filters undoes it.", focus: { x: 195, y: 500, scale: 1.12 }, ring: pad(span(P.sup.supInput, P.sup.clear!), 4), click: mid(P.sup.clear!), duration: 7500 },
  { screen: "catOpen", url: U_FY, scroll: 200, caption: "Filter by category", detail: "Only categories you've used. Pick Groceries.", focus: { x: 195, y: 640, scale: 1.1 }, ring: pad(P.catOpen.catSel, 3), click: { x: P.catOpen.catSel.x + 60, y: P.catOpen.catSel.y + 44 + 4 * 28 + 14 }, duration: 6000 },
  { screen: "cat", url: U_FY, scroll: 200, caption: "Groceries: 3 shops this year", detail: "Totals switch to just these. Add a status too - Needs checking.", focus: { x: 195, y: 560, scale: 1.2 }, ring: pad(P.cat.statusChips[1], 3), click: mid(P.cat.statusChips[1]), duration: 6000 },
  { screen: "catNeeds", url: U_FY, scroll: 200, caption: "Filters add up", detail: "No grocery receipts need checking. Clear filters (2) puts everything back.", focus: { x: 195, y: 620, scale: 1.08 }, ring: pad(span(P.catNeeds.clear!, P.catNeeds.empty!), 4), click: mid(P.catNeeds.clear!), duration: 6500 },
  { screen: "fy2", url: U_FY, scroll: 200, caption: "Status: All, Needs checking, Ready, Personal", detail: "Tap Ready for accountant.", focus: { x: 195, y: 560, scale: 1.2 }, ring: pad(span(P.fy2.statusChips[0], P.fy2.statusChips[3]), 4), click: mid(P.fy2.statusChips[2]), duration: 6000 },
  { screen: "ready", url: U_FY, scroll: pScroll(P.ready, P.ready.card.y - 100), caption: "7 ready for your accountant", detail: "Fuel, office supplies, work equipment, a course, boots and a donation. Personal shows the rest.", focus: { x: 195, y: P.ready.card.y + 330, scale: 1.04 }, ring: pad(span(P.ready.rows[0], P.ready.rows[3]), 3), duration: 7000 },
  // Header + round buttons
  { screen: "end", url: U_FY, caption: "TAL AI, reminders, account and menu", detail: "TAL AI is your built-in guide, the bell opens Reminders, your picture opens your account, and ☰ opens every other page.", focus: { x: 250, y: 160, scale: 1.5 }, ring: { x: P_ASK.x - 4, y: 54, w: P_MENU.x + P_MENU.w - P_ASK.x + 8, h: 48 }, duration: 6500 },
  { screen: "end", url: U_FY, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 280, y: 760, scale: 1.5 }, ring: { x: P_FAB_R - 132, y: P_FAB_Y - 4, w: 136, h: 64 }, click: { x: P_FAB_R - 100, y: P_FAB_Y + 28 }, duration: 7000 },
]

export default function ReceiptsWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer music="/audio/prestart-music.mp3" key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Receipts (phone)" : "Receipts (computer)"} url={U_REG} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Your Receipt Register", subtitle: "Snap a receipt, AI reads it, and your tax-time register adds itself up" }} />
  )
}
