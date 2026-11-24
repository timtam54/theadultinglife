"use client"

// "Reminders" page walkthrough - the /reminders page's walkthrough (tour)
// button (components/demo/PageWalkthroughFab). Not the "Staying on top of
// things" one on /demo (RemindersWalkthrough.tsx) - that stays as it is.
// Hand-built copies of the real screens with a made-up family's sample data
// (the Taylors, Brisbane) - no sign-in, no API calls. "Today" is Mon 23 Nov
// 2026. Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers every control on the page: the header (Add reminder, the counts),
// the Expired and Upcoming sections, every kind of row (an Organiser record's
// expiry date, a folder form's date, a budget bill, a Life Goals date, a
// custom reminder with and without a linked record) and what clicking each
// opens, the custom row's Snooze / Done / x (with the confirm box), then
// Add a reminder (the renewable tiles in their three states, "Something else
// with a date", Browse all records) and the custom reminder form.
// Copies: app/(app)/reminders/page.tsx (header, ReminderRow, formatDue),
// components/CustomReminderRow + confirm-dialog, lib/services/reminders.ts
// (row titles, statuses: Soon = within 30 days, where each row links),
// app/api/custom-reminders/[id] (Snooze = 7 days from today),
// app/(app)/reminders/new/page.tsx (RENEWABLES, CATEGORY_TONE, the three tile
// states), app/(app)/reminders/new/custom/page.tsx + CustomReminderForm +
// SmartTextarea, app/(app)/records/[category]/r/[id] + RecordEditor +
// StatusPill, app/(app)/records/[category]/new, the folder page (UserPicker,
// header, PageForm entry card - simplified), the Driver's Licence and Home
// Insurance questions in supabase/migrations (050, 150, 189 hint), BudgetPlanner
// (Needs bucket, bill columns, lib/budget REPEAT_LABELS / REMIND_OPTIONS),
// LifeGoals (My goal, DateWithReminder), app/(app)/records/page.tsx (top),
// app/(app)/layout.tsx header, AppSidebar, HelpButton, TourFab.
// The shell and round buttons are copied from OrganiserWalkthrough.
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
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
const Thumb = ({ src, size, className = "rounded-lg ring-1 ring-tal-line" }: { src: string; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`shrink-0 bg-white object-cover ${className}`} style={{ width: size, height: size }} />
)

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 70 }: { text: string; delay?: number; speed?: number }) {
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

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: a.y, w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: b.y + b.h - a.y })
/** Lines a text wraps to at word breaks in `w` px, about `cw` px a character. */
function wrapLines(text: string, w: number, cw: number) {
  let lines = 1, cur = 0
  for (const word of text.split(" ")) {
    const ww = word.length * cw
    if (cur === 0) cur = ww
    else if (cur + cw + ww <= w) cur += cw + ww
    else { lines += 1; cur = ww }
  }
  return lines
}
const truncateForRow = (raw: string, max = 30) => (raw.length <= max ? raw : raw.slice(0, max - 1) + "…")

// ── Icons (copied from nav-items.tsx, layout.tsx and the pages) ─────────────

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
const NAV_REMINDERS = 9
const NAV_ORGANISER = 2
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = ({ size = 14, w = 2 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>
)
const TalAiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
const Avatar = ({ size = 36 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white" style={{ width: size, height: size }}>S</span>
)
const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
)
// reminders/new's CalendarIcon
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const MicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)

// The two round buttons, bottom right: HelpButton (?) and TourFab (the
// compass), which plays this page's walkthrough.
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

// ── The two layouts ──────────────────────────────────────────────────────────

/** Where the page content sits for each device. */
interface V { phone: boolean; x: number; w: number; W: number; H: number; top: number }
const DV: V = { phone: false, x: 272, w: 896, W: 1200, H: 760, top: 76 }
const PV: V = { phone: true, x: 8, w: 374, W: 390, H: 844, top: 116 }

// Computer header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SB = 240
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
// Phone header controls
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const FAB = (v: V) => (v.phone ? { y: 764, right: 366 } : { y: 680, right: 1176 })

function DShell({ children, h, nav }: { children: ReactNode; h: number; nav: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === nav ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === nav ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
      </Box>
      <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
    </div>
  )
}
function PShell({ children, h }: { children: ReactNode; h: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
      <Box x={0} y={44} w={390} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
      {children}
    </div>
  )
}
const Shell = ({ v, h, nav = NAV_REMINDERS, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>
const HeaderPill = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">{children}</span>
)
const HeaderImg = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
)

// ── Sample data (the Taylors of Brisbane, "today" 23 Nov 2026) ──────────────

type St = "expired" | "soon" | "upcoming"
interface RRow { id: string; custom?: boolean; title: string; due: string; s: St; thumb?: string; rec?: string; link?: string }
const TS = "/thumbnails/subcategories/"
// An Organiser record's expiry date (source "record") - opens the record.
const R_FIRSTAID: RRow = { id: "firstaid", title: "Sarah's first aid certificate", due: "Expired 13 days ago · 10 Nov 2026", s: "expired", thumb: "/thumbnails/categories/employment.png" }
// A standalone custom reminder - no folder, so no icon.
const R_LIBRARY: RRow = { id: "library", custom: true, title: "Renew Mia's library card", due: "Expired 2 days ago · 21 Nov 2026", s: "expired" }
const R_LIBRARY_SNOOZED: RRow = { ...R_LIBRARY, due: "Due in 7 days · 30 Nov 2026", s: "soon" }
// A budget bill with an app reminder (source "bill") - opens Budgets.
const R_RENT: RRow = { id: "rent", title: "Bill due — Rent / board / mortgage ($2,250.00)", due: "Due in 8 days · 1 Dec 2026", s: "soon", thumb: `${TS}admin.budgets.png` }
// A folder form's reminder date (source "question") - opens the folder.
const R_LICENCE: RRow = { id: "licence", title: "Sarah Taylor — Driver's Licence · Expiry date", due: "Due in 15 days · 8 Dec 2026", s: "soon", thumb: `${TS}personal.drivers_licence.png` }
// A repeating custom reminder linked to a record - the record's section icon.
const R_SERVICE: RRow = { id: "service", custom: true, title: "Service the RAV4", due: "Due in 22 days · 15 Dec 2026", s: "soon", rec: "yearly", link: "Toyota RAV4 registration", thumb: "/thumbnails/categories/personal.png" }
// A Life Goals check-in with "Remind me" ticked (source "goal").
const R_GOAL: RRow = { id: "goal", title: "Goal check-in — Run a half marathon", due: "Due in 40 days · 2 Jan 2027", s: "upcoming", thumb: `${TS}health.life_goals_plans.png` }
const R_DENTIST: RRow = { id: "dentist", custom: true, title: "Book Leo's dentist check-up", due: "Due in 51 days · 13 Jan 2027", s: "upcoming", rec: "yearly" }
const R_HOME: RRow = { id: "home", title: "Home & contents insurance", due: "Due in 52 days · 14 Jan 2027", s: "upcoming", thumb: `${TS}admin.home_insurance.png` }

const L_START = [R_FIRSTAID, R_LIBRARY, R_RENT, R_LICENCE, R_SERVICE, R_GOAL, R_HOME]
const L_SNOOZED = [R_FIRSTAID, R_LIBRARY_SNOOZED, R_RENT, R_LICENCE, R_SERVICE, R_GOAL, R_HOME]
const L_DONE = [R_FIRSTAID, R_RENT, R_LICENCE, R_SERVICE, R_GOAL, R_HOME]
const L_ADDED = [R_FIRSTAID, R_RENT, R_LICENCE, R_SERVICE, R_GOAL, R_DENTIST, R_HOME]

const PILL_W: Record<St, number> = { expired: 60, soon: 42, upcoming: 66 }
const pillCls = (s: St) => (s === "expired" ? "bg-red-100 text-red-800" : s === "soon" ? "bg-amber-100 text-amber-900" : "bg-tal-cream-soft text-tal-plum-soft")
const pillText = (s: St) => (s === "expired" ? "Expired" : s === "soon" ? "Soon" : "Upcoming")
const StatusPill = ({ s }: { s: St }) => <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${pillCls(s)}`}>{pillText(s)}</span>

// ── Reminders (reminders/page) ───────────────────────────────────────────────

// Custom row's right-hand group: pill, Snooze, Done, x (CustomReminderRow).
const RIGHT_W = (s: St) => PILL_W[s] + 4 + 54 + 4 + 44 + 4 + 32
function customCol(v: V, r: RRow) {
  return v.phone ? v.w - 34 - RIGHT_W(r.s) - 12 - (r.thumb ? 48 : 0) - 60 : 520
}
function rowH(v: V, r: RRow) {
  if (r.custom) {
    const col = customCol(v, r)
    const dueLines = v.phone ? wrapLines(r.due, col, 6.2) : 1
    const linkLines = r.link ? (v.phone ? wrapLines(`→ ${r.link}`, col, 6.2) : 1) : 0
    return Math.max(76, 34 + 24 + 2 + dueLines * 16 + (linkLines ? 2 + linkLines * 16 : 0))
  }
  if (!v.phone) return 74
  const textW = v.w - 34 - 40 - 24 - PILL_W[r.s]
  const lines = Math.min(2, Math.ceil((truncateForRow(r.title, 40).length * 8.2) / textW))
  return 52 + lines * 24
}
interface Placed { r: RRow; box: Rect; pill: Rect; snooze: Rect; done: Rect; x: Rect; link: Rect }
function remLayout(v: V, rows: RRow[]) {
  const hdr = { x: v.x, y: v.top, w: v.w, h: v.phone ? 160 : 68 }
  const add = v.phone ? { x: v.x + v.w - 24 - 128, y: v.top + 108, w: 128, h: 36 } : { x: v.x + v.w - 24 - 128, y: v.top + 16, w: 128, h: 36 }
  let y = hdr.y + hdr.h + 24
  const heads: { t: string; y: number }[] = []
  const items: Placed[] = []
  const groups: [string, RRow[]][] = [["Expired", rows.filter((r) => r.s === "expired")], ["Upcoming", rows.filter((r) => r.s !== "expired")]]
  const sections: Rect[] = []
  for (const [t, list] of groups) {
    if (!list.length) continue
    const top = y
    heads.push({ t, y }); y += 28 + 12
    for (const r of list) {
      const h = rowH(v, r)
      const box = { x: v.x, y, w: v.w, h }
      const cy = y + h / 2
      const xb = box.x + box.w - 17 - 32
      const done = xb - 4 - 44, snooze = done - 4 - 54, pill = snooze - 4 - PILL_W[r.s]
      const textLeft = box.x + 17 + (r.thumb ? 48 : 0) + 60
      const col = customCol(v, r)
      const dueLines = v.phone ? wrapLines(r.due, col, 6.2) : 1
      const textTop = r.custom ? cy - (h - 34) / 2 : box.y + 17
      items.push({
        r, box,
        pill: { x: pill, y: cy - 11, w: PILL_W[r.s], h: 22 },
        snooze: { x: snooze, y: cy - 16, w: 54, h: 32 },
        done: { x: done, y: cy - 16, w: 44, h: 32 },
        x: { x: xb, y: cy - 16, w: 32, h: 32 },
        link: { x: textLeft, y: textTop + 24 + 2 + dueLines * 16 + 2, w: v.phone ? col : 168, h: v.phone ? h - 34 - 28 - dueLines * 16 : 16 },
      })
      y += h + 8
    }
    sections.push({ x: v.x, y: top, w: v.w, h: y - 8 - top })
    y += 24 - 8
  }
  return { hdr, add, heads, items, sections, h: Math.max(v.H, y + 40) }
}
const findRow = (lay: ReturnType<typeof remLayout>, id: string) => lay.items.find((p) => p.r.id === id)!

function ReminderRowView({ p, v }: { p: Placed; v: V }) {
  const { r, box } = p
  return (
    <Box {...box} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-tal-line bg-white p-4">
      {r.thumb && <Thumb src={r.thumb} size={40} />}
      <div className="min-w-0 flex-1">
        <div className={`break-all font-medium leading-6 text-tal-plum ${v.phone ? "" : "truncate"}`}>{truncateForRow(r.title, 40)}</div>
        <div className="mt-0.5 text-xs text-tal-plum-soft">{r.due}</div>
      </div>
      <StatusPill s={r.s} />
    </Box>
  )
}
function CustomRowView({ p, v }: { p: Placed; v: V }) {
  const { r, box } = p
  return (
    <>
      <Box {...box} className="rounded-xl border border-tal-line bg-white" />
      <Box x={box.x + 17} y={box.y + 1} w={(v.phone ? box.w - 34 - RIGHT_W(r.s) - 12 : 640)} h={box.h - 2} className="flex min-w-0 items-center gap-2">
        {r.thumb && <Thumb src={r.thumb} size={40} />}
        <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">CUSTOM</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate font-medium leading-6 text-tal-plum">
            <span className="truncate">{r.title}</span>
            {r.rec && <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-800">{r.rec}</span>}
          </div>
          <div className="mt-0.5 text-xs leading-4 text-tal-plum-soft">{r.due}</div>
          {r.link && <span className="mt-0.5 inline-block text-xs leading-4 text-tal-plum-soft underline">→ {r.link}</span>}
        </div>
      </Box>
      <Box {...p.pill} className={`flex items-center justify-center rounded-full text-xs ${pillCls(r.s)}`}>{pillText(r.s)}</Box>
      <Box {...p.snooze} className="flex items-center justify-center rounded-lg text-xs text-tal-plum-soft">Snooze</Box>
      <Box {...p.done} className="flex items-center justify-center rounded-lg text-xs text-emerald-700">Done</Box>
      <Box {...p.x} className="flex items-center justify-center rounded-lg text-tal-plum-soft">×</Box>
    </>
  )
}
const countText = (rows: RRow[]) => {
  const e = rows.filter((r) => r.s === "expired").length, u = rows.length - e
  return [e > 0 ? `${e} expired` : "", u > 0 ? `${u} upcoming` : ""].filter(Boolean).join(" · ")
}

function Reminders({ v, rows, confirm, fabs }: { v: V; rows: RRow[]; confirm?: string; fabs?: boolean }) {
  const lay = remLayout(v, rows)
  const { hdr } = lay
  const dlg = confirmRect(v)
  const target = confirm ? rows.find((r) => r.id === confirm) : undefined
  return (
    <Shell v={v} h={lay.h}>
      <Box {...hdr} className="rounded-2xl bg-black text-white shadow-md" />
      {v.phone ? (
        <>
          <Box x={hdr.x + 24} y={hdr.y + 16} w={300} h={36} className="flex items-center gap-3 text-white"><HeaderImg src="/thumbnails/dashboard/expiring-soon.png" /><HeaderPill>Reminders</HeaderPill></Box>
          <Box x={hdr.x + 24} y={hdr.y + 64} w={326} h={32} className="flex items-center gap-3 text-white"><span className="font-display text-2xl leading-tight">What&apos;s coming up</span><span className="mx-1 text-white/40">·</span></Box>
          <Box x={hdr.x + 24} y={hdr.y + 108} w={180} h={36} className="flex items-center text-sm text-white/80">{countText(rows)}</Box>
        </>
      ) : (
        <Box x={hdr.x + 24} y={hdr.y + 16} w={hdr.w - 48 - 140} h={36} className="flex items-center gap-3 text-white">
          <HeaderImg src="/thumbnails/dashboard/expiring-soon.png" /><HeaderPill>Reminders</HeaderPill>
          <span className="font-display text-2xl leading-tight">What&apos;s coming up</span><span className="mx-1 text-white/40">·</span>
          <span className="text-sm text-white/80">{countText(rows)}</span>
        </Box>
      )}
      <Box {...lay.add} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-tal-plum"><PlusIcon />Add reminder</Box>
      {lay.heads.map((h) => <Box key={h.t} x={v.x} y={h.y} w={300} h={28} className="font-display text-xl">{h.t}</Box>)}
      {lay.items.map((p) => (p.r.custom ? <CustomRowView key={p.r.id} p={p} v={v} /> : <ReminderRowView key={p.r.id} p={p} v={v} />))}
      {fabs && <Fabs {...FAB(v)} />}
      {target && (
        <>
          <Box x={0} y={0} w={v.W} h={lay.h} className="bg-black/50" />
          <Box {...dlg} className="rounded-2xl bg-white p-5 text-tal-plum shadow-xl">
            <h2 className="font-display text-lg leading-snug">Remove reminder &quot;{target.title}&quot;?</h2>
          </Box>
          <Box {...confirmBtns(v).cancel} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Cancel</Box>
          <Box {...confirmBtns(v).ok} className="flex items-center justify-center rounded-xl bg-red-600 text-sm font-medium text-white">Remove</Box>
        </>
      )}
    </Shell>
  )
}
// confirm-dialog: max-w-sm, centred, p-4 round it on a phone.
// It's fixed on screen, so it sits where the list is scrolled to (the step's scroll).
const confirmScroll = (v: V) => {
  const lay = remLayout(v, L_DONE), p = findRow(lay, "service")
  return Math.max(0, Math.min(lay.h - v.H, Math.round(p.box.y + p.box.h / 2 - v.H * 0.4)))
}
const confirmRect = (v: V): Rect => { const off = confirmScroll(v); return v.phone ? { x: 16, y: 340 + off, w: 358, h: 150 } : { x: 408, y: 300 + off, w: 384, h: 124 } }
const confirmBtns = (v: V) => {
  const d = confirmRect(v)
  const ok = { x: d.x + d.w - 20 - 86, y: d.y + d.h - 20 - 40, w: 86, h: 40 }
  return { ok, cancel: { x: ok.x - 8 - 82, y: ok.y, w: 82, h: 40 } }
}

// ── A record (records/[category]/r/[id] + RecordEditor) ──────────────────────

interface RecSpec { cat: string; sub?: string; title: string; status?: "active" | "expiring_soon" | "expired"; expiry?: string; tags: string[]; notes: string }
const REC_FIRSTAID: RecSpec = { cat: "Employment", title: "Sarah's first aid certificate", status: "expired", expiry: "10/11/2026", tags: ["renewals"], notes: "Provide First Aid (HLTAID011) through her work. Book the refresher course." }
const REC_RAV4: RecSpec = { cat: "Personal", sub: "Custom — Vehicle Details & Copy of Registration Certificate", title: "Toyota RAV4 registration", tags: ["glovebox"], notes: "QLD rego 482·KTV. Renew online with TMR." }
const REC_HOME: RecSpec = { cat: "Admin & Bookkeeping", sub: "Home Insurance", title: "Home & contents insurance", status: "active", expiry: "14/01/2027", tags: ["renewals"], notes: "Harbourside Insurance - renews automatically unless we call." }
const REC_PILL = { active: ["Active", "bg-green-100 text-green-800", 56], expiring_soon: ["Expiring soon", "bg-amber-100 text-amber-800", 100], expired: ["Expired", "bg-red-100 text-red-800", 66] } as const

function recLayout(v: V, sp: RecSpec) {
  const crumb = ["Records", sp.cat, ...(sp.sub ? [sp.sub] : []), sp.title].join(" › ")
  const crumbLines = v.phone ? wrapLines(crumb, v.w, 7) : 1
  const titleY = v.top + crumbLines * 20 + 12
  const pillW = sp.status ? REC_PILL[sp.status][2] : 0
  const titleLines = v.phone ? wrapLines(sp.title, v.w - pillW - 12, 16.5) : 1
  const fw = v.phone ? v.w : 672
  let y = titleY + titleLines * 40 + 24
  const title = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const expiry = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const tags = { x: v.x, y, w: fw, h: 100 }; y += 100 + 24
  const notes = { x: v.x, y, w: fw, h: 112 }; y += 112 + 24
  const save = { x: v.x, y, w: 140, h: 44 }; y += 44 + 32
  const audit = { x: v.x, y, w: fw, h: 28 }
  const pill = { x: v.x + v.w - pillW, y: titleY + 8, w: pillW, h: 26 }
  return { crumbLines, titleY, titleLines, title, expiry, tags, notes, save, audit, pill, h: Math.max(v.H, y + 60) }
}
function RecordPage({ v, sp }: { v: V; sp: RecSpec }) {
  const lay = recLayout(v, sp)
  const pillW = sp.status ? REC_PILL[sp.status][2] : 0
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={v.w} h={lay.crumbLines * 20} className="flex flex-wrap items-center gap-x-1.5 text-sm leading-5 text-tal-plum-soft">
        <span>Records</span><span className="opacity-60">›</span><span>{sp.cat}</span>
        {sp.sub && <><span className="opacity-60">›</span><span>{sp.sub}</span></>}
        <span className="opacity-60">›</span><span className="font-medium text-tal-plum">{sp.title}</span>
      </Box>
      <Box x={v.x} y={lay.titleY} w={v.w - pillW - 12} h={lay.titleLines * 40} className="font-display text-3xl leading-10">{sp.title}</Box>
      {sp.status && <Box {...lay.pill} className={`flex items-center justify-center rounded-full text-xs ${REC_PILL[sp.status][1]}`}>{REC_PILL[sp.status][0]}</Box>}
      <Field r={lay.title} label="Title" value={sp.title} />
      <Field r={lay.expiry} label="Expiry date (optional)" value={sp.expiry} placeholder="dd/mm/yyyy" w={190} />
      <TagsField r={lay.tags} tags={sp.tags} />
      <NotesField r={lay.notes} value={sp.notes} />
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save changes</Box>
      <Box x={v.x + 152} y={lay.save.y} w={96} h={44} className="flex items-center justify-center rounded-xl border border-red-200 text-red-700">Delete</Box>
      <Box {...lay.audit} className="font-display text-lg">Audit trail</Box>
    </Shell>
  )
}
function Field({ r, label, value, w, placeholder }: { r: Rect; label: string; value?: string; w?: number; placeholder?: string }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-sm">{label}</p>
      <div className={`flex h-11 items-center rounded-xl border border-tal-line bg-white px-3 ${value ? "" : "text-tal-plum-soft/60"}`} style={{ width: w ?? "100%" }}>{value ?? placeholder ?? ""}</div>
    </Box>
  )
}
function TagsField({ r, tags }: { r: Rect; tags: string[] }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-sm">Tags (optional)</p>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-tal-line bg-white p-2">
        {tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">{t}<span className="text-violet-600">×</span></span>)}
        {tags.length === 0 && <span className="px-2 text-sm text-tal-plum-soft/60">e.g. wallet, glovebox, safe</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="text-tal-plum-soft">Existing:</span>
        {["glovebox", "wallet", "renewals"].filter((t) => !tags.includes(t)).map((t) => <span key={t} className="rounded-full border border-tal-line px-2 py-0.5">+ {t}</span>)}
      </div>
    </Box>
  )
}
function NotesField({ r, value }: { r: Rect; value?: string }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-sm">Notes (optional)</p>
      <div className={`h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm ${value ? "" : "text-tal-plum-soft/60"}`}>{value}</div>
    </Box>
  )
}

// ── New record (records/[category]/new?subcategory=...) ──────────────────────

function newRecLayout(v: V) {
  const fw = v.phone ? v.w : 672
  let y = v.top + 20 + 4 + 40 + 24
  const scan = { x: v.x, y, w: fw, h: v.phone ? 176 : 92 }; y += scan.h + 24
  const title = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const expiry = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const tags = { x: v.x, y, w: fw, h: 100 }; y += 100 + 24
  const notes = { x: v.x, y, w: fw, h: 112 }; y += 112 + 24
  const create = { x: v.x, y, w: 96, h: 44 }
  return { scan, title, expiry, tags, notes, create, h: Math.max(v.H, y + 80) }
}
function NewRecord({ v }: { v: V }) {
  const lay = newRecLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={200} h={20} className="text-sm text-tal-plum-soft">← Personal</Box>
      <Box x={v.x} y={v.top + 24} w={v.w} h={40} className="font-display text-3xl">New record</Box>
      <Box {...lay.scan} className={`rounded-2xl border border-tal-line bg-tal-cream-soft p-4 ${v.phone ? "" : "flex items-center justify-between gap-3"}`}>
        <div>
          <div className="font-display">Scan a document</div>
          <p className="text-sm text-tal-plum-soft">Upload a photo or PDF of your document and we&apos;ll fill this in for you.</p>
        </div>
        <span className={`inline-flex h-11 shrink-0 items-center rounded-xl bg-black px-5 font-medium text-white ${v.phone ? "mt-3" : ""}`}>Scan document</span>
      </Box>
      <Box {...lay.title}><p className="mb-1 text-sm">Title</p><div className="flex h-11 items-center rounded-xl border border-tal-line bg-white px-3"><Typed text="Mia's passport" /></div></Box>
      <Field r={lay.expiry} label="Expiry date (optional)" value="02/09/2031" w={190} />
      <TagsField r={lay.tags} tags={[]} />
      <NotesField r={lay.notes} />
      <Box {...lay.create} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Create</Box>
    </Shell>
  )
}

// ── A folder page (records/[category]/[subcategory] + PageForm, simplified) ──

interface FF { l: string; v?: string; req?: boolean; hint?: string; full?: boolean; file?: boolean }
interface FolderSpec { cat: string; name: string; thumb: string; person?: string; entry?: string; fields: FF[] }
const REMIND_HINT = "Added to your Reminders automatically — from 30 days before, and once it has passed."
const F_LICENCE: FolderSpec = {
  cat: "Personal", name: "Driver's Licence", thumb: `${TS}personal.drivers_licence.png`, person: "Sarah Taylor",
  fields: [
    { l: "Licence document", v: "Sarah licence front.jpg", file: true, full: true, hint: "Upload a scan or photo of the licence (PDF or image)." },
    { l: "Licence No / CRN", v: "071 448 239", req: true },
    { l: "Surname", v: "TAYLOR", req: true },
    { l: "Given names", v: "SARAH JANE", req: true },
    { l: "Class", v: "C", req: true },
    { l: "Effective date", v: "08/12/2021" },
    { l: "Expiry date", v: "08/12/2026", req: true, hint: REMIND_HINT },
    { l: "Conditions" },
  ],
}
const F_HOME: FolderSpec = {
  cat: "Admin & Bookkeeping", name: "Home Insurance", thumb: `${TS}admin.home_insurance.png`, person: "Sarah Taylor", entry: "Entry 1",
  fields: [
    { l: "Policy document", v: "Policy schedule 2026.pdf", file: true, full: true, hint: "Upload the policy schedule or certificate (PDF or photo)" },
    { l: "Insurer", v: "Harbourside Insurance" },
    { l: "Policy number", v: "HI-4471982" },
    { l: "Cover type", v: "Home & contents" },
    { l: "Building sum insured ($)", v: "650,000" },
    { l: "Contents sum insured ($)", v: "120,000" },
    { l: "Excess ($)", v: "500" },
    { l: "Policy start", v: "14/01/2026" },
    { l: "Renewal date", v: "14/01/2027", hint: REMIND_HINT },
  ],
}
interface FPlaced { f: FF; r: Rect }
function folderLayout(v: V, sp: FolderSpec) {
  const picker = v.phone ? { x: v.x, y: v.top + 28, w: 200, h: 40 } : { x: v.x + 390, y: v.top - 2, w: 200, h: 40 }
  const head = { x: v.x, y: v.phone ? v.top + 80 : v.top + 52, w: v.w, h: v.phone ? 120 : 72 }
  const card = { x: v.x, y: head.y + head.h + 20, w: v.w, h: 0 }
  const items: FPlaced[] = []
  const inner = v.w - 32, colW = v.phone ? inner : (inner - 16) / 2
  let y = card.y + 16 + 36 + 12, col = 0, rowMax = 0
  const fh = (f: FF, w: number) => 18 + 4 + 40 + (f.hint ? 4 + wrapLines(f.hint, w, 6.2) * 16 : 0)
  for (const f of sp.fields) {
    const full = v.phone || f.full
    if (full && col === 1) { y += rowMax + 16; col = 0; rowMax = 0 }
    const w = full ? inner : colW
    const h = fh(f, w)
    items.push({ f, r: { x: v.x + 16 + (col === 1 ? colW + 16 : 0), y, w, h } })
    rowMax = Math.max(rowMax, h)
    if (full || col === 1) { y += rowMax + 16; col = 0; rowMax = 0 } else col = 1
  }
  if (col === 1) y += rowMax + 16
  card.h = y - card.y
  const save = { x: v.x, y: card.y + card.h + 16, w: 96, h: 40 }
  return { picker, head, card, items, save, h: Math.max(v.H, save.y + 100) }
}
const fieldOf = (lay: ReturnType<typeof folderLayout>, l: string) => lay.items.find((p) => p.f.l === l)!.r

function FolderHead({ v, head, name, thumb, cat, picker, person }: { v: V; head: Rect; name: string; thumb: string; cat: string; picker?: Rect; person?: string }) {
  return (
    <>
      <Box x={v.x} y={v.top} w={v.phone ? v.w : 380} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>{cat}</span><span className="opacity-50">·</span></Box>
      {picker && person && (
        <>
          <Box {...picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">{person}</span><span className="text-xs">▾</span>
          </Box>
          <Box x={picker.x + picker.w + 10} y={picker.y + 11} w={150} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
        </>
      )}
      <Box {...head} className="rounded-2xl bg-black shadow-md" />
      <Img src={thumb} x={head.x + (v.phone ? 12 : 20)} y={head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={head.x + (v.phone ? 76 : 84)} y={head.y + 12} w={v.phone ? v.w - 88 : 560} h={48} className="flex items-center font-display text-white" style={{ fontSize: v.phone ? 20 : 24 }}>{name}</Box>
      <Box x={v.phone ? head.x + 12 : head.x + head.w - 140} y={v.phone ? head.y + 72 : head.y + 18} w={120} h={36} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 text-sm font-medium text-white">▦ Excel</Box>
    </>
  )
}
function FolderPage({ v, sp, hl }: { v: V; sp: FolderSpec; hl?: string }) {
  const lay = folderLayout(v, sp)
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <FolderHead v={v} head={lay.head} name={sp.name} thumb={sp.thumb} cat={sp.cat} picker={lay.picker} person={sp.person} />
      <Box {...lay.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={lay.card.x + 16} y={lay.card.y + 16} w={lay.card.w - 32} h={36} className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-tal-plum-soft">{sp.entry ?? ""}</span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span>
      </Box>
      {lay.items.map(({ f, r }) => (
        <Box key={f.l} {...r}>
          <p className="mb-1 text-xs uppercase leading-[18px] tracking-wider text-tal-plum-soft">{f.l}{f.req && <span className="text-red-500">*</span>}</p>
          <div className={`flex h-10 items-center rounded-xl border bg-white px-3 text-sm ${hl === f.l ? "border-amber-400 ring-2 ring-amber-200" : "border-tal-line"}`}>
            {f.file ? <span className="flex items-center gap-2"><span className="rounded-md bg-tal-cream-soft px-1.5 py-0.5 text-xs">📎</span>{f.v}</span> : (f.v ?? "")}
          </div>
          {f.hint && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
        </Box>
      ))}
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </Shell>
  )
}

// ── Budgets (admin.budgets + BudgetPlanner's Needs bucket) ───────────────────

const BILLS = [
  { label: "Rent / board / mortgage", amount: "$2,250.00", due: "01/12/2026", repeats: "Every month", remind: "A week before", notes: "" },
  { label: "Phone / internet", amount: "$95.00", due: "05/12/2026", repeats: "Every month", remind: "No reminder", notes: "" },
]
function budgetLayout(v: V) {
  const head = { x: v.x, y: v.top + 32, w: v.w, h: v.phone ? 120 : 72 }
  const intro = { x: v.x, y: head.y + head.h + 24, w: v.w, h: v.phone ? 92 : 52 }
  const bucket = { x: v.x, y: intro.y + intro.h + 16, w: v.w, h: 0 }
  const barH = v.phone ? 72 : 44
  const lineH = v.phone ? 8 + 6 * 61 + 36 + 8 : 70
  const lines = (v.phone ? BILLS.slice(0, 1) : BILLS).map((_, i) => ({ x: v.x + 16, y: bucket.y + barH + 16 + i * (lineH + 8), w: v.w - 32, h: lineH }))
  bucket.h = barH + 16 + lines.length * (lineH + 8) - 8 + 16 + 40
  const first = lines[0]
  // Due / Repeats / App reminder cells of the first line (lg grid on a computer, stacked on a phone)
  const cells = v.phone
    ? { due: { x: first.x + 8, y: first.y + 8 + 2 * 61, w: first.w - 16, h: 55 }, rem: { x: first.x + 8, y: first.y + 8 + 4 * 61, w: first.w - 16, h: 55 } }
    : { due: { x: first.x + 8 + 110 + 8 + 128 + 8, y: first.y + 8, w: 152, h: 54 }, rem: { x: first.x + 8 + 110 + 8 + 128 + 8 + 152 + 8 + 144 + 8, y: first.y + 8, w: 152, h: 54 } }
  return { head, intro, bucket, barH, lines, cells, h: Math.max(v.H, bucket.y + bucket.h + 80) }
}
const CellLabel = ({ children }: { children: ReactNode }) => <span className="mb-1 block text-[10px] uppercase tracking-widest text-tal-plum-soft">{children}</span>
const Cell = ({ label, value, sel }: { label: string; value: string; sel?: boolean }) => (
  <div className="min-w-0"><CellLabel>{label}</CellLabel><div className="flex h-9 items-center justify-between rounded-lg border border-tal-line bg-white px-2 text-sm"><span className="truncate">{value}</span>{sel && <span className="text-[10px]">▾</span>}</div></div>
)
function Budgets({ v }: { v: V }) {
  const lay = budgetLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <FolderHead v={v} head={lay.head} name="Budgets" thumb={`${TS}admin.budgets.png`} cat="Admin & Bookkeeping" />
      <Box {...lay.intro}>
        <h2 className="font-display text-xl">3. Give every dollar a job</h2>
        <p className="mt-1 text-sm text-tal-plum-soft">Start with 60 / 20 / 10 / 10. You can adjust the percentages to suit your life.</p>
      </Box>
      <Box {...lay.bucket} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-black px-4 py-2.5 text-white`} style={{ height: lay.barH }}>
          <span className="font-display">Needs</span>
          <span className="flex items-center gap-3 text-sm"><span className="flex items-center gap-1.5"><span className="inline-flex h-7 w-12 items-center justify-center rounded-md bg-white/15">60</span>%</span><span className="text-white/80">Suggested amount: <span className="font-medium text-white">$5,040.00</span></span></span>
        </div>
      </Box>
      {lay.lines.map((r, i) => {
        const b = BILLS[i]
        return (
          <Box key={b.label} {...r} className={`rounded-xl border border-tal-line bg-tal-cream-soft/40 p-2 ${v.phone ? "flex flex-col gap-[6px]" : "grid items-start gap-2"}`} style={v.phone ? undefined : { gridTemplateColumns: "110px 128px 152px 144px 152px minmax(0,1fr) 32px" }}>
            <Cell label="Give this money a job" value={b.label} />
            <Cell label="Amount this period" value={b.amount} />
            <Cell label="Next bill due" value={b.due} />
            <Cell label="Repeats" value={b.repeats} sel />
            <Cell label="App reminder?" value={b.remind} sel />
            <Cell label="Notes" value={b.notes} />
            <div className={`flex h-9 w-8 items-center justify-center text-tal-plum-soft ${v.phone ? "" : "mt-5"}`}>×</div>
          </Box>
        )
      })}
      <Box x={v.x + 16} y={lay.bucket.y + lay.bucket.h - 52} w={v.w - 32} h={40} className="flex items-center justify-between text-sm">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-tal-line bg-tal-cream-soft px-3"><PlusIcon />Add a line</span>
        {!v.phone && <span>Total assigned: <b>$3,445.00</b> · Left to assign: <b>$1,595.00</b></span>}
      </Box>
    </Shell>
  )
}

// ── Life Goals & Plans (health.life_goals_plans + LifeGoals) ─────────────────

function goalsLayout(v: V) {
  const picker = v.phone ? { x: v.x, y: v.top + 28, w: 200, h: 40 } : { x: v.x + 390, y: v.top - 2, w: 200, h: 40 }
  const head = { x: v.x, y: v.phone ? v.top + 80 : v.top + 52, w: v.w, h: v.phone ? 120 : 72 }
  const sec = { x: v.x, y: head.y + head.h + 20, w: v.w, h: 0 }
  const textH = 96
  const gridY = sec.y + 40 + 3 * textH
  const gridH = v.phone ? 3 * 90 + 2 * 16 + 32 : 122
  sec.h = 40 + 3 * textH + gridH
  const colW = v.phone ? v.w - 32 : (v.w - 32 - 32) / 3
  const cell = (n: number) => (v.phone ? { x: v.x + 16, y: gridY + 16 + n * 106, w: colW, h: 90 } : { x: v.x + 16 + n * (colW + 16), y: gridY + 16, w: colW, h: 90 })
  const steps = { x: v.x, y: sec.y + sec.h + 20, w: v.w, h: 80 }
  return { picker, head, sec, textH, gridY, cell, steps, h: Math.max(v.H, steps.y + steps.h + 80) }
}
const GOAL_TEXT: [string, string][] = [
  ["What do I want to achieve?", "Run a half marathon"],
  ["Why is this important to me?", "Get fit again and do something just for me."],
  ["How will I know I have achieved it?", "I finish the 21 km without walking."],
]
function Goals({ v }: { v: V }) {
  const lay = goalsLayout(v)
  const dates: [string, string, boolean][] = [["My target date", "05/07/2027", false], ["My next check-in", "02/01/2027", true]]
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <FolderHead v={v} head={lay.head} name="Life Goals & Plans" thumb={`${TS}health.life_goals_plans.png`} cat="Health" picker={lay.picker} person="Sarah Taylor" />
      <Box {...lay.sec} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <h2 className="bg-rose-100 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide" style={{ height: 40 }}>My goal</h2>
        {GOAL_TEXT.map(([l, t]) => (
          <div key={l} className="border-b border-tal-line p-4" style={{ height: lay.textH }}>
            <span className="mb-1.5 block text-sm">{l}</span>
            <div className="rounded-xl border border-tal-line bg-white px-3 py-2 text-sm">{t}</div>
          </div>
        ))}
      </Box>
      <Box {...lay.cell(0)}><span className="mb-1.5 block text-sm">Life area</span><div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">Health</div></Box>
      {dates.map(([l, d, on], i) => (
        <Box key={l} {...lay.cell(i + 1)}>
          <span className="mb-1.5 block text-sm">{l}</span>
          <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-2 text-sm">{d}</div>
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-tal-plum-soft">
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-400 bg-white"}`}>{on && "✓"}</span>Remind me
          </span>
        </Box>
      ))}
      <Box {...lay.steps} className="overflow-hidden rounded-2xl border border-tal-line bg-white">
        <h2 className="bg-black px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">My action steps</h2>
        <div className="px-4 pt-3 text-xs text-tal-plum-soft">1 of 3 steps done</div>
      </Box>
    </Shell>
  )
}

// ── Add a reminder (reminders/new) ───────────────────────────────────────────

type TileState = "no_record" | "missing_date" | "has_date"
const TONE = {
  personal: { bg: "bg-violet-50 ring-violet-100", text: "text-violet-800" },
  health: { bg: "bg-amber-50 ring-amber-100", text: "text-amber-800" },
  admin: { bg: "bg-emerald-50 ring-emerald-100", text: "text-emerald-800" },
} as const
const CAT_LABEL = { personal: "Personal", health: "Health", admin: "Admin & Bookkeeping" } as const
const TILES: { id: string; label: string; cat: keyof typeof TONE; state: TileState; date?: string }[] = [
  { id: "passport", label: "Passport", cat: "personal", state: "no_record" },
  { id: "ids", label: "Driver's licence & IDs", cat: "personal", state: "no_record" },
  { id: "rego", label: "Car registration", cat: "personal", state: "missing_date" },
  { id: "vins", label: "Vehicle insurance", cat: "admin", state: "no_record" },
  { id: "home", label: "Home insurance", cat: "admin", state: "has_date", date: "14 Jan 2027" },
  { id: "hins", label: "Health insurance", cat: "health", state: "no_record" },
  { id: "lins", label: "Life insurance", cat: "health", state: "no_record" },
  { id: "rent", label: "Rental agreement", cat: "admin", state: "no_record" },
  { id: "warranty", label: "Warranty", cat: "admin", state: "missing_date" },
  { id: "phone", label: "Phone / device contract", cat: "admin", state: "no_record" },
  { id: "power", label: "Electricity or gas plan", cat: "admin", state: "no_record" },
]
const CTA: Record<TileState, [string, number]> = { no_record: ["Add record + date", 144], missing_date: ["Add date", 88], has_date: ["Update date", 106] }
const tileSub = (t: (typeof TILES)[number]) => `${CAT_LABEL[t.cat]} · ${t.state === "no_record" ? "Not added yet" : t.state === "missing_date" ? "No expiry set" : `Expires ${t.date}`}`
function addLayout(v: V) {
  const crumbs = { x: v.x, y: v.top, w: v.w, h: 20 }
  const hdr = { x: v.x, y: v.top + 32, w: v.w, h: v.phone ? 192 : 68 }
  const customBtn = v.phone ? { x: hdr.x + hdr.w - 24 - 156, y: hdr.y + 140, w: 156, h: 36 } : { x: hdr.x + hdr.w - 24 - 156, y: hdr.y + 16, w: 156, h: 36 }
  const cardTextW = v.w - 34 - 44 - 32 - 131
  const cardH = v.phone ? 34 + Math.max(44, wrapLines("Something else with a date", cardTextW, 8.4) * 20 + 2 + wrapLines("Car service, appointments, errands, anything.", cardTextW, 6.2) * 16) : 78
  const card = { x: v.x, y: hdr.y + hdr.h + 24, w: v.w, h: cardH }
  const cardCta = { x: card.x + card.w - 17 - 131, y: card.y + card.h / 2 - 16, w: 131, h: 32 }
  let y = card.y + card.h + 16
  const tiles: Rect[] = []
  const ctas: Rect[] = []
  TILES.forEach((t, i) => {
    const [, cw] = CTA[t.state]
    let r: Rect
    if (v.phone) {
      const tw = v.w - 34 - 44 - 32 - cw
      const h = 34 + Math.max(44, wrapLines(t.label, tw, 8.4) * 20 + 2 + wrapLines(tileSub(t), tw, 6.2) * 16)
      r = { x: v.x, y, w: v.w, h }
      y += h + 12
    } else {
      r = { x: v.x + (i % 2) * 454, y: y + Math.floor(i / 2) * 88, w: 442, h: 76 }
    }
    tiles.push(r)
    ctas.push({ x: r.x + r.w - 17 - cw, y: r.y + r.h / 2 - 16, w: cw, h: 32 })
  })
  if (!v.phone) y += Math.ceil(TILES.length / 2) * 88 - 12; else y -= 12
  const browseH = v.phone ? 20 + 24 + 2 + wrapLines("Browse all Organiser categories and add an expiry to any record.", v.w - 42, 6.2) * 16 + 16 + 40 + 22 : 84
  const browse = { x: v.x, y: y + 24, w: v.w, h: browseH }
  const browseBtn = v.phone ? { x: browse.x + 21, y: browse.y + browse.h - 21 - 40, w: 176, h: 40 } : { x: browse.x + browse.w - 21 - 176, y: browse.y + 22, w: 176, h: 40 }
  const grid = span(tiles[0], tiles[tiles.length - 1])
  return { crumbs, hdr, customBtn, card, cardCta, tiles, ctas, grid: { ...grid, x: v.x, w: v.w }, browse, browseBtn, h: Math.max(v.H, browse.y + browse.h + 60) }
}
const tileIx = (id: string) => TILES.findIndex((t) => t.id === id)
function AddReminder({ v }: { v: V }) {
  const lay = addLayout(v)
  const { hdr } = lay
  return (
    <Shell v={v} h={lay.h}>
      <Box {...lay.crumbs} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Reminders</span><span className="text-tal-plum-soft/50">/</span><span>Add a reminder</span></Box>
      <Box {...hdr} className="rounded-2xl bg-black text-white shadow-md" />
      {v.phone ? (
        <>
          <Box x={hdr.x + 24} y={hdr.y + 16} w={300} h={36} className="flex items-center gap-3 text-white"><HeaderImg src="/thumbnails/dashboard/add-reminder.png" /><HeaderPill>Reminders</HeaderPill></Box>
          <Box x={hdr.x + 24} y={hdr.y + 64} w={326} h={32} className="flex items-center gap-3 text-white"><span className="font-display text-2xl leading-tight">Add a reminder</span><span className="mx-1 text-white/40">·</span></Box>
          <Box x={hdr.x + 24} y={hdr.y + 108} w={326} h={20} className="text-sm text-white/80">Pick something to add an expiry to.</Box>
        </>
      ) : (
        <Box x={hdr.x + 24} y={hdr.y + 16} w={hdr.w - 48 - 170} h={36} className="flex items-center gap-3 text-white">
          <HeaderImg src="/thumbnails/dashboard/add-reminder.png" /><HeaderPill>Reminders</HeaderPill>
          <span className="font-display text-2xl leading-tight">Add a reminder</span><span className="mx-1 text-white/40">·</span>
          <span className="text-sm text-white/80">Pick something to add an expiry to.</span>
        </Box>
      )}
      <Box {...lay.customBtn} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-tal-plum"><PlusIcon />Custom reminder</Box>
      <Box {...lay.card} className="flex items-center gap-4 rounded-2xl bg-tal-cream-soft p-4 ring-1 ring-tal-line">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white"><PlusIcon size={20} w={1.7} /></span>
        <div className="min-w-0 flex-1" style={{ paddingRight: 147 }}><div className="font-medium leading-tight">Something else with a date</div><div className="mt-0.5 text-xs text-tal-plum-soft">Car service, appointments, errands, anything.</div></div>
      </Box>
      <Box {...lay.cardCta} className="flex items-center justify-center rounded-lg bg-white text-xs font-medium">Custom reminder →</Box>
      {TILES.map((t, i) => {
        const tone = TONE[t.cat]
        return (
          <Box key={t.id} {...lay.tiles[i]} className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${tone.bg}`}>
            <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ${tone.text}`}><CalendarIcon /></span>
            <div className="min-w-0 flex-1" style={{ paddingRight: CTA[t.state][1] + 16 }}><div className="font-medium leading-tight">{t.label}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{tileSub(t)}</div></div>
          </Box>
        )
      })}
      {TILES.map((t, i) => {
        const [cta] = CTA[t.state]
        return <Box key={t.id} {...lay.ctas[i]} className={`flex items-center justify-center rounded-lg bg-white text-xs font-medium ${TONE[t.cat].text}`}>{cta} →</Box>
      })}
      <Box {...lay.browse} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="font-medium">Something else you want to track?</div>
        <p className="mt-0.5 text-xs text-tal-plum-soft" style={{ maxWidth: v.phone ? undefined : 560 }}>Browse all Organiser categories and add an expiry to any record.</p>
      </Box>
      <Box {...lay.browseBtn} className="flex items-center justify-center gap-1 rounded-lg border border-tal-line bg-tal-cream-soft text-sm">Browse all records →</Box>
    </Shell>
  )
}

// ── The Organiser (records/page, the top of it) ──────────────────────────────

const CATS = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 6, total: 22, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 4, total: 21, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { id: "education", t: "Education", d: "Certificates, transcripts, resumes and study records.", done: 2, total: 12, tone: "bg-sky-50 ring-sky-100", bar: "bg-sky-500", pill: "bg-sky-100 text-sky-800" },
  { id: "employment", t: "Employment", d: "Work contracts, tax details, super and payslips.", done: 3, total: 12, tone: "bg-rose-50 ring-rose-100", bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800" },
  { id: "admin", t: "Admin & Bookkeeping", d: "Finances, accounts, utility bills, insurance and paperwork.", done: 7, total: 23, tone: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-800" },
]
function orgLayout(v: V) {
  const hdr = v.phone ? { x: v.x, y: v.top, w: v.w, h: 188 } : { x: v.x, y: v.top, w: v.w, h: 108 }
  const exp = { x: v.x, y: hdr.y + hdr.h + 16, w: v.w, h: v.phone ? 112 : 104 }
  const catsHead = { x: v.x, y: exp.y + exp.h + 24, w: 400, h: 28 }
  const cat = (n: number) => (v.phone ? { x: v.x, y: catsHead.y + 40 + n * 166, w: v.w, h: 150 } : { x: v.x + (n % 3) * 304, y: catsHead.y + 40 + Math.floor(n / 3) * 172, w: 288, h: 156 })
  return { hdr, exp, catsHead, cat, h: Math.max(v.H, cat(4).y + cat(4).h + 80) }
}
function Organiser({ v }: { v: V }) {
  const lay = orgLayout(v)
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm"
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box {...lay.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={v.x + 20} y={lay.hdr.y + 12} w={36} />
      {v.phone ? (
        <>
          <Box x={v.x + 68} y={lay.hdr.y + 12} w={v.w - 88} h={64} className="font-display text-2xl leading-tight">The Adulting Life Organiser</Box>
          <Box x={v.x + 20} y={lay.hdr.y + 82} w={v.w - 40} h={42} className="text-sm text-tal-plum-soft">All your important information, organised in one place.</Box>
        </>
      ) : (
        <Box x={v.x + 68} y={lay.hdr.y + 12} w={v.w - 88} h={36} className="flex items-center gap-3">
          <span className="font-display text-2xl leading-tight">The Adulting Life Organiser</span><span className="text-tal-plum-soft/50">·</span>
          <span className="text-sm text-tal-plum-soft">All your important information, organised in one place.</span>
        </Box>
      )}
      <Box x={v.phone ? v.x + 94 : v.x + v.w - 20 - 120 - 8 - 150} y={lay.hdr.y + lay.hdr.h - 52} w={150} h={36} className={`${btn} border border-tal-line bg-white px-3 text-tal-plum-soft`}><SearchIcon size={14} />Search records</Box>
      <Box x={v.phone ? v.x + 252 : v.x + v.w - 20 - 120} y={lay.hdr.y + lay.hdr.h - 52} w={v.phone ? 110 : 120} h={36} className={`${btn} bg-black font-medium text-white`}><PlusIcon />Add Record</Box>
      <Box {...lay.exp} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="mb-3 flex items-center gap-2"><span className="text-amber-700"><WarnIcon /></span><span className="font-display">Expiring or expired (1)</span></div>
        <div className="flex items-center gap-2.5 text-sm"><Thumb src="/thumbnails/categories/employment.png" size={32} className="rounded-lg ring-1 ring-white" /><span className="leading-snug"><span className="font-medium">Sarah&apos;s first aid certificate</span> <span className="text-tal-plum-soft">— Employment · expires 2026-11-10</span></span></div>
      </Box>
      <Box {...lay.catsHead} className="font-display text-xl">Choose a category</Box>
      {CATS.map((c, n) => {
        const p = Math.round((c.done / c.total) * 100)
        return (
          <Box key={c.id} {...lay.cat(n)} className={`flex flex-col rounded-2xl p-5 ring-1 ${c.tone}`}>
            <div className="mb-3 flex items-start gap-3">
              <Thumb src={`/thumbnails/categories/${c.id}.png`} size={56} className="rounded-xl ring-1 ring-white" />
              <div className="min-w-0 flex-1"><p className="font-display text-lg leading-tight">{c.t}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{c.d}</p></div>
            </div>
            <div className="mt-auto">
              <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">{c.done} of {c.total} folders complete</span><span className={`rounded-full px-2 py-0.5 font-medium ${c.pill}`}>{p}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full ${c.bar}`} style={{ width: `${p}%` }} /></div>
            </div>
          </Box>
        )
      })}
    </Shell>
  )
}

// ── Custom reminder (reminders/new/custom + CustomReminderForm) ──────────────

const CUSTOM_INTRO = "For anything that isn't in your Organiser yet — a service booking, an errand, a renewal date. We'll send a push 7 days before."
const REPEAT_OPTS = ["Don't repeat", "Every day", "Every week", "Every month", "Every year"]
const RECORD_OPTS = ["None", "Toyota RAV4 registration · Personal", "Sarah's first aid certificate · Employment", "Home & contents insurance · Admin & Bookkeeping", "Dyson vacuum warranty · Admin & Bookkeeping"]
function customLayout(v: V) {
  const crumbs = { x: v.x, y: v.top, w: v.w, h: v.phone ? 20 : 20 }
  const introLines = wrapLines(CUSTOM_INTRO, v.w - 48, 7)
  const hdr = { x: v.x, y: v.top + 32, w: v.w, h: 32 + 32 + 4 + introLines * 20 }
  const fw = v.phone ? v.w : 576
  let y = hdr.y + hdr.h + 24
  const title = { x: v.x, y, w: fw, h: 68 }; y += 68 + 20
  const due = { x: v.x, y, w: fw, h: 68 }; y += 68 + 20
  const repeat = { x: v.x, y, w: fw, h: 68 }; y += 68 + 20
  const link = { x: v.x, y, w: fw, h: 88 }; y += 88 + 20
  const notes = { x: v.x, y, w: fw, h: 24 + 112 + 4 + 32 }; y += notes.h + 20
  const save = { x: v.x, y, w: 150, h: 44 }
  return { crumbs, hdr, introLines, title, due, repeat, link, notes, save, h: Math.max(v.H, save.y + 120) }
}
const Sel = ({ children, w, open }: { children: ReactNode; w: number | string; open?: boolean }) => (
  <div className={`flex h-11 items-center justify-between rounded-xl border bg-white px-3 ${open ? "border-tal-plum ring-2 ring-tal-plum/20" : "border-tal-line"}`} style={{ width: w }}><span className="truncate">{children}</span><span className="ml-2 text-xs">▾</span></div>
)
function CustomForm({ v, filled, menu }: { v: V; filled?: boolean; menu?: "repeat" | "link" }) {
  const lay = customLayout(v)
  const ph = "text-tal-plum-soft/60"
  return (
    <Shell v={v} h={lay.h}>
      <Box {...lay.crumbs} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>Reminders</span><span className="text-tal-plum-soft/50">/</span><span>Add a reminder</span><span className="text-tal-plum-soft/50">/</span><span>Custom</span></Box>
      <Box {...lay.hdr} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <h1 className="font-display text-2xl leading-8">Custom reminder</h1>
        <p className="mt-1 text-sm leading-5 text-white/80">{CUSTOM_INTRO}</p>
      </Box>
      <Box {...lay.title}><p className="mb-1 text-sm">Title</p><div className="flex h-11 items-center rounded-xl border border-tal-line bg-white px-3">{filled ? (menu ? "Book Leo's dentist check-up" : <Typed text="Book Leo's dentist check-up" />) : <span className={ph}>e.g. Car service, Book flu jab, Renew visa</span>}</div></Box>
      <Box {...lay.due}><p className="mb-1 text-sm">Due date</p><div className={`flex h-11 w-[180px] items-center justify-between rounded-xl border border-tal-line bg-white px-3 ${filled ? "" : ph}`}>{filled ? "13/01/2027" : "dd/mm/yyyy"}<span className="text-tal-plum-soft">📅</span></div></Box>
      <Box {...lay.repeat}><p className="mb-1 text-sm">Repeat</p><Sel w={180} open={menu === "repeat"}>{filled && menu !== "repeat" ? "Every year" : "Don't repeat"}</Sel></Box>
      <Box {...lay.link}>
        <p className="mb-1 text-sm">Link to a record (optional)</p><Sel w="100%" open={menu === "link"}>None</Sel>
        <p className="mt-1 text-xs text-tal-plum-soft">Clicking the reminder will take you straight to the record.</p>
      </Box>
      <Box {...lay.notes}>
        <p className="mb-1 text-sm">Notes (optional)</p>
        <div className={`h-[112px] rounded-xl border border-tal-line bg-white px-3 py-2 ${filled ? "" : ph}`}>{filled ? "Bayside Dental — ask about a fissure seal." : "Anything you want to remember about it."}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-tal-line bg-white px-3 text-xs font-medium"><MicIcon />Dictate</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-tal-line text-[11px] font-bold text-tal-plum-soft">?</span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-medium text-violet-800">✨ Polish</span>
        </div>
      </Box>
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save reminder</Box>
      {menu === "repeat" && (
        <Box x={v.x} y={lay.repeat.y + 70} w={200} h={REPEAT_OPTS.length * 34 + 8} className="rounded-xl border border-tal-line bg-white py-1 shadow-lg">
          {REPEAT_OPTS.map((o) => <p key={o} className={`flex h-[34px] items-center px-3 text-sm ${o === "Every year" ? "bg-blue-600 text-white" : ""}`}>{o}</p>)}
        </Box>
      )}
      {menu === "link" && (
        <Box x={v.x} y={lay.link.y + 70} w={lay.link.w} h={RECORD_OPTS.length * 34 + 8} className="rounded-xl border border-tal-line bg-white py-1 shadow-lg">
          {RECORD_OPTS.map((o) => <p key={o} className={`flex h-[34px] items-center truncate px-3 text-sm ${o === "None" ? "bg-blue-600 text-white" : ""}`}>{o}</p>)}
        </Box>
      )}
    </Shell>
  )
}
const repeatMenu = (v: V): Rect => ({ x: v.x, y: customLayout(v).repeat.y + 70, w: 200, h: REPEAT_OPTS.length * 34 + 8 })
const linkMenu = (v: V): Rect => { const l = customLayout(v).link; return { x: v.x, y: l.y + 70, w: l.w, h: RECORD_OPTS.length * 34 + 8 } }

// ── Screens and steps (shared by both versions) ──────────────────────────────

function buildScreens(v: V): Record<string, ReactNode> {
  return {
    rem: <Reminders v={v} rows={L_START} />,
    remSnoozed: <Reminders v={v} rows={L_SNOOZED} />,
    remDone: <Reminders v={v} rows={L_DONE} />,
    remConfirm: <Reminders v={v} rows={L_DONE} confirm="service" />,
    remAdded: <Reminders v={v} rows={L_ADDED} />,
    remFabs: <Reminders v={v} rows={L_ADDED} fabs />,
    firstaid: <RecordPage v={v} sp={REC_FIRSTAID} />,
    rav4: <RecordPage v={v} sp={REC_RAV4} />,
    homeRec: <RecordPage v={v} sp={REC_HOME} />,
    licence: <FolderPage v={v} sp={F_LICENCE} hl="Expiry date" />,
    homeIns: <FolderPage v={v} sp={F_HOME} hl="Renewal date" />,
    budget: <Budgets v={v} />,
    goals: <Goals v={v} />,
    add: <AddReminder v={v} />,
    newrec: <NewRecord v={v} />,
    org: <Organiser v={v} />,
    custom: <CustomForm v={v} />,
    customFilled: <CustomForm v={v} filled />,
    customRepeat: <CustomForm v={v} filled menu="repeat" />,
    customLink: <CustomForm v={v} filled menu="link" />,
  }
}

const BASE = "app.theadultinglife.com.au"
const U = {
  rem: `${BASE}/reminders`,
  add: `${BASE}/reminders/new`,
  custom: `${BASE}/reminders/new/custom`,
  firstaid: `${BASE}/records/employment/r/3f9a2c`,
  rav4: `${BASE}/records/personal/r/8b21d4`,
  home: `${BASE}/records/admin/r/5c07e1`,
  licence: `${BASE}/records/personal/personal.drivers_licence`,
  homeIns: `${BASE}/records/admin/admin.home_insurance`,
  budget: `${BASE}/records/admin/admin.budgets?user=sarah`,
  goals: `${BASE}/records/health/health.life_goals_plans?user=sarah`,
  newrec: `${BASE}/records/personal/new?subcategory=personal.passport_travel`,
  org: `${BASE}/records`,
}

function buildSteps(v: V): WalkStep[] {
  const P = v.phone
  // Scroll a tall screen so `y` sits about 40% of the way down the view.
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  // Zoom on a rect - centred and kept modest on a phone so full-width rows aren't clipped.
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.04) : s })
  // Zoom on a small target (a button) - fine at a higher scale on both.
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })

  const L0 = remLayout(v, L_START)
  const LS = remLayout(v, L_SNOOZED)
  const LD = remLayout(v, L_DONE)
  const LA = remLayout(v, L_ADDED)
  const fa = findRow(L0, "firstaid"), lib = findRow(L0, "library"), libS = findRow(LS, "library")
  const rent = findRow(LD, "rent"), lic = findRow(LD, "licence"), svc = findRow(LD, "service"), goal = findRow(LD, "goal"), home = findRow(LD, "home")
  const dent = findRow(LA, "dentist")
  const ex = L0.sections[0], up = L0.sections[1]
  const rcF = recLayout(v, REC_FIRSTAID), rcR = recLayout(v, REC_RAV4), rcH = recLayout(v, REC_HOME)
  const fl = folderLayout(v, F_LICENCE), fh = folderLayout(v, F_HOME)
  const bl = budgetLayout(v), gl = goalsLayout(v)
  const al = addLayout(v), nl = newRecLayout(v), ol = orgLayout(v), cl = customLayout(v)
  const dl = confirmBtns(v)
  const fab = FAB(v)
  const licExp = fieldOf(fl, "Expiry date"), homeRen = fieldOf(fh, "Renewal date")
  const iHome = tileIx("home"), iPass = tileIx("passport"), iRego = tileIx("rego")

  // Scroll positions (the list and the forms are taller than a phone)
  const s0 = (r: Rect) => sc(L0.h, r.y + r.h / 2)
  const sS = (r: Rect) => sc(LS.h, r.y + r.h / 2)
  const sD = (r: Rect) => sc(LD.h, r.y + r.h / 2)
  const sAdd = (r: Rect) => (P ? sc(al.h, r.y + r.h / 2) : sc(al.h, r.y + r.h / 2))
  const rowClick = (p: Placed) => ({ x: p.box.x + (P ? 150 : 300), y: p.box.y + p.box.h / 2 })
  const rowStep = (screen: string, p: Placed, scroll: number, caption: string, detail: string, click?: { x: number; y: number }): WalkStep =>
    ({ screen, url: U.rem, scroll, caption, detail, focus: fz(p.box, 1.35), ring: p.box, click, duration: click ? 6500 : 7500 })
  const countRing = P ? { x: L0.hdr.x + 20, y: L0.hdr.y + 104, w: 188, h: 44 } : { x: L0.hdr.x + 410, y: L0.hdr.y + 12, w: 190, h: 44 }

  return [
    // The page
    { screen: "rem", url: U.rem, caption: "Reminders: what's coming up", detail: P ? "Every date across the family in one list. Open it from the bell at the top, or the ☰ menu." : "Every date across the family in one list. Open it from Reminders in the sidebar, or the bell at the top of any page.", focus: fz(L0.hdr, 1.3), ring: L0.hdr, duration: 7000 },
    { screen: "rem", url: U.rem, caption: "2 expired · 5 upcoming", detail: "The count at the top. Expired is anything already past its date; everything else is Upcoming, soonest first.", focus: fzs(countRing, P ? 1.5 : 1.8), ring: countRing, duration: 6000 },
    { screen: "rem", url: U.rem, scroll: P ? s0(lib.box) : 0, caption: "Where the dates come from", detail: "Expiry dates on your Organiser records, dates in folder forms (licences, insurance renewals), budget bills with an app reminder, Life Goals dates you ticked \"Remind me\" on, and your own custom reminders.", focus: P ? undefined : { x: 720, y: 470, scale: 1.05 }, ring: span(ex, up), duration: 9000 },
    // Expired + a record row
    { screen: "rem", url: U.rem, scroll: P ? s0(ex) : 0, caption: "Expired", detail: "Red Expired, with how many days ago it ran out and the date.", focus: fz(ex, 1.3), ring: ex, duration: 6000 },
    rowStep("rem", fa, s0(fa.box), "Click a row to open it", "Sarah's first aid certificate is a record in the Organiser - the icon shows the section it's in. Clicking it opens the record.", rowClick(fa)),
    { screen: "firstaid", url: U.firstaid, scroll: P ? sc(rcF.h, rcF.expiry.y + 120) : 0, caption: "Update the date on the record", detail: "Book the course, change the Expiry date, Save changes - and the reminder moves to the new date. Tags and notes help you find it later.", focus: fz(span(rcF.expiry, rcF.save), 1.15), ring: pad(rcF.expiry), click: mid(rcF.save), duration: 8000 },
    // Custom row: Snooze / Done
    rowStep("rem", lib, s0(lib.box), "A custom reminder", "The violet CUSTOM tag marks one you added yourself. Mia's library card isn't in the Organiser, so there's no folder icon - and custom ones have their own buttons: Snooze, Done and ×."),
    { screen: "rem", url: U.rem, scroll: s0(lib.box), caption: "Snooze", detail: "Not today? Snooze pushes it to 7 days from today.", focus: fzs(lib.snooze, P ? 1.6 : 1.5), ring: pad(lib.snooze, 2), click: mid(lib.snooze), duration: 5500 },
    { screen: "remSnoozed", url: U.rem, scroll: sS(libS.box), caption: "Moved to Upcoming, due in 7 days", detail: "Now due 30 Nov with an amber Soon, and the count at the top says 1 expired · 6 upcoming.", focus: fz(libS.box, 1.35), ring: libS.box, duration: 6500 },
    { screen: "remSnoozed", url: U.rem, scroll: sS(libS.box), caption: "Done", detail: "Renewed it? Done marks it finished and it leaves the list.", focus: fzs(libS.done, P ? 1.6 : 1.5), ring: pad(libS.done, 2), click: mid(libS.done), duration: 5500 },
    { screen: "remDone", url: U.rem, caption: "Gone - 1 expired · 5 upcoming", detail: "Only the first aid certificate is still expired.", focus: fz(span(LD.hdr, LD.sections[0]), 1.15), ring: LD.sections[0], duration: 5500 },
    // Statuses
    { screen: "remDone", url: U.rem, scroll: sD(rent.box), caption: "Soon and Upcoming", detail: "Amber Soon means within 30 days. Grey Upcoming is further away. The list shows every date you have, however far off.", focus: P ? undefined : { x: 960, y: 600, scale: 1.2 }, ring: P ? span(rent.box, goal.box) : { x: v.x + v.w - 92, y: rent.box.y, w: 92, h: home.box.y + home.box.h - rent.box.y }, duration: 7000 },
    // Bill
    rowStep("remDone", rent, sD(rent.box), "A bill from your budget", "Rent / board / mortgage is due on the 1st. It's here because Sarah turned on an app reminder for it in her budget.", rowClick(rent)),
    { screen: "budget", url: U.budget, scroll: P ? sc(bl.h, bl.cells.rem.y) : 0, caption: "Budgets: Next bill due and App reminder?", detail: "Each Needs and Wants line can have a due date, how often it repeats, and an app reminder - a week before, the day before or on the due date. Repeating bills roll on by themselves.", focus: P ? fz(span(bl.cells.due, bl.cells.rem), 1.05) : fzs(span(bl.cells.due, bl.cells.rem), 1.5), ring: pad(span(bl.cells.due, bl.cells.rem), 3), duration: 8500 },
    // Folder form date
    rowStep("remDone", lic, sD(lic.box), "A date in a folder form", "\"Sarah Taylor — Driver's Licence · Expiry date\" comes from her Driver's Licence folder. Long names are shortened to fit.", rowClick(lic)),
    { screen: "licence", url: U.licence, scroll: sc(fl.h, licExp.y), caption: "It opens the folder", detail: "Under every date that feeds Reminders: \"Added to your Reminders automatically — from 30 days before, and once it has passed.\" Change the date and Save.", focus: P ? fz(licExp, 1.1) : fzs(licExp, 1.6), ring: pad(licExp), duration: 8000 },
    // Custom linked + repeating
    rowStep("remDone", svc, sD(svc.box), "Repeats, and linked to a record", "YEARLY means it comes round again: once its reminder has gone out, it moves on to next year's date. The line under it is the record it's linked to."),
    { screen: "remDone", url: U.rem, scroll: sD(svc.box), caption: "Click the linked record", detail: "→ Toyota RAV4 registration.", focus: fzs(svc.link, P ? 1.5 : 1.8), ring: pad(svc.link, 3), click: { x: svc.link.x + Math.min(40, svc.link.w / 2), y: svc.link.y + 8 }, duration: 5500 },
    { screen: "rav4", url: U.rav4, caption: "The RAV4's record", detail: "What the reminder is about. There's no expiry date on it yet - you can add one here too.", focus: fz(span(rcR.title, rcR.expiry), 1.2), ring: pad(span(rcR.title, rcR.expiry)), duration: 6500 },
    { screen: "remDone", url: U.rem, scroll: sD(svc.box), caption: "× removes a custom reminder", detail: "For good - so it asks first.", focus: fzs(svc.x, P ? 1.6 : 1.5), ring: pad(svc.x, 2), click: mid(svc.x), duration: 5500 },
    { screen: "remConfirm", url: U.rem, scroll: sD(svc.box), caption: "Remove reminder \"Service the RAV4\"?", detail: "Remove deletes it; Cancel keeps it. We'll keep this one.", focus: { x: P ? 195 : 600, y: confirmRect(v).y + 75, scale: P ? 1.1 : 1.5 }, ring: pad(span(dl.cancel, dl.ok), 4), click: mid(dl.cancel), duration: 6500 },
    // Goal
    rowStep("remDone", goal, sD(goal.box), "A Life Goals check-in", "From Life Goals & Plans, in Health.", rowClick(goal)),
    { screen: "goals", url: U.goals, scroll: P ? sc(gl.h, gl.cell(2).y) : 0, caption: "\"Remind me\" under a date", detail: "A goal's target date, its next check-in and each action step's due date can go into Reminders - tick Remind me.", focus: P ? fz(gl.cell(2), 1.1) : fzs(span(gl.cell(1), gl.cell(2)), 1.5), ring: pad(P ? gl.cell(2) : span(gl.cell(1), gl.cell(2)), 4), duration: 7500 },
    // Home insurance record
    rowStep("remDone", home, sD(home.box), "A record's expiry date", "Home & contents insurance renews in 52 days.", rowClick(home)),
    { screen: "homeRec", url: U.home, caption: "Green Active", detail: "More than 30 days to go. Amber Expiring soon inside 30 days, red Expired after.", focus: P ? fz(span(rcH.pill, rcH.expiry), 1.1) : fzs({ x: v.x + v.w - 440, y: rcH.pill.y - 40, w: 440, h: 240 }, 1.25), ring: pad(rcH.pill, 3), duration: 6000 },
    // Add a reminder
    { screen: "remDone", url: U.rem, caption: "Add reminder", detail: "Something new to keep track of.", focus: fzs(LD.add, P ? 1.6 : 1.5), ring: pad(LD.add, 3), click: mid(LD.add), duration: 5000 },
    { screen: "add", url: U.add, caption: "Add a reminder", detail: "Pick something to add an expiry to - the reminder lives with the record, so you can always find it again. Reminders in the breadcrumb goes back.", focus: fz(al.hdr, 1.25), ring: al.hdr, duration: 6500 },
    { screen: "add", url: U.add, scroll: P ? sAdd(al.tiles[2]) : 0, caption: "The things people renew most", detail: "Passport, licence, rego, insurance, rental agreement, warranty, phone and power plans - each with its section and where it's up to.", focus: P ? undefined : { x: 720, y: 520, scale: 1.08 }, ring: P ? span(al.tiles[0], al.tiles[4]) : al.grid, duration: 7500 },
    { screen: "add", url: U.add, scroll: sAdd(al.tiles[iPass]), caption: "Not added yet: Add record + date", detail: "Nothing in the Passport folder yet - this starts a new record there.", focus: fz(al.tiles[iPass], 1.4), ring: pad(al.ctas[iPass], 3), click: mid(al.ctas[iPass]), duration: 6000 },
    { screen: "newrec", url: U.newrec, scroll: P ? sc(nl.h, nl.expiry.y) : 0, caption: "A new record, with its expiry date", detail: "Scan the document and AI fills it in, or type a title and the Expiry date. Create - and the date shows up in Reminders.", focus: fz(span(nl.title, nl.expiry), 1.2), ring: pad(span(nl.title, nl.expiry)), duration: 7500 },
    { screen: "add", url: U.add, scroll: sAdd(al.tiles[iRego]), caption: "No expiry set: Add date", detail: "There's a record, but no date - this opens it.", focus: fz(al.tiles[iRego], 1.4), ring: pad(al.ctas[iRego], 3), click: mid(al.ctas[iRego]), duration: 5500 },
    { screen: "rav4", url: U.rav4, scroll: P ? sc(rcR.h, rcR.expiry.y + 120) : 0, caption: "Add the expiry date", detail: "Fill in Expiry date (optional) and Save changes.", focus: fz(span(rcR.expiry, rcR.save), 1.15), ring: pad(rcR.expiry), click: mid(rcR.save), duration: 6000 },
    { screen: "add", url: U.add, scroll: sAdd(al.tiles[iHome]), caption: "Already dated: Update date", detail: "Home insurance expires 14 Jan 2027. This opens its folder.", focus: fz(al.tiles[iHome], 1.4), ring: pad(al.ctas[iHome], 3), click: mid(al.ctas[iHome]), duration: 5500 },
    { screen: "homeIns", url: U.homeIns, scroll: sc(fh.h, homeRen.y), caption: "Home Insurance: the Renewal date", detail: "Insurer, policy number, cover, sums insured, excess, start date - and the Renewal date, which goes into Reminders by itself.", focus: P ? fz(homeRen, 1.1) : fzs(homeRen, 1.6), ring: pad(homeRen), duration: 7500 },
    { screen: "add", url: U.add, scroll: sAdd(al.browse), caption: "Something else you want to track?", detail: "Browse all records opens the Organiser - add an expiry to any record.", focus: fz(al.browse, 1.3), ring: pad(al.browseBtn, 3), click: mid(al.browseBtn), duration: 6000 },
    { screen: "org", url: U.org, caption: "The Organiser", detail: "Choose a category, open a folder, add the date. Anything expiring in the next 30 days shows here too.", focus: P ? undefined : { x: 720, y: 420, scale: 1.05 }, ring: pad(span(ol.exp, ol.cat(P ? 1 : 4)), 4), duration: 6500 },
    // Custom reminder
    { screen: "add", url: U.add, caption: "Something else with a date", detail: "Car service, appointments, errands, anything. This, or Custom reminder at the top, opens the same form.", focus: fz(al.card, 1.35), ring: pad(al.card, 3), click: mid(al.cardCta), duration: 6500 },
    { screen: "custom", url: U.custom, caption: "Custom reminder", detail: "For anything that isn't in your Organiser yet. A push goes to your phone 7 days before.", focus: fz(cl.hdr, 1.2), ring: cl.hdr, duration: 6500 },
    { screen: "customFilled", url: U.custom, caption: "Title and due date", detail: "Both are needed - leave one empty and it says \"Give it a title and a date.\"", focus: fz(span(cl.title, cl.due), 1.25), ring: pad(span(cl.title, cl.due)), duration: 7500 },
    { screen: "customRepeat", url: U.custom, scroll: P ? sc(cl.h, cl.repeat.y + 100) : 0, caption: "Repeat", detail: "Don't repeat, or every day, week, month or year. A check-up is yearly.", focus: fz(span(cl.repeat, repeatMenu(v)), 1.3), ring: pad(repeatMenu(v), 3), duration: 6500 },
    { screen: "customLink", url: U.custom, scroll: P ? sc(cl.h, cl.link.y + 120) : 0, caption: "Link to a record (optional)", detail: "Pick one of your records and clicking the reminder takes you straight to it. Leo's check-up doesn't need one - None.", focus: fz(span(cl.link, linkMenu(v)), 1.2), ring: pad(linkMenu(v), 3), duration: 7000 },
    { screen: "customFilled", url: U.custom, scroll: P ? sc(cl.h, cl.notes.y + 100) : 0, caption: "Notes, then Save reminder", detail: "Type or Dictate notes; Polish tidies the wording. Save reminder adds it and takes you back to Reminders.", focus: fz(span(cl.notes, cl.save), 1.15), ring: pad(span(cl.notes, cl.save)), click: mid(cl.save), duration: 7500 },
    { screen: "remAdded", url: U.rem, scroll: sc(LA.h, dent.box.y + dent.box.h / 2), caption: "In the list", detail: "Book Leo's dentist check-up: CUSTOM, YEARLY, due in 51 days.", focus: fz(dent.box, 1.35), ring: dent.box, duration: 6500 },
    // Header + round buttons
    { screen: "remFabs", url: U.rem, caption: P ? "TAL AI, the bell and the menu" : "The bell, on every page", detail: P ? "The bell opens Reminders from any page. TAL AI is your built-in guide; ☰ opens every other page." : "The bell at the top opens Reminders from any page. Ask TAL AI is your built-in guide.", focus: P ? { x: 250, y: 160, scale: 1.6 } : { x: 1000, y: 180, scale: 1.7 }, ring: P ? { x: P_ASK.x - 4, y: 54, w: P_MENU.x + P_MENU.w - P_ASK.x + 8, h: 48 } : pad(span(ASK, BELL), 4), duration: 6500 },
    { screen: "remFabs", url: U.rem, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
}

const D_SCREENS = buildScreens(DV)
const P_SCREENS = buildScreens(PV)
const D_STEPS = buildSteps(DV)
const P_STEPS = buildSteps(PV)

export default function RemindersPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer music="/audio/demo-music.mp3" key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Reminders (phone)" : "Reminders (computer)"} url={U.rem} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Reminders", subtitle: "Every date that matters, before it sneaks up on you" }} />
  )
}
