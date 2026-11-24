"use client"

// "Tasks" page walkthrough - the /tasks page's walkthrough (tour) button
// (components/demo/PageWalkthroughFab). Hand-built copies of the real screens
// with a made-up family's sample data (the Taylors, Brisbane) - no sign-in, no
// API calls. "Today" is Mon 23 Nov 2026. Two versions (docs/Demo-Walkthroughs.md,
// rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers every control on the page: the black header (the count includes the
// setup steps still to do), the Setup steps checklist and where each step goes
// (Family Members folder, the Personal section, the Organiser, the Peace of
// Mind Planner, Learn, Quizzes, Videos), the Open / All filter, Add a task /
// Close, the add form (What do you need to do?, Due (optional), Link to a
// record (optional), Save, the "Give it a title." error), the row's tick
// (Mark as done / not done), the linked record link, "Added ..." when a task
// has no date or record, x with the confirm box, and the empty state.
// The real page has no edit, assignee or repeat on a task - so none is shown.
// Copies: app/(app)/tasks/page.tsx (header, Setup steps), components/TasksList
// + confirm-dialog, lib/services/onboarding.ts (the nine steps, labels, links),
// lib/db/tasks.ts (order: open first by due date, then done; a new task goes on
// top), app/api/tasks (+ [id]), components/FamilyUsersPanel (top), the
// section matrix (CategoryMatrix, simplified - no AI / Planner columns),
// app/(app)/records/page.tsx (top), templates/peace-of-mind-planner/page.tsx +
// PdfActions + lib/templates/peace-of-mind-v2.ts (section titles / hints),
// learn/page.tsx + StreakCard, learn/quizzes/page.tsx (FilterBar),
// learn/videos/page.tsx + WatchedLegend + VideoThumbnail, the record page
// (RecordEditor), app/(app)/layout.tsx header, AppSidebar, HelpButton, TourFab.
// The shell, round buttons, record page and Organiser are copied from
// RemindersPageWalkthrough. If one of those changes, update the matching screen.

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
const NAV_TASKS = 8
const NAV_ORGANISER = 2
const NAV_PLANNER = 5
const NAV_LEARN = 6
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
// PdfActions' icons
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
function PdfPair({ phone }: { phone: boolean }) {
  const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  return (
    <>
      <span className={btn} style={{ width: phone ? 40 : 128 }}><PdfGlyph />{!phone && "Download PDF"}</span>
      <span className={btn} style={{ width: phone ? 40 : 104 }}><MailGlyph />{!phone && "Share PDF"}</span>
    </>
  )
}

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
const Shell = ({ v, h, nav = NAV_TASKS, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>

// ── Sample data (the Taylors of Brisbane, "today" 23 Nov 2026) ──────────────

// onboarding.ts - the nine setup steps and where each goes. The Taylors have
// done the first five.
const SETUP = [
  { id: "family", t: "Add your family members (or confirm it's just you)", d: true },
  { id: "physical", t: "Got the physical Adulting Life organiser? Grab it — you can file along as you go", d: true },
  { id: "fstart", t: "Start filling in an Organiser folder", d: true },
  { id: "fdone", t: "Finish filling in an Organiser folder", d: true },
  { id: "pom1", t: "Fill in one Peace of Mind section", d: true },
  { id: "pom5", t: "Complete 5 Peace of Mind sections", d: false },
  { id: "article", t: "Read your first Learn article", d: false },
  { id: "quiz", t: "Take a quiz", d: false },
  { id: "video", t: "Watch a Learn video", d: false },
]
const SETUP_DONE = SETUP.filter((s) => s.d).length
const setupIx = (id: string) => SETUP.findIndex((s) => s.id === id)

interface Task { id: string; title: string; due?: string; link?: string; added?: string; done?: boolean }
const T_FIRSTAID: Task = { id: "firstaid", title: "Renew Sarah's first aid certificate", due: "4 Dec 2026", link: "Sarah's first aid certificate" }
const T_REGO: Task = { id: "rego", title: "Renew Toyota RAV4 rego", due: "3 Dec 2026", link: "Toyota RAV4 registration" }
const T_DENTIST: Task = { id: "dentist", title: "Book Leo's dentist check-up", due: "12 Dec 2026" }
const T_REPORT: Task = { id: "report", title: "Upload Mia's Term 4 report", added: "18 Nov 2026" }
const T_EXCURSION: Task = { id: "excursion", title: "Sign Mia's excursion form", added: "16 Nov 2026", done: true }
const done = (t: Task): Task => ({ ...t, done: true })

// Open first, soonest due date first; then done ones (lib/db/tasks.ts). A new
// task goes on top until the page reloads.
const L_START = [T_REGO, T_DENTIST, T_REPORT, T_EXCURSION]
const L_ADDED = [T_FIRSTAID, T_REGO, T_DENTIST, T_REPORT, T_EXCURSION]
const L_TICKED = [T_FIRSTAID, T_REGO, T_DENTIST, done(T_REPORT), T_EXCURSION]
const L_DELETED = [T_FIRSTAID, T_REGO, T_DENTIST, done(T_REPORT)]
const L_ALLDONE = [done(T_FIRSTAID), done(T_REGO), done(T_DENTIST), done(T_REPORT)]

const RECORD_OPTS = ["None", "Toyota RAV4 registration · Personal", "Sarah's first aid certificate · Employment", "Home & contents insurance · Admin & Bookkeeping", "Dyson vacuum warranty · Admin & Bookkeeping"]
const PICKED = "Sarah's first aid certificate · Employment"
const NEW_TITLE = "Renew Sarah's first aid certificate"

// ── Tasks (tasks/page + TasksList) ───────────────────────────────────────────

type Form = "none" | "empty" | "error" | "typing" | "date" | "menu" | "filled" | "cleared"
interface TState { tasks: Task[]; filter: "open" | "all"; form?: Form; setup?: boolean; count: number; confirm?: string; fabs?: boolean }

const CH_XS = 6.2
interface PRow { t: Task; box: Rect; check: Rect; x: Rect; link?: Rect }
function tLayout(v: V, s: TState) {
  const P = v.phone
  const hdr = { x: v.x, y: v.top, w: v.w, h: P ? 100 : 68 }
  let y = hdr.y + hdr.h + 24
  let setup: Rect | undefined
  const items: Rect[] = []
  if (s.setup !== false) {
    const top = y
    let iy = top + 20 + 28 + 12
    for (const it of SETUP) {
      const lines = P ? wrapLines(it.t, v.w - 40 - 26 - 24 - 12, 7.1) : 1
      const h = 26 + Math.max(24, lines * 20)
      items.push({ x: v.x + 20, y: iy, w: v.w - 40, h })
      iy += h + 8
    }
    setup = { x: v.x, y: top, w: v.w, h: iy - 8 + 20 - top }
    y = setup.y + setup.h + 24
  }
  const open = s.tasks.filter((t) => !t.done).length
  const openW = 24 + `Open (${open})`.length * CH_XS + 4
  const allW = 24 + `All (${s.tasks.length})`.length * CH_XS + 4
  const bar = { x: v.x, y, w: v.w, h: 42 }
  const openBtn = { x: v.x + 5, y: y + 5, w: openW, h: 32 }
  const allBtn = { x: openBtn.x + openW, y: y + 5, w: allW, h: 32 }
  const showForm = !!s.form && s.form !== "none"
  const addW = showForm ? 64 : 120
  const addBtn = { x: v.x + v.w - addW, y: y + 3, w: addW, h: 36 }
  y += 42 + 16
  let form: { box: Rect; title: Rect; date: Rect; sel: Rect; err?: Rect; save: Rect } | undefined
  if (showForm) {
    const top = y
    const title = { x: v.x + 17, y: top + 17 + 20, w: v.w - 34, h: 40 }
    const rowY = top + 17 + 60 + 12
    const date = { x: v.x + 17, y: rowY + 20, w: P ? 150 : 170, h: 40 }
    const sel = { x: date.x + date.w + 12, y: rowY + 20, w: v.x + v.w - 17 - (date.x + date.w + 12), h: 40 }
    let ny = rowY + 60 + 12
    let err: Rect | undefined
    if (s.form === "error") { err = { x: v.x + 17, y: ny, w: v.w - 34, h: 38 }; ny += 38 + 12 }
    const save = { x: v.x + 17, y: ny, w: 66, h: 40 }
    form = { box: { x: v.x, y: top, w: v.w, h: ny + 40 + 17 - top }, title, date, sel, err, save }
    y += form.box.h + 16
  }
  const visible = s.tasks.filter((t) => (s.filter === "open" ? !t.done : true))
  const rows: PRow[] = []
  const colW = v.w - 26 - 24 - 12 - 12 - 32
  for (const t of visible) {
    const dueW = t.due ? `Due ${t.due}`.length * CH_XS : 0
    const linkW = t.link ? `→ ${truncateForRow(t.link, 30)}`.length * CH_XS : 0
    const two = !!(t.due && t.link && dueW + 8 + linkW > colW)
    const h = 26 + 20 + 2 + (two ? 32 : 16)
    const box = { x: v.x, y, w: v.w, h }
    const cy = y + h / 2
    const textLeft = box.x + 13 + 24 + 12
    const metaY = box.y + 13 + 22
    rows.push({
      t, box,
      check: { x: box.x + 13, y: cy - 12, w: 24, h: 24 },
      x: { x: box.x + box.w - 13 - 32, y: cy - 16, w: 32, h: 32 },
      link: t.link ? (two ? { x: textLeft, y: metaY + 16, w: linkW, h: 16 } : { x: textLeft + dueW + 8, y: metaY, w: linkW, h: 16 }) : undefined,
    })
    y += h + 8
  }
  let empty: Rect | undefined
  if (visible.length === 0 && !showForm) {
    empty = { x: v.x, y, w: v.w, h: P ? 330 : 270 }
    y += empty.h + 8
  }
  return { hdr, setup, items, bar, openBtn, allBtn, addBtn, form, rows, empty, h: Math.max(v.H, y + 60) }
}
type TLay = ReturnType<typeof tLayout>
const rowOf = (lay: TLay, id: string) => lay.rows.find((r) => r.t.id === id)!

const Tick = ({ on, setup }: { on?: boolean; setup?: boolean }) => (
  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? (setup ? "bg-emerald-500 text-white" : "border border-emerald-600 bg-emerald-600 text-white") : "border border-tal-line bg-white"}`}>
    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d={setup ? "m6 12 4 4 8-9" : "M5 12l4 4 10-10"} stroke="currentColor" strokeWidth={setup ? 2.4 : 2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>}
  </span>
)
const Sel = ({ children, open, ph }: { children: ReactNode; open?: boolean; ph?: boolean }) => (
  <div className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-2 text-sm ${open ? "border-tal-plum ring-2 ring-tal-plum/20" : "border-tal-line"} ${ph ? "text-tal-plum-soft/70" : ""}`}><span className="truncate">{children}</span><span className="ml-2 text-xs">▾</span></div>
)

function confirmRect(v: V, scroll: number, title: string): Rect {
  const w = v.phone ? 358 : 384
  const h = 20 + wrapLines(title, w - 40, 9.6) * 28 + 20 + 40 + 20
  return { x: v.phone ? 16 : 408, y: scroll + Math.round((v.H - h) / 2), w, h }
}
const confirmBtns = (d: Rect) => {
  const ok = { x: d.x + d.w - 20 - 80, y: d.y + d.h - 20 - 40, w: 80, h: 40 }
  return { ok, cancel: { x: ok.x - 8 - 82, y: ok.y, w: 82, h: 40 } }
}
const sc0 = (v: V, h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
// The confirm box is fixed on screen, so it sits where the list is scrolled to.
const S_CONFIRM: TState = { tasks: L_TICKED, filter: "all", count: 8 }
const confirmScroll = (v: V) => { const lay = tLayout(v, S_CONFIRM), r = rowOf(lay, "excursion"); return sc0(v, lay.h, r.box.y + r.box.h / 2) }
const CONFIRM_TITLE = `Delete "${T_EXCURSION.title}"?`

function TasksPage({ v, s }: { v: V; s: TState }) {
  const lay = tLayout(v, s)
  const { hdr, form } = lay
  const P = v.phone
  const open = s.tasks.filter((t) => !t.done).length
  const f = s.form ?? "none"
  const titleVal = f === "typing" ? <Typed text={NEW_TITLE} /> : f === "date" || f === "menu" || f === "filled" ? NEW_TITLE : null
  const dateVal = f === "date" || f === "menu" || f === "filled" ? (P ? "4 Dec 2026" : "04/12/2026") : null
  const target = s.confirm ? s.tasks.find((t) => t.id === s.confirm) : undefined
  const cScroll = target ? confirmScroll(v) : 0
  const dlg = confirmRect(v, cScroll, CONFIRM_TITLE)
  const btns = confirmBtns(dlg)
  return (
    <Shell v={v} h={lay.h}>
      {/* Header */}
      <Box {...hdr} className="flex flex-wrap content-center items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <Thumb src="/thumbnails/dashboard/tasks.png" size={36} className="rounded-xl" />
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Tasks</span>
        <span className="font-display text-2xl leading-tight">{s.count === 0 ? "You're all caught up" : "Your list"}</span>
        <span className="mx-1 text-white/40">·</span>
        <span className="text-sm text-white/80">{s.count === 0 ? "nothing open" : `${s.count} thing${s.count === 1 ? "" : "s"} to do`}</span>
      </Box>
      {/* Setup steps */}
      {lay.setup && (
        <>
          <Box {...lay.setup} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={lay.setup.x + 20} y={lay.setup.y + 20} w={lay.setup.w - 40} h={28} className="flex items-baseline justify-between gap-3">
            <span className="font-display text-lg">Setup steps</span>
            <span className="text-xs text-tal-plum-soft">{SETUP_DONE} of {SETUP.length} done · {Math.round((SETUP_DONE / SETUP.length) * 100)}%</span>
          </Box>
          {SETUP.map((it, n) => (
            <Box key={it.id} {...lay.items[n]} className={`flex items-center gap-3 rounded-xl border border-tal-line p-3 ${it.d ? "bg-tal-cream-soft/60" : "bg-white"}`}>
              <Tick on={it.d} setup /><span className={`text-sm leading-5 ${it.d ? "text-tal-plum-soft line-through" : "text-tal-plum"}`}>{it.t}</span>
            </Box>
          ))}
        </>
      )}
      {/* Open / All + Add a task */}
      <Box x={lay.bar.x} y={lay.bar.y} w={lay.openBtn.w + lay.allBtn.w + 10} h={42} className="rounded-lg border border-tal-line bg-white" />
      <Box {...lay.openBtn} className={`flex items-center justify-center rounded-md text-xs font-medium ${s.filter === "open" ? "bg-black text-white" : "text-tal-plum-soft"}`}>Open ({open})</Box>
      <Box {...lay.allBtn} className={`flex items-center justify-center rounded-md text-xs font-medium ${s.filter === "all" ? "bg-black text-white" : "text-tal-plum-soft"}`}>All ({s.tasks.length})</Box>
      <Box {...lay.addBtn} className="flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-tal-cream-soft text-sm font-medium">{form ? "Close" : <><PlusIcon />Add a task</>}</Box>
      {/* The add form */}
      {form && (
        <>
          <Box {...form.box} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={form.title.x} y={form.title.y - 20} w={form.title.w} h={16} className="text-xs text-tal-plum-soft">What do you need to do?</Box>
          <Box {...form.title} className="flex items-center rounded-lg border border-tal-line bg-white px-3 text-sm">
            {titleVal ?? <span className="truncate text-tal-plum-soft/60">e.g. Renew rego, book dentist, upload Sam&apos;s report card</span>}
          </Box>
          <Box x={form.date.x} y={form.date.y - 20} w={form.date.w} h={16} className="text-xs text-tal-plum-soft">Due (optional)</Box>
          <Box {...form.date} className={`flex items-center justify-between rounded-lg border bg-white px-2 text-sm ${f === "date" ? "border-tal-plum ring-2 ring-tal-plum/20" : "border-tal-line"} ${dateVal ? "" : "text-tal-plum-soft/70"}`}>
            {dateVal ?? (P ? "" : "dd/mm/yyyy")}<span className="text-tal-plum-soft">📅</span>
          </Box>
          <Box x={form.sel.x} y={form.sel.y - 20} w={form.sel.w} h={16} className="truncate text-xs text-tal-plum-soft">Link to a record (optional)</Box>
          <Box {...form.sel}><Sel open={f === "menu"}>{f === "filled" ? PICKED : "None"}</Sel></Box>
          {form.err && <Box {...form.err} className="flex items-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm text-red-800">Give it a title.</Box>}
          <Box {...form.save} className="flex items-center justify-center rounded-lg bg-black text-sm font-medium text-white">Save</Box>
          {f === "menu" && (
            <Box x={P ? v.x + 17 : form.sel.x} y={form.sel.y + 44} w={P ? v.w - 34 : form.sel.w} h={RECORD_OPTS.length * 34 + 8} className="rounded-xl border border-tal-line bg-white py-1 shadow-lg">
              {RECORD_OPTS.map((o) => <p key={o} className={`flex h-[34px] items-center truncate px-3 text-sm ${o === PICKED ? "bg-blue-600 text-white" : ""}`}>{o}</p>)}
            </Box>
          )}
        </>
      )}
      {/* Rows */}
      {lay.rows.map(({ t, box }) => (
        <Box key={t.id} {...box} className={`flex items-center gap-3 rounded-xl border border-tal-line p-3 ${t.done ? "bg-tal-cream-soft/60" : "bg-white"}`}>
          <Tick on={t.done} />
          <div className="min-w-0 flex-1">
            <div className={`break-all text-sm leading-5 ${t.done ? "text-tal-plum-soft line-through" : "font-medium text-tal-plum"}`}>{truncateForRow(t.title, 40)}</div>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs leading-4 text-tal-plum-soft">
              {t.due && <span>Due {t.due}</span>}
              {t.link && <span className="break-all underline">→ {truncateForRow(t.link, 30)}</span>}
              {!t.due && !t.link && <span>Added {t.added}</span>}
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tal-plum-soft">×</span>
        </Box>
      ))}
      {/* Empty state */}
      {lay.empty && (
        <Box {...lay.empty} className="flex flex-col items-center rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tal-cream-soft">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="mb-1 font-display text-xl">{s.filter === "open" ? "Nothing to do right now" : "No tasks yet"}</div>
          <p className="mx-auto mb-4 max-w-md text-sm text-tal-plum-soft">Keep a running list of the little things — a call to make, a form to fill, a doc to upload — and tick them off as you go.</p>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-black px-4 text-sm font-medium text-white"><PlusIcon />Add your first task</span>
        </Box>
      )}
      {s.fabs && <Fabs {...FAB(v)} />}
      {target && (
        <>
          <Box x={0} y={0} w={v.W} h={lay.h} className="bg-black/50" />
          <Box {...dlg} className="rounded-2xl bg-white p-5 text-tal-plum shadow-xl"><h2 className="font-display text-lg leading-7">{CONFIRM_TITLE}</h2></Box>
          <Box {...btns.cancel} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Cancel</Box>
          <Box {...btns.ok} className="flex items-center justify-center rounded-xl bg-red-600 text-sm font-medium text-white">Delete</Box>
        </>
      )}
    </Shell>
  )
}
/** Where the empty state's "Add your first task" button sits. */
const emptyBtn = (v: V, e: Rect): Rect => {
  const pLines = wrapLines("Keep a running list of the little things — a call to make, a form to fill, a doc to upload — and tick them off as you go.", Math.min(448, v.w - 66), 7.1)
  return { x: e.x + e.w / 2 - 88, y: e.y + 33 + 56 + 12 + 28 + 4 + pLines * 20 + 16, w: 176, h: 40 }
}

// ── Family Members folder (records/personal/personal.family_members + FamilyUsersPanel) ──

const FAMILY = [
  { n: "Sarah Taylor", k: "adult", e: "sarah.taylor@example.com", primary: true },
  { n: "James Taylor", k: "adult", e: "james.taylor@example.com" },
  { n: "Mia Taylor", k: "child" },
  { n: "Leo Taylor", k: "child" },
]
const FAM_INTRO = "Add the people who are important in your life, along with their key personal details. This could include your partner, children or other family members. Keeping this information together makes it easier to manage important records and access details when needed."
function famLayout(v: V) {
  const P = v.phone
  const head = { x: v.x, y: v.top + 30, w: v.w, h: 72 }
  const textW = P ? v.w : v.w - 290
  const introH = 24 + 4 + wrapLines(FAM_INTRO, textW, 7.1) * 20
  const intro = { x: v.x, y: head.y + head.h + 24, w: textW, h: introH }
  const btns = P ? { x: v.x, y: intro.y + introH + 12, w: v.w, h: 36 } : { x: v.x + v.w - 280, y: intro.y, w: 280, h: 36 }
  const listY = (P ? btns.y + 36 : intro.y + introH) + 12
  const row = (n: number) => ({ x: v.x, y: listY + n * 68, w: v.w, h: 60 })
  const banner = { x: v.x, y: row(FAMILY.length).y + 8, w: v.w, h: 52 }
  return { head, intro, btns, row, banner, h: Math.max(v.H, banner.y + banner.h + 60) }
}
function FamilyPage({ v }: { v: V }) {
  const lay = famLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={v.w} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span></Box>
      <Box {...lay.head} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/subcategories/personal.family_members.png" x={lay.head.x + (v.phone ? 12 : 20)} y={lay.head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={lay.head.x + (v.phone ? 76 : 84)} y={lay.head.y + 12} w={300} h={48} className="flex items-center font-display text-2xl text-white">Family Members</Box>
      <Box {...lay.intro}>
        <p className="font-display leading-6">People in this family</p>
        <p className="mt-1 text-sm leading-5 text-tal-plum-soft">{FAM_INTRO}</p>
      </Box>
      <Box {...lay.btns} className={`flex items-center gap-2 ${v.phone ? "" : "justify-end"}`}>
        <PdfPair phone={v.phone} />
        <span className="inline-flex h-9 items-center rounded-xl bg-black px-3 text-sm font-medium text-white">+ Add user</span>
      </Box>
      {FAMILY.map((p, n) => (
        <Box key={p.n} {...lay.row(n)} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4">
          <div className="min-w-0">
            <p className="flex items-center font-medium">{p.n}{p.primary && <span className="ml-2 rounded bg-tal-cream-soft px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Primary login</span>}</p>
            <p className="mt-0.5 truncate text-xs text-tal-plum-soft">{p.k}{p.e ? ` · ${p.e}` : ""}</p>
          </div>
          <span className="text-tal-plum-soft">›</span>
        </Box>
      ))}
      <Box {...lay.banner} className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50/60 px-4 text-sm">You&apos;ve marked your family list as complete.<span className="px-3 py-1">Undo</span></Box>
    </Shell>
  )
}

// ── The Personal section (records/personal - CategoryMatrix, simplified) ─────

type Cell = "done" | "started" | "empty" | "na"
const CK: Record<string, Cell> = { d: "done", s: "started", e: "empty", n: "na" }
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
const PEOPLE = ["Sarah Taylor", "James Taylor", "Mia Taylor", "Leo Taylor"]
const MROWS: { id: string; n: string; c?: string; users?: boolean }[] = [
  { id: "personal.emergency_contacts", n: "Emergency Contacts", c: "ddss" },
  { id: "personal.family_members", n: "Family Members", users: true },
  { id: "personal.birth_certificates", n: "Birth Certificates", c: "dddd" },
  { id: "personal.marriage_certificate", n: "Marriage Certificate", c: "ddnn" },
  { id: "personal.passport_travel", n: "Passport & Travel Documents", c: "ddee" },
  { id: "personal.will_funeral", n: "Will & Funeral Instructions", c: "senn" },
  { id: "personal.power_of_attorney", n: "Power of Attorney Details", c: "eenn" },
  { id: "personal.advanced_health_directive", n: "Advanced Health Directive", c: "eenn" },
  { id: "personal.electoral_roll", n: "Electoral Roll Number & Registered Address", c: "ddnn" },
  { id: "personal.drivers_licence", n: "Driver's Licence", c: "ddnn" },
  { id: "personal.licences_ids", n: "Copy of Licences & ID's", c: "dsee" },
  { id: "personal.vehicle_details", n: "Custom — Vehicle Details & Copy of Registration Certificate", c: "ddnn" },
]
function matLayout(v: V) {
  const P = v.phone
  const bar = { x: v.x, y: v.top + 28, w: v.w, h: P ? 188 : 108 }
  const legend = { x: v.x, y: bar.y + bar.h + 16, w: v.w, h: P ? 64 : 22 }
  const table = { x: v.x, y: legend.y + legend.h + 12, w: v.w, h: 0 }
  const headH = P ? 128 : 48
  const rowH = P ? 78 : 40
  table.h = headH + MROWS.length * rowH
  return { bar, legend, table, headH, rowH, h: Math.max(v.H, table.y + table.h + 60) }
}
function MatrixPage({ v }: { v: V }) {
  const lay = matLayout(v)
  const P = v.phone
  const { table, headH, rowH } = lay
  const colW = P ? (v.w - 16 - 24) / 4 : 100
  const colX = (u: number) => (P ? table.x + 8 + u * (colW + 8) : table.x + table.w - 16 - (4 - u) * colW)
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={v.w} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>Personal</span></Box>
      <Box {...lay.bar} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/categories/personal.png" x={v.x + 24} y={lay.bar.y + 16} w={36} />
      <Box x={v.x + 72} y={lay.bar.y + 23} w={220} h={22} className="flex items-center"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">The Adulting Life Organiser</span></Box>
      <Box x={P ? v.x + 24 : v.x + 290} y={P ? lay.bar.y + 62 : lay.bar.y + 16} w={300} h={36} className="font-display text-2xl leading-9 text-white">Personal</Box>
      <Box x={P ? v.x + 24 : v.x + v.w - 24 - 108 - 8 - 104 - 8 - 128 - 8 - 214} y={P ? lay.bar.y + 104 : lay.bar.y + 54} w={214} h={40} className="flex items-center gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs">
        {["List", "Grid", "Matrix"].map((m) => <span key={m} className={`inline-flex h-8 flex-1 items-center justify-center rounded-full font-medium ${m === "Matrix" ? "bg-white text-black" : "text-white/85"}`}>{m}</span>)}
      </Box>
      <Box x={P ? v.x + 24 : v.x + v.w - 24 - 108 - 8 - 104 - 8 - 128} y={P ? lay.bar.y + 150 : lay.bar.y + 56} w={P ? 230 : 360} h={36} className="flex items-center gap-2">
        <PdfPair phone={P} />
        <span className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-medium text-black"><PlusIcon />New Folder</span>
      </Box>
      <Box {...lay.legend} className={`text-xs text-tal-plum-soft ${P ? "" : "flex items-center justify-between"}`}>
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {(["done", "started", "empty"] as const).map((c) => (
            <span key={c} className="inline-flex items-center gap-1"><span className={`inline-flex h-4 w-4 items-center justify-center rounded ${CELL[c].bg} ${CELL[c].c}`}>{CELL[c].s}</span>{c === "done" ? "complete" : c === "started" ? "in progress" : "empty"}</span>
          ))}
          <span className="inline-flex items-center gap-1"><span className="inline-flex h-4 w-4 items-center justify-center">—</span>not applicable</span>
        </span>
        <span className={`font-medium text-tal-plum ${P ? "mt-2 block" : ""}`}>16 folders in this section</span>
      </Box>
      <Box {...table} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={table.x} y={table.y} w={table.w} h={headH} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      {!P && <Box x={table.x + 16} y={table.y + 14} w={200} h={20} className="text-sm font-medium text-tal-plum-soft">Folder</Box>}
      {PEOPLE.map((p, u) => (
        P ? (
          <Box key={p} x={colX(u)} y={table.y + 8} w={colW} h={headH - 16} className="flex items-end justify-center">
            <div className="truncate text-xs font-medium leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{p}{u === 0 && <span className="ml-1 text-tal-plum-soft">★</span>}</div>
          </Box>
        ) : (
          <Box key={p} x={colX(u)} y={table.y + 6} w={colW} h={36} className="whitespace-nowrap text-center text-[13px] font-medium leading-4">{p}<p className="mt-0.5 text-[9px] uppercase tracking-wider text-tal-plum-soft">{u < 2 ? (u === 0 ? "adult · primary" : "adult") : "child"}</p></Box>
        )
      ))}
      {MROWS.map((r, n) => {
        const y = table.y + headH + n * rowH
        return (
          <div key={r.id}>
            {n > 0 && <Box x={table.x} y={y} w={table.w} h={1} className="bg-tal-line" />}
            <Box x={table.x + 12} y={P ? y + 8 : y} w={P ? table.w - 24 : colX(0) - table.x - 24} h={P ? 24 : rowH} className="flex items-center gap-2 text-sm">
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
              <Thumb src={`/thumbnails/subcategories/${r.id}.png`} size={P ? 24 : 28} className="rounded-md ring-1 ring-tal-line" />
              <span className="min-w-0 truncate">{r.n}</span>
              {r.users && <span className="ml-1 shrink-0 text-[10px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
            </Box>
            {r.c ? r.c.split("").map((k, u) => {
              const c = CELL[CK[k]]
              return <Box key={u} x={colX(u)} y={P ? y + 38 : y + 1} w={colW} h={P ? 32 : rowH - 1} className={`flex items-center justify-center ${P ? "rounded-md" : ""} ${c.bg}`}><span className={c.c}>{c.s}</span></Box>
            }) : (
              <Box x={colX(0)} y={P ? y + 38 : y + 1} w={colX(3) + colW - colX(0)} h={P ? 32 : rowH - 1} className={`flex items-center justify-center gap-2 ${P ? "rounded-md" : ""} ${CELL.done.bg}`}>
                <span className={CELL.done.c}>✓</span><span className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">· shared with family</span>
              </Box>
            )}
          </div>
        )
      })}
    </Shell>
  )
}

// ── The Organiser (records/page, the top of it) ──────────────────────────────

const CATS = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 6, total: 16, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 4, total: 20, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
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

// ── Peace of Mind Planner (templates/peace-of-mind-planner) ──────────────────

const POM_INTRO = "The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view."
const POM_NOTE = "One document, in the same order as the printed Planner — to keep somewhere safe."
// Only sections with something in them show (the page hides empty ones).
const POM_GROUPS: { g: string; rows: { t: string; hint: string; org: boolean; n?: number }[] }[] = [
  { g: "My Personal Information", rows: [{ t: "My Personal Information", hint: "Your name, date of birth, contact details and addresses — from Family Members.", org: false }] },
  { g: "Important Consultants & Contacts", rows: [
    { t: "Doctors", hint: "GP and any specialists — shared with the Organiser's Medical Advisers folder.", org: true, n: 1 },
    { t: "Family Members", hint: "Contact details for your family — from the Organiser's Family Members folder.", org: false },
  ] },
  { g: "Device Access Details", rows: [{ t: "Device Access Details", hint: "Phones, tablets, computers — shared with the Organiser's Device Access folder.", org: true, n: 1 }] },
]
function pomLayout(v: V) {
  const P = v.phone
  let y = v.top + 24
  const title = { x: v.x, y, w: v.w, h: 40 }; y += 48
  const introH = wrapLines(POM_INTRO, P ? v.w : 672, 7.8) * 24
  const intro = { x: v.x, y, w: P ? v.w : 672, h: introH }; y += introH + 24
  const noteH = P ? wrapLines(POM_NOTE, v.w - 96, 6.2) * 16 : 36
  const pdf = { x: v.x, y, w: v.w, h: Math.max(36, noteH) }; y += pdf.h + 24
  const bw = P ? v.w : 768
  const banner = { x: v.x, y, w: bw, h: Math.round(bw / 4) }; y += banner.h + 24
  const groups: { g: string; y: number; rows: Rect[] }[] = []
  for (const grp of POM_GROUPS) {
    const gy = y; y += 28 + 8
    const rows: Rect[] = []
    for (const r of grp.rows) {
      const h = 24 + 24 + 2 + wrapLines(r.hint, v.w - 32 - 36 - (P ? 96 : 120), 6.2) * 16
      rows.push({ x: v.x, y, w: v.w, h }); y += h + 8
    }
    groups.push({ g: grp.g, y: gy, rows }); y += 16
  }
  return { title, intro, pdf, banner, groups, h: Math.max(v.H, y + 60) }
}
function PomPage({ v }: { v: V }) {
  const lay = pomLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_PLANNER}>
      <Box x={v.x} y={v.top} w={200} h={20} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box {...lay.title} className="font-display text-3xl leading-10">Peace of Mind Planner</Box>
      <Box {...lay.intro} className="leading-6 text-tal-plum-soft">{POM_INTRO}</Box>
      <Box {...lay.pdf} className="flex items-center gap-2">
        <PdfPair phone={v.phone} />
        <span className="min-w-0 text-xs text-tal-plum-soft">{POM_NOTE}</span>
      </Box>
      <Img src="/thumbnails/banners/planner.jpg" x={lay.banner.x} y={lay.banner.y} w={lay.banner.w} h={lay.banner.h} className="rounded-2xl border border-tal-line" />
      {lay.groups.map((grp, gi) => (
        <div key={grp.g}>
          <Box x={v.x} y={grp.y} w={v.w} h={28} className="font-display text-lg">{grp.g}</Box>
          {grp.rows.map((r, ri) => {
            const row = POM_GROUPS[gi].rows[ri]
            return (
              <Box key={row.t} {...r} className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${row.org ? "bg-tal-cream-soft ring-1 ring-tal-line" : "bg-white text-tal-plum-soft ring-1 ring-tal-line"}`}>{row.org ? "↔" : "◇"}</span>
                  <div className="min-w-0"><div className="font-medium leading-6">{row.t}</div><div className="mt-0.5 text-xs leading-4 text-tal-plum-soft">{row.hint}</div></div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`text-xs ${row.org ? "text-green-700" : "text-tal-plum-soft"}`}>{row.org ? `${row.n} entry` : "Planner-only"}</span>
                  <span className="text-sm text-tal-plum-soft">→</span>
                </div>
              </Box>
            )
          })}
        </div>
      ))}
    </Shell>
  )
}

// ── Learn (learn/page) ───────────────────────────────────────────────────────

const PATHS = [
  { id: "personal", t: "Personal", n: 14, bg: "bg-violet-100 ring-violet-200", text: "text-violet-800" },
  { id: "health", t: "Health", n: 12, bg: "bg-amber-100 ring-amber-200", text: "text-amber-900" },
  { id: "education", t: "Education", n: 7, bg: "bg-sky-100 ring-sky-200", text: "text-sky-900" },
  { id: "employment", t: "Employment", n: 11, bg: "bg-rose-100 ring-rose-200", text: "text-rose-900" },
  { id: "admin", t: "Admin & Bookkeeping", n: 14, bg: "bg-emerald-100 ring-emerald-200", text: "text-emerald-900" },
]
const TOTAL_ARTICLES = 58
function learnLayout(v: V) {
  const P = v.phone
  const mw = P ? v.w : 610
  const head = { x: v.x, y: v.top, w: mw, h: P ? 150 : 96 }
  const cw = P ? v.w : (mw - 16) / 2
  const resume = { x: v.x, y: head.y + head.h + 24, w: cw, h: P ? 176 : 204 }
  const pro = P ? { x: v.x, y: resume.y + resume.h + 16, w: v.w, h: 190 } : { x: v.x + cw + 16, y: resume.y, w: cw, h: 204 }
  const pathsY = pro.y + pro.h + 24
  const tw = P ? (v.w - 12) / 2 : (mw - 48) / 5
  const th = P ? 170 : 186
  const tile = (n: number) => (P ? { x: v.x + (n % 2) * (tw + 12), y: pathsY + 40 + Math.floor(n / 2) * (th + 12), w: tw, h: th } : { x: v.x + n * (tw + 12), y: pathsY + 40, w: tw, h: th })
  const pathsEnd = tile(PATHS.length - 1).y + th
  const aside = P ? undefined : { x: v.x + mw + 24, y: v.top, w: v.w - mw - 24, h: 0 }
  return { head, resume, pro, pathsY, tile, aside, h: Math.max(v.H, pathsEnd + 80) }
}
function LearnPage({ v }: { v: V }) {
  const lay = learnLayout(v)
  const a = lay.aside
  return (
    <Shell v={v} h={lay.h} nav={NAV_LEARN}>
      <Box {...lay.head} className="flex flex-wrap content-center items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft px-5">
        <Thumb src="/thumbnails/learn/adulting-hub.png" size={40} className="rounded-xl ring-1 ring-white" />
        <span className="font-display text-2xl leading-tight">The Adulting Life Unlocked</span>
        <span className="text-tal-plum-soft/50">·</span>
        <span className="text-sm text-tal-plum-soft">Practical lessons to help you navigate life with confidence.</span>
      </Box>
      <Box {...lay.resume} className="rounded-2xl bg-violet-100 p-5 ring-1 ring-violet-200">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-violet-800">Start here</div>
        <div className="flex items-start gap-3">
          <Thumb src="/thumbnails/categories/personal.png" size={48} className="rounded-xl ring-1 ring-white" />
          <div className="min-w-0 flex-1"><div className="font-display text-lg leading-tight">The Adulting Life Information Form</div><div className="mt-1 text-xs text-tal-plum-soft">Personal · 4 min read</div></div>
        </div>
        <div className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-black px-3 text-sm font-medium text-white">Start lesson →</div>
      </Box>
      <Box {...lay.pro} className="overflow-hidden rounded-2xl bg-tal-cream p-5 ring-1 ring-tal-cream">
        <div className="absolute right-4 top-4 text-2xl">🏆</div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-widest">Keep going</div>
        <div className="font-display text-xl leading-tight">You&apos;re becoming an Adulting Pro!</div>
        <div className="mt-4 flex items-baseline gap-2"><span className="font-display text-2xl leading-none">0%</span><span className="text-sm text-tal-plum-soft">complete</span></div>
        <div className="mt-2 h-2 rounded-full bg-white" />
        <div className="mt-2 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">0 of {TOTAL_ARTICLES} lessons read</span><span className="font-medium">Next lesson →</span></div>
      </Box>
      <Box x={v.x} y={lay.pathsY} w={lay.head.w} h={28} className="flex items-baseline justify-between">
        <span className="font-display text-xl">Your Learning Paths</span><span className="text-xs text-tal-plum-soft">0 of {TOTAL_ARTICLES} lessons complete</span>
      </Box>
      {PATHS.map((p, n) => (
        <Box key={p.id} {...lay.tile(n)} className={`flex flex-col rounded-2xl p-4 ring-1 ${p.bg}`}>
          <Thumb src={`/thumbnails/categories/${p.id}.png`} size={48} className="mb-2 rounded-xl ring-1 ring-white" />
          <div className={`text-sm font-medium leading-tight ${p.text}`}>{p.t}</div>
          <div className="mt-0.5 text-[11px] text-tal-plum-soft">{p.n} lessons</div>
          <div className="mt-auto h-1.5 rounded-full bg-white/70" />
          <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-tal-plum-soft"><span>0/{p.n}</span><span className="font-medium">0%</span></div>
        </Box>
      ))}
      {a && (
        <>
          <Box x={a.x} y={a.y} w={a.w} h={112} className="rounded-2xl bg-amber-100 p-5 ring-1 ring-amber-200">
            <div className="flex items-start justify-between">
              <div><div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-amber-900">Learning streak</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl leading-none text-amber-900">0</span><span className="text-sm text-amber-900/80">days</span></div></div>
              <div className="text-3xl">🔥</div>
            </div>
            <div className="mt-1 text-xs text-amber-900/80">Read a lesson today to start</div>
          </Box>
          <Box x={a.x} y={a.y + 128} w={a.w} h={100} className="rounded-2xl border border-tal-line bg-white p-5">
            <div className="mb-3 font-display text-lg">Recently earned</div>
            <p className="text-sm text-tal-plum-soft">Read your first article to earn a badge.</p>
          </Box>
          <Box x={a.x} y={a.y + 244} w={a.w} h={244} className="rounded-2xl border border-tal-line bg-white p-5">
            <div className="mb-3 flex items-center justify-between"><span className="font-display text-lg">Up next</span><span className="text-xs text-tal-plum-soft">View all →</span></div>
            {["Birth Certificate", "Marriage Certificate", "Passport & Travel Documents"].map((t) => (
              <div key={t} className="flex items-center gap-3 py-2">
                <Thumb src="/thumbnails/categories/personal.png" size={40} className="rounded-lg ring-1 ring-white" />
                <div className="min-w-0 flex-1"><div className="text-sm font-medium leading-snug">{t}</div><div className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Personal</div></div>
                <span className="text-tal-plum-soft">→</span>
              </div>
            ))}
          </Box>
        </>
      )}
    </Shell>
  )
}

// ── Quizzes (learn/quizzes) ──────────────────────────────────────────────────

const QUIZZES = ["The Adulting Life Information Form", "Birth Certificate", "Marriage Certificate", "Passport & Travel Documents", "Will & Funeral Instructions", "Power of Attorney Details"]
function quizLayout(v: V) {
  const filters = { x: v.x, y: v.top + 20 + 4 + 40 + 8 + 24 + 24, w: 220, h: 32 }
  const sec = filters.y + 32 + 24
  const row = (n: number) => ({ x: v.x, y: sec + 40 + n * 66, w: v.w, h: 58 })
  return { filters, sec, row, h: Math.max(v.H, row(QUIZZES.length).y + 60) }
}
function QuizzesPage({ v }: { v: V }) {
  const lay = quizLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_LEARN}>
      <Box x={v.x} y={v.top} w={200} h={20} className="text-sm text-tal-plum-soft">← Learn</Box>
      <Box x={v.x} y={v.top + 24} w={v.w} h={40} className="font-display text-3xl leading-10">Quizzes</Box>
      <Box x={v.x} y={v.top + 72} w={v.w} h={24} className="text-tal-plum-soft">58 quizzes across 5 areas.</Box>
      <Box {...lay.filters} className="flex items-center gap-2">
        {["Library", "Taken", "Passed"].map((f) => <span key={f} className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${f === "Library" ? "border-tal-plum bg-black text-white" : "border-tal-line bg-white text-tal-plum-soft"}`}>{f}</span>)}
      </Box>
      <Box x={v.x} y={lay.sec} w={v.w} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Personal</span><span className="text-sm text-tal-plum-soft">View all →</span></Box>
      {QUIZZES.map((q, n) => <Box key={q} {...lay.row(n)} className="flex items-center rounded-xl border border-tal-line bg-white p-4 font-medium">{q}</Box>)}
    </Shell>
  )
}

// ── Videos (learn/videos + WatchedLegend + VideoThumbnail) ───────────────────

const VIDEOS = [
  { t: "Why your birth certificate matters", a: "Birth Certificate" },
  { t: "Applying for a passport", a: "Passport & Travel Documents" },
  { t: "Getting your will sorted", a: "Will & Funeral Instructions" },
]
function vidLayout(v: V) {
  const P = v.phone
  const introH = P ? 48 : 24
  const legend = { x: v.x, y: v.top + 24 + 48 + introH + 16, w: v.w, h: P ? 96 : 46 }
  const sec = legend.y + legend.h + 24
  const cw = P ? v.w : (v.w - 48) / 3
  const ch = Math.round(cw * 9 / 16) + 20 + 32 + 22
  const card = (n: number) => (P ? { x: v.x, y: sec + 40 + n * (ch + 24), w: cw, h: ch } : { x: v.x + n * (cw + 24), y: sec + 40, w: cw, h: ch })
  return { introH, legend, sec, card, thumbH: Math.round(cw * 9 / 16), h: Math.max(v.H, card(VIDEOS.length - 1).y + ch + 60) }
}
function VideosPage({ v }: { v: V }) {
  const lay = vidLayout(v)
  return (
    <Shell v={v} h={lay.h} nav={NAV_LEARN}>
      <Box x={v.x} y={v.top} w={200} h={20} className="text-sm text-tal-plum-soft">← Learn</Box>
      <Box x={v.x} y={v.top + 24} w={v.w} h={40} className="font-display text-3xl leading-10">Videos</Box>
      <Box x={v.x} y={v.top + 72} w={v.w} h={lay.introH} className="leading-6 text-tal-plum-soft">Every video across every category. Click a thumbnail to watch.</Box>
      <Box {...lay.legend} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-tal-line bg-white px-4 py-3 text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-tal-plum-soft">Key</span>
        <span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"><span className="inline-block h-2 w-2 rounded-full bg-white" />Unseen</span><span className="text-tal-plum-soft">You haven&apos;t watched this yet</span></span>
        <span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">✓ Watched</span><span className="text-tal-plum-soft">Played to the end, or you&apos;ve marked it watched</span></span>
      </Box>
      <Box x={v.x} y={lay.sec} w={v.w} h={28} className="font-display text-xl">Personal</Box>
      {VIDEOS.map((vd, n) => {
        const c = lay.card(n)
        return (
          <Box key={vd.t} {...c}>
            <div className="relative w-full overflow-hidden rounded-xl border border-tal-line bg-gradient-to-br from-tal-plum to-black" style={{ height: lay.thumbH }}>
              <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/90 shadow-lg"><svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 text-white" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg></span></span>
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"><span className="inline-block h-2 w-2 rounded-full bg-white" />Unseen</span>
            </div>
            <div className="mt-1 text-xs text-tal-plum-soft underline">Mark as watched</div>
            <div className="mt-2 font-medium">{vd.t}</div>
            <div className="mt-1 text-xs text-tal-plum-soft underline">{vd.a} ↗</div>
          </Box>
        )
      })}
    </Shell>
  )
}

// ── A record (records/[category]/r/[id] + RecordEditor) ──────────────────────

const REC_RAV4 = { cat: "Personal", sub: "Custom — Vehicle Details & Copy of Registration Certificate", title: "Toyota RAV4 registration", expiry: "03/12/2026", tags: ["glovebox"], notes: "QLD rego 482·KTV. Renew online with TMR." }
function recLayout(v: V) {
  const sp = REC_RAV4
  const crumb = ["Records", sp.cat, sp.sub, sp.title].join(" › ")
  const crumbLines = v.phone ? wrapLines(crumb, v.w, 7) : 1
  const titleY = v.top + crumbLines * 20 + 12
  const pillW = 100
  const titleLines = v.phone ? wrapLines(sp.title, v.w - pillW - 12, 16.5) : 1
  const fw = v.phone ? v.w : 672
  let y = titleY + titleLines * 40 + 24
  const title = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const expiry = { x: v.x, y, w: fw, h: 68 }; y += 68 + 24
  const tags = { x: v.x, y, w: fw, h: 100 }; y += 100 + 24
  const notes = { x: v.x, y, w: fw, h: 112 }; y += 112 + 24
  const save = { x: v.x, y, w: 140, h: 44 }
  const pill = { x: v.x + v.w - pillW, y: titleY + 8, w: pillW, h: 26 }
  return { crumbLines, titleY, titleLines, pillW, title, expiry, tags, notes, save, pill, h: Math.max(v.H, y + 120) }
}
function Field({ r, label, value, w }: { r: Rect; label: string; value: string; w?: number }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-sm">{label}</p>
      <div className="flex h-11 items-center rounded-xl border border-tal-line bg-white px-3" style={{ width: w ?? "100%" }}>{value}</div>
    </Box>
  )
}
function RecordPage({ v }: { v: V }) {
  const lay = recLayout(v)
  const sp = REC_RAV4
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={v.w} h={lay.crumbLines * 20} className="flex flex-wrap items-center gap-x-1.5 text-sm leading-5 text-tal-plum-soft">
        <span>Records</span><span className="opacity-60">›</span><span>{sp.cat}</span><span className="opacity-60">›</span><span>{sp.sub}</span>
        <span className="opacity-60">›</span><span className="font-medium text-tal-plum">{sp.title}</span>
      </Box>
      <Box x={v.x} y={lay.titleY} w={v.w - lay.pillW - 12} h={lay.titleLines * 40} className="font-display text-3xl leading-10">{sp.title}</Box>
      <Box {...lay.pill} className="flex items-center justify-center rounded-full bg-amber-100 text-xs text-amber-800">Expiring soon</Box>
      <Field r={lay.title} label="Title" value={sp.title} />
      <Field r={lay.expiry} label="Expiry date (optional)" value={sp.expiry} w={190} />
      <Box {...lay.tags}>
        <p className="mb-1 text-sm">Tags (optional)</p>
        <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-tal-line bg-white p-2">
          {sp.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">{t}<span className="text-violet-600">×</span></span>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="text-tal-plum-soft">Existing:</span>{["wallet", "renewals"].map((t) => <span key={t} className="rounded-full border border-tal-line px-2 py-0.5">+ {t}</span>)}</div>
      </Box>
      <Box {...lay.notes}><p className="mb-1 text-sm">Notes (optional)</p><div className="h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm">{sp.notes}</div></Box>
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save changes</Box>
      <Box x={v.x + 152} y={lay.save.y} w={96} h={44} className="flex items-center justify-center rounded-xl border border-red-200 text-red-700">Delete</Box>
    </Shell>
  )
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

const S: Record<string, TState> = {
  start: { tasks: L_START, filter: "open", count: 7 },
  startAll: { tasks: L_START, filter: "all", count: 7 },
  formEmpty: { tasks: L_START, filter: "open", count: 7, form: "empty" },
  formError: { tasks: L_START, filter: "open", count: 7, form: "error" },
  formTyping: { tasks: L_START, filter: "open", count: 7, form: "typing" },
  formDate: { tasks: L_START, filter: "open", count: 7, form: "date" },
  formMenu: { tasks: L_START, filter: "open", count: 7, form: "menu" },
  formFilled: { tasks: L_START, filter: "open", count: 7, form: "filled" },
  added: { tasks: L_ADDED, filter: "open", count: 8, form: "cleared" },
  addedClosed: { tasks: L_ADDED, filter: "open", count: 8 },
  ticked: { tasks: L_TICKED, filter: "open", count: 8 },
  tickedAll: { tasks: L_TICKED, filter: "all", count: 8 },
  confirm: { ...S_CONFIRM, confirm: "excursion" },
  deleted: { tasks: L_DELETED, filter: "all", count: 8 },
  allDone: { tasks: L_ALLDONE, filter: "open", count: 0, setup: false },
  fabs: { tasks: L_ADDED, filter: "open", count: 8, fabs: true },
}

function buildScreens(v: V): Record<string, ReactNode> {
  const out: Record<string, ReactNode> = {}
  for (const [k, s] of Object.entries(S)) out[k] = <TasksPage v={v} s={s} />
  return {
    ...out,
    family: <FamilyPage v={v} />,
    matrix: <MatrixPage v={v} />,
    org: <Organiser v={v} />,
    pom: <PomPage v={v} />,
    learn: <LearnPage v={v} />,
    quizzes: <QuizzesPage v={v} />,
    videos: <VideosPage v={v} />,
    rav4: <RecordPage v={v} />,
  }
}

const BASE = "app.theadultinglife.com.au"
const U = {
  tasks: `${BASE}/tasks`,
  family: `${BASE}/records/personal/personal.family_members`,
  personal: `${BASE}/records/personal`,
  org: `${BASE}/records`,
  pom: `${BASE}/templates/peace-of-mind-planner`,
  learn: `${BASE}/learn`,
  quizzes: `${BASE}/learn/quizzes`,
  videos: `${BASE}/learn/videos`,
  rav4: `${BASE}/records/personal/r/8b21d4`,
}

function buildSteps(v: V): WalkStep[] {
  const P = v.phone
  // Scroll a tall screen so `y` sits about 40% of the way down the view.
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  // Zoom on a rect - centred and kept modest on a phone so full-width rows aren't clipped.
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.04) : s })
  // Zoom on a small target (a button) - fine at a higher scale on both.
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })

  const L0 = tLayout(v, S.start), LA0 = tLayout(v, S.startAll)
  const LF = tLayout(v, S.formEmpty), LE = tLayout(v, S.formError), LM = tLayout(v, S.formMenu)
  const LAd = tLayout(v, S.added), LAc = tLayout(v, S.addedClosed)
  const LT = tLayout(v, S.ticked), LTA = tLayout(v, S.tickedAll), LD = tLayout(v, S.deleted), LZ = tLayout(v, S.allDone)
  const fam = famLayout(v), mat = matLayout(v), ol = orgLayout(v), pl = pomLayout(v), ll = learnLayout(v), ql = quizLayout(v), vl = vidLayout(v), rl = recLayout(v)
  const fab = FAB(v)
  const item = (id: string) => L0.items[setupIx(id)]
  const s0 = (r: Rect) => sc(L0.h, r.y + r.h / 2)
  const setupStep = (id: string, caption: string, detail: string, ring?: Rect): WalkStep => {
    const r = item(id)
    return { screen: "start", url: U.tasks, scroll: s0(r), caption, detail, focus: fz(ring ?? r, 1.25), ring: pad(ring ?? r, 3), click: { x: r.x + (P ? 120 : 200), y: r.y + r.h / 2 }, duration: 6500 }
  }
  const rego = rowOf(L0, "rego"), report = rowOf(L0, "report")
  const reportA = rowOf(LA0, "report"), excA = rowOf(LA0, "excursion")
  const form = LF.form!, formE = LE.form!, formM = LM.form!
  const menuRect = { x: P ? v.x + 17 : formM.sel.x, y: formM.sel.y + 44, w: P ? v.w - 34 : formM.sel.w, h: RECORD_OPTS.length * 34 + 8 }
  const fa = rowOf(LAd, "firstaid")
  const reportC = rowOf(LAc, "report")
  const excT = rowOf(LTA, "excursion"), reportT = rowOf(LTA, "report")
  const cScroll = confirmScroll(v)
  const dlg = confirmRect(v, cScroll, CONFIRM_TITLE)
  const btns = confirmBtns(dlg)
  const empty = LZ.empty!
  const formTop = sc(LF.h, LF.form!.box.y + 60)
  const setupHead = { x: L0.setup!.x, y: L0.setup!.y, w: L0.setup!.w, h: 68 }
  const countRing = P ? { x: L0.hdr.x + 20, y: L0.hdr.y + 58, w: 150, h: 32 } : { x: L0.hdr.x + 276, y: L0.hdr.y + 16, w: 124, h: 36 }
  const famPick = item("family")

  return [
    // The page
    { screen: "start", url: U.tasks, caption: "Tasks: your list", detail: P ? "Your running list of things to do. Open it from the ☰ menu." : "Your running list of things to do. Open it from Tasks in the sidebar.", focus: fz(L0.hdr, 1.3), ring: L0.hdr, duration: 6500 },
    { screen: "start", url: U.tasks, caption: "7 things to do", detail: "Your own open tasks plus the setup steps you haven't done yet. When it's all done it says \"You're all caught up\".", focus: fzs(countRing, P ? 1.5 : 1.8), ring: pad(countRing, 2), duration: 6000 },
    // Setup steps
    { screen: "start", url: U.tasks, scroll: s0(setupHead), caption: "Setup steps", detail: "Nine steps to get going - they tick themselves off as you use the app. 5 of 9 done so far. The whole box goes once they're all done.", focus: P ? undefined : fz(L0.setup!, 1.0), ring: L0.setup!, duration: 7500 },
    { screen: "start", url: U.tasks, scroll: s0(famPick), caption: "Done steps are crossed out", detail: "Green tick and a line through. They still open their page if you want to go back.", focus: fz(span(famPick, item("pom1")), P ? 1.0 : 1.15), ring: pad(span(famPick, item("pom1")), 3), duration: 6000 },
    setupStep("family", "Add your family members", "Click a step to go to where it's done."),
    { screen: "family", url: U.family, scroll: P ? sc(fam.h, fam.row(1).y) : 0, caption: "The Family Members folder", detail: "Everyone you're organising for, with + Add user for each person. Sarah has added James, Mia and Leo and marked the list complete - that ticked the step.", focus: fz(span(fam.row(0), fam.banner), P ? 1.0 : 1.1), ring: pad(span(fam.row(0), fam.banner), 4), duration: 8000 },
    setupStep("physical", "Got the physical organiser?", "If you have the printed Adulting Life organiser, file the paper copies as you fill in each folder."),
    { screen: "matrix", url: U.personal, scroll: P ? sc(mat.h, mat.table.y + 120) : 0, caption: "The Personal section", detail: "Every folder in Personal - the same order as the printed organiser - with a tick, half or cross for each person.", focus: fz(mat.table, P ? 1.0 : 1.05), ring: pad({ ...mat.table, h: Math.min(mat.table.h, P ? 480 : 360) }, 4), duration: 7500 },
    setupStep("fstart", "Start, then finish, a folder", "\"Start filling in an Organiser folder\" and \"Finish filling in an Organiser folder\" both open the Organiser.", span(item("fstart"), item("fdone"))),
    { screen: "org", url: U.org, caption: "The Organiser", detail: "Choose a category, open a folder and fill it in. Each category shows how many folders are complete.", focus: P ? undefined : { x: 720, y: 440, scale: 1.05 }, ring: pad(span(ol.catsHead, ol.cat(P ? 1 : 4)), 4), duration: 6500 },
    setupStep("pom1", "Peace of Mind sections", "\"Fill in one Peace of Mind section\" and \"Complete 5 Peace of Mind sections\" both open the Planner.", span(item("pom1"), item("pom5"))),
    { screen: "pom", url: U.pom, scroll: P ? sc(pl.h, pl.groups[1].y + 40) : sc(pl.h, pl.groups[0].y + 100), caption: "The Peace of Mind Planner", detail: "What your family would need to know if something happened to you. Sections with something in them show here - Sarah has 1 so far, 4 to go for this step.", focus: fz(span(pl.groups[0].rows[0], pl.groups[2].rows[0]), P ? 1.0 : 1.1), ring: pad(span(pl.groups[0].rows[0], pl.groups[2].rows[0]), 4), duration: 8000 },
    setupStep("article", "Read your first Learn article", "Not done yet - no tick."),
    { screen: "learn", url: U.learn, caption: "Learn", detail: "Short lessons for every part of the Organiser. \"Start here\" opens the first one; reading it ticks this step.", focus: fz(span(ll.resume, ll.pro), P ? 1.0 : 1.2), ring: pad(P ? ll.resume : span(ll.resume, ll.pro), 4), click: { x: ll.resume.x + 80, y: ll.resume.y + ll.resume.h - 38 }, duration: 7500 },
    setupStep("quiz", "Take a quiz", "A quick quiz for each lesson."),
    { screen: "quizzes", url: U.quizzes, caption: "Quizzes", detail: "Pick any quiz to take it. Library shows them all; Taken and Passed show the ones you've done.", focus: fz(span(ql.filters, ql.row(2)), P ? 1.0 : 1.2), ring: pad(span(ql.filters, ql.row(2)), 4), duration: 7000 },
    setupStep("video", "Watch a Learn video", "The last step."),
    { screen: "videos", url: U.videos, scroll: P ? sc(vl.h, vl.card(0).y + 120) : 0, caption: "Videos", detail: "Click a thumbnail to watch. Red Unseen turns green Watched once it's played to the end - or tap Mark as watched.", focus: fz(P ? vl.card(0) : span(vl.legend, vl.card(2)), P ? 1.0 : 1.1), ring: pad(P ? vl.card(0) : span(vl.legend, vl.card(2)), 4), duration: 7500 },
    // Your own tasks
    { screen: "start", url: U.tasks, scroll: s0(rego.box), caption: "Your own tasks", detail: "Underneath is your own list - a call to make, a form to fill, a doc to upload. Soonest due date first.", focus: fz(span(L0.bar, report.box), P ? 1.0 : 1.15), ring: pad(span(L0.bar, report.box), 4), duration: 6500 },
    { screen: "start", url: U.tasks, scroll: s0(rego.box), caption: "A task", detail: "The circle ticks it off. Under the title: when it's due, and the record it's linked to. × deletes it.", focus: fz(rego.box, 1.35), ring: rego.box, duration: 6500 },
    { screen: "start", url: U.tasks, scroll: s0(report.box), caption: "No date or record?", detail: "Then it shows the day you added it.", focus: fz(report.box, 1.35), ring: report.box, duration: 5000 },
    { screen: "start", url: U.tasks, scroll: s0(rego.box), caption: "Click the linked record", detail: "→ Toyota RAV4 registration.", focus: fzs(rego.link!, P ? 1.6 : 1.8), ring: pad(rego.link!, 3), click: mid(rego.link!), duration: 5000 },
    { screen: "rav4", url: U.rav4, caption: "The RAV4's record", detail: "Everything about it is here - the rego expires 3 Dec.", focus: fz(span(rl.title, rl.expiry), 1.2), ring: pad(span(rl.title, rl.expiry)), duration: 6000 },
    // Open / All
    { screen: "start", url: U.tasks, scroll: s0(L0.bar), caption: "Open and All", detail: "Open shows what's still to do. All shows the done ones too.", focus: fzs(span(L0.openBtn, L0.allBtn), P ? 1.6 : 1.8), ring: pad(span(L0.openBtn, L0.allBtn), 3), click: mid(L0.allBtn), duration: 5500 },
    { screen: "startAll", url: U.tasks, scroll: sc(LA0.h, reportA.box.y), caption: "All (4)", detail: "Done ones have a green tick and a line through.", focus: fz(excA.box, 1.35), ring: excA.box, click: mid(LA0.openBtn), duration: 6000 },
    // Add a task
    { screen: "start", url: U.tasks, scroll: s0(L0.bar), caption: "Add a task", detail: "Something new for the list.", focus: fzs(L0.addBtn, P ? 1.6 : 1.8), ring: pad(L0.addBtn, 3), click: mid(L0.addBtn), duration: 5000 },
    { screen: "formEmpty", url: U.tasks, scroll: formTop, caption: "The add form", detail: "It opens above your list, and the button changes to Close.", focus: fz(span(LF.bar, form.box), P ? 1.0 : 1.15), ring: pad(form.box, 3), duration: 6000 },
    { screen: "formEmpty", url: U.tasks, scroll: formTop, caption: "A title is the only must", detail: "Press Save with nothing in it and…", focus: fzs(form.save, P ? 1.6 : 1.8), ring: pad(form.save, 3), click: mid(form.save), duration: 4500 },
    { screen: "formError", url: U.tasks, scroll: formTop, caption: "\"Give it a title.\"", detail: "Nothing is added until it has one.", focus: fz(formE.err!, 1.4), ring: pad(formE.err!, 3), duration: 5000 },
    { screen: "formTyping", url: U.tasks, scroll: formTop, caption: "What do you need to do?", detail: "A few words is plenty.", focus: fz(form.title, 1.4), ring: pad(form.title, 3), duration: 6500 },
    { screen: "formDate", url: U.tasks, scroll: formTop, caption: "Due (optional)", detail: "Pick a date from the calendar. Tasks with a date sort to the top, soonest first.", focus: fzs(form.date, P ? 1.6 : 1.8), ring: pad(form.date, 3), duration: 6000 },
    { screen: "formMenu", url: U.tasks, scroll: formTop, caption: "Link to a record (optional)", detail: "Choose one of your Organiser records so the task links straight to it - or leave it on None.", focus: fz(span(formM.sel, menuRect), P ? 1.0 : 1.3), ring: pad(menuRect, 3), duration: 7000 },
    { screen: "formFilled", url: U.tasks, scroll: formTop, caption: "Save", detail: "Sarah's first aid certificate has run out - this links the task to it.", focus: fzs(form.save, P ? 1.6 : 1.8), ring: pad(form.save, 3), click: mid(form.save), duration: 5500 },
    { screen: "added", url: U.tasks, scroll: sc(LAd.h, fa.box.y), caption: "Added to the top", detail: "Due 4 Dec, linked to the certificate. Now Open (4) and 8 things to do. The form stays open, empty, for the next one.", focus: fz(fa.box, 1.35), ring: fa.box, duration: 7000 },
    { screen: "added", url: U.tasks, scroll: sc(LAd.h, LAd.bar.y), caption: "Close", detail: "Hides the form again.", focus: fzs(LAd.addBtn, P ? 1.6 : 1.8), ring: pad(LAd.addBtn, 3), click: mid(LAd.addBtn), duration: 4500 },
    // Tick done
    { screen: "addedClosed", url: U.tasks, scroll: sc(LAc.h, reportC.box.y), caption: "Tick it off", detail: "Uploaded Mia's report? Click the circle.", focus: fzs(reportC.check, P ? 1.7 : 2), ring: pad(reportC.check, 4), click: mid(reportC.check), duration: 5000 },
    { screen: "ticked", url: U.tasks, scroll: sc(LT.h, LT.bar.y + 120), caption: "Off the Open list", detail: "It drops off straight away - Open (3).", focus: fz(span(LT.bar, LT.rows[LT.rows.length - 1].box), P ? 1.0 : 1.15), ring: pad(span(LT.openBtn, LT.allBtn), 3), click: mid(LT.allBtn), duration: 5500 },
    { screen: "tickedAll", url: U.tasks, scroll: sc(LTA.h, reportT.box.y), caption: "Still there under All", detail: "Ticked by mistake? Click the green tick again and it's back on your list.", focus: fz(span(reportT.box, excT.box), P ? 1.0 : 1.25), ring: pad(span(reportT.box, excT.box), 3), duration: 6500 },
    // Delete
    { screen: "tickedAll", url: U.tasks, scroll: cScroll, caption: "× deletes a task", detail: "For good - so it asks first.", focus: fzs(excT.x, P ? 1.7 : 1.8), ring: pad(excT.x, 2), click: mid(excT.x), duration: 5000 },
    { screen: "confirm", url: U.tasks, scroll: cScroll, caption: CONFIRM_TITLE, detail: "Delete removes it; Cancel keeps it.", focus: { x: P ? 195 : 600, y: dlg.y + dlg.h / 2, scale: P ? 1.1 : 1.5 }, ring: pad(span(btns.cancel, btns.ok), 4), click: mid(btns.ok), duration: 6000 },
    { screen: "deleted", url: U.tasks, scroll: sc(LD.h, LD.bar.y + 120), caption: "Gone - All (4)", detail: "", focus: fz(span(LD.bar, LD.rows[LD.rows.length - 1].box), P ? 1.0 : 1.1), ring: pad(span(LD.openBtn, LD.allBtn), 3), duration: 4500 },
    // All done
    { screen: "allDone", url: U.tasks, caption: "When it's all done", detail: "Every setup step and task ticked: \"You're all caught up · nothing open\", and Add your first task starts a new one.", focus: fz(span(LZ.hdr, empty), P ? 1.0 : 1.05), ring: pad(empty, 3), click: mid(emptyBtn(v, empty)), duration: 7500 },
    // Round buttons
    { screen: "fabs", url: U.tasks, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
}

const D_SCREENS = buildScreens(DV)
const P_SCREENS = buildScreens(PV)
const D_STEPS = buildSteps(DV)
const P_STEPS = buildSteps(PV)

export default function TasksPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer music="/audio/pop-dance-music.mp3" key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Tasks (phone)" : "Tasks (computer)"} url={U.tasks} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Tasks", subtitle: "Your setup steps and your own to-do list, ticked off as you go" }} />
  )
}
