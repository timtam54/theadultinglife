"use client"

// "The Adulting Life Organiser" walkthrough for the public /demo page (#organiser)
// and the Organiser's walkthrough button (components/demo/PageWalkthroughFab).
// Hand-built copies of the real screens with a made-up family's sample data
// (the Taylors, Brisbane) - no sign-in, no API calls. Two versions
// (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column; CategoryMatrix's phone matrix)
// Copies: app/(app)/records/page.tsx (header, Expiring or expired, Choose a
// category, StatCards, "New to ..." band), components/HiddenSuggestions,
// app/(app)/records/search/page.tsx + components/AiSearchAssist,
// app/(app)/records/[category]/new/page.tsx + components/RecordEditor,
// app/(app)/records/[category]/r/[id]/page.tsx + components/StatusPill,
// app/(app)/records/[category]/page.tsx + components/FolderListHeader,
// components/PdfActions, components/CategoryMatrix (desktop table + MobileMatrix),
// components/FolderShareButton (+ its "Sharing —" dialog),
// app/(app)/records/[category]/[subcategory] (UserPicker, PageForm warning,
// FileFieldInput "Upload & scan a file"), app/(app)/layout.tsx (header),
// components/AppSidebar + nav-items, components/HeaderQuickBar, components/UserMenu,
// components/HelpButton, components/tour/TourFab, components/demo/PageWalkthroughFab.
// The shell (sidebar, header, round buttons) is copied from DashboardWalkthrough.
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"
import { useWalkthroughView, type WalkthroughDevice } from "./useWalkthroughDevice"

type Rect = { x: number; y: number; w: number; h: number }

const Box = ({ x, y, w, h, children, className = "" }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h }}>{children}</div>
)
const Img = ({ src, x, y, w, h, className = "rounded-xl" }: { src: string; x: number; y: number; w: number; h?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute object-cover ${className}`} style={{ left: x, top: y, width: w, height: h ?? w }} />
)
const Thumb = ({ src, size, className = "rounded-xl" }: { src: string; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`shrink-0 bg-white object-cover ${className}`} style={{ width: size, height: size }} />
)

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 75 }: { text: string; delay?: number; speed?: number }) {
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

// ── Icons (copied from nav-items.tsx, layout.tsx and the Organiser) ──────────

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
const ACTIVE_NAV = 2 // The Adulting Life Organiser
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
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
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
// CategoryMatrix's PlannerShareIcon / FolderShareButton glyph
const ShareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </svg>
)
// CategoryMatrix's AiHelpIcon
const AiHelpIcon = () => (
  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.1 6.4L20.5 10.5 14.1 12.6 12 19l-2.1-6.4L3.5 10.5l6.4-2.1L12 2z" />
      <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
    </svg>
  </span>
)
// FolderListHeader's List / Grid / Matrix icons
const ViewIcon = ({ v }: { v: string }) =>
  v === "List" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  : v === "Grid" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" /></svg>
  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M8 4v16M14 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
// The Organiser's StatCard icons
const STAT_ICONS: ReactNode[] = [
  <svg key="f" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  <svg key="c" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="s" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="b" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 18h10a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.7 1.36A3.5 3.5 0 0 0 7 18Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
]
const HelpDot = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
)

// The three round buttons, bottom right (HelpButton, TourFab, PageWalkthroughFab).
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
      <Box x={right - 200} y={y} w={56} h={56} className="flex items-center justify-center rounded-full bg-black text-white shadow-xl ring-1 ring-white/40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M10 8.3v5.4l4.6-2.7L10 8.3z" fill="currentColor" /><path d="M8 20.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}

// ── Sample data (the Taylors of Brisbane) ────────────────────────────────────

const CATS = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 6, total: 22, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 4, total: 17, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { id: "education", t: "Education", d: "Certificates, transcripts, resumes and study records.", done: 2, total: 9, tone: "bg-sky-50 ring-sky-100", bar: "bg-sky-500", pill: "bg-sky-100 text-sky-800" },
  { id: "employment", t: "Employment", d: "Work contracts, tax details, super and payslips.", done: 3, total: 8, tone: "bg-rose-50 ring-rose-100", bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800" },
  { id: "admin", t: "Admin & Bookkeeping", d: "Finances, accounts, utility bills, insurance and paperwork.", done: 7, total: 21, tone: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-800" },
]
const pct = (c: (typeof CATS)[number]) => Math.round((c.done / c.total) * 100)
// "Expiring or expired" - records with an expiry date within 30 days, or past it.
const EXPIRING = [
  { t: "Toyota RAV4 registration", c: "Personal", d: "2026-12-03", thumb: "/thumbnails/subcategories/personal.vehicle_details.png" },
  { t: "Health insurance card", c: "Health", d: "2026-12-01", thumb: "/thumbnails/subcategories/health.health_insurance_cards.png" },
  { t: "Home & contents insurance", c: "Admin & Bookkeeping", d: "2026-12-15", thumb: "/thumbnails/subcategories/admin.home_insurance.png" },
  { t: "Sarah's first aid certificate", c: "Employment", d: "2026-11-10", thumb: "/thumbnails/categories/employment.png" },
]
const EXPIRED_ROW = 3
const STATS = [
  { v: "5 Categories", s: "Organised for you", c: "bg-violet-50 ring-violet-100", i: "bg-violet-100 text-violet-700" },
  { v: "22 of 77 folders", s: "14 in progress", c: "bg-sky-50 ring-sky-100", i: "bg-sky-100 text-sky-700" },
  { v: "Secure & private", s: "Only you can access", c: "bg-emerald-50 ring-emerald-100", i: "bg-emerald-100 text-emerald-700" },
  { v: "Always backed up", s: "Your data is safe", c: "bg-amber-50 ring-amber-100", i: "bg-amber-100 text-amber-700" },
]
const HIDDEN = [
  { n: "ABN", s: "Personal · not applicable" },
  { n: "Dental Records", s: "Health · snoozed until 21 Dec 2026" },
]
// Personal's matrix (CategoryMatrix) - Sarah, James, Mia (15) and Leo (11)
type Cell = "done" | "started" | "empty" | "na"
const PEOPLE = [
  { n: "Sarah Taylor", k: "adult · primary", primary: true }, { n: "James Taylor", k: "adult" }, { n: "Mia Taylor", k: "child" }, { n: "Leo Taylor", k: "child" },
]
const SUB = (id: string) => `/thumbnails/subcategories/personal.${id}.png`
const ROWS: { name: string; thumb: string; cells?: Cell[]; family?: boolean; users?: boolean; planner?: number }[] = [
  { name: "Family Members", thumb: SUB("family_contacts"), family: true, users: true },
  { name: "Emergency Contacts", thumb: SUB("emergency_contacts"), cells: ["done", "done", "started", "started"], planner: 2 },
  { name: "Birth Certificates", thumb: SUB("birth_certificates"), cells: ["done", "done", "done", "done"], planner: 1 },
  { name: "Passport & Travel Documents", thumb: SUB("passport_travel"), cells: ["started", "done", "empty", "empty"] },
  { name: "Travel Documents", thumb: "/thumbnails/categories/personal.png", cells: ["empty", "empty", "empty", "empty"] },
  { name: "Driver's Licence", thumb: SUB("drivers_licence"), cells: ["done", "done", "na", "na"] },
  { name: "Marriage Certificate", thumb: SUB("marriage_certificate"), cells: ["done", "done", "na", "na"], planner: 0 },
  { name: "Electoral Roll Number & Registered Address", thumb: SUB("electoral_roll"), cells: ["done", "done", "na", "na"] },
  { name: "Will & Funeral Instructions", thumb: SUB("will_funeral"), cells: ["started", "empty", "na", "na"], planner: 1 },
  { name: "Power of Attorney Details", thumb: SUB("power_of_attorney"), cells: ["empty", "empty", "na", "na"], planner: 0 },
  { name: "Custom — Device Access Details", thumb: SUB("device_access"), cells: ["done", "started", "empty", "empty"], planner: 1 },
]
const R_FAMILY = 0, R_EMERG = 1, R_PASSPORT = 3, R_LICENCE = 5
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
const AI_ANSWER = "Your will goes in the Will & Funeral Instructions folder in Personal - add your executor and attach a copy. For your wishes and letters to loved ones, use the Peace of Mind Planner."
const AI_MATCHES = [
  { name: "Will & Funeral Instructions", where: "Personal", why: "store your will and executors" },
  { name: "Peace of Mind Planner", where: "Page", why: "funeral wishes and letters to loved ones" },
]
const FOUND_RECORDS = [
  { t: "Sarah's passport", s: "Personal · expires 2031-03-14", p: "Active", c: "bg-green-100 text-green-800" },
  { t: "James's passport", s: "Personal · expires 2029-08-02", p: "Active", c: "bg-green-100 text-green-800" },
]
const Q1 = "passport"
const Q2 = "how do i add a will"
const ADD_ACTIONS = ["Add record", "Upload document", "Scan document", "Add reminder"]

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: a.y, w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: b.y + b.h - a.y })

// Shared bits of the real pages
function Legend({ phone }: { phone?: boolean }) {
  return (
    <span className={`inline-flex flex-wrap items-center ${phone ? "gap-x-3 gap-y-1.5" : "gap-3"}`}>
      {(["done", "started", "empty"] as const).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">
          <span className={`inline-flex h-4 w-4 items-center justify-center rounded ${CELL[c].bg} ${CELL[c].c}`}>{CELL[c].s}</span>
          {c === "done" ? "complete" : c === "started" ? "in progress" : "empty"}
        </span>
      ))}
      <span className="inline-flex items-center gap-1"><span className="inline-flex h-4 w-4 items-center justify-center">—</span>not applicable</span>
      <span className="inline-flex items-center gap-1"><span className="inline-flex h-4 w-4 items-center justify-center text-tal-plum"><ShareIcon size={13} /></span>shareable in Planner</span>
      <span className="inline-flex items-center gap-1"><AiHelpIcon />AI can help you plan this</span>
    </span>
  )
}
function ShareCount({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-tal-plum">
      <ShareIcon />
      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${n > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{n}</span>
    </span>
  )
}
function ExpRow({ r }: { r: (typeof EXPIRING)[number] }) {
  return (
    <div className="flex h-full items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
      <Thumb src={r.thumb} size={32} className="rounded-lg ring-1 ring-white" />
      <span className="min-w-0 flex-1 leading-snug"><span className="font-medium">{r.t}</span> <span className="text-tal-plum-soft">— {r.c} · expires {r.d}</span></span>
    </div>
  )
}
function CatCard({ c, thumb = 64 }: { c: (typeof CATS)[number]; thumb?: number }) {
  return (
    <div className={`flex h-full flex-col rounded-2xl p-5 ring-1 ${c.tone}`}>
      <div className="mb-3 flex items-start gap-3">
        <Thumb src={`/thumbnails/categories/${c.id}.png`} size={thumb} className="rounded-xl ring-1 ring-white" />
        <div className="min-w-0 flex-1"><p className="font-display text-lg leading-tight">{c.t}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{c.d}</p></div>
      </div>
      <div className="mt-auto">
        <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">{c.done} of {c.total} folders complete</span><span className={`rounded-full px-2 py-0.5 font-medium ${c.pill}`}>{pct(c)}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full ${c.bar}`} style={{ width: `${pct(c)}%` }} /></div>
      </div>
    </div>
  )
}
function StatCard({ s, n }: { s: (typeof STATS)[number]; n: number }) {
  return (
    <div className={`flex h-full items-center gap-3 rounded-2xl p-4 ring-1 ${s.c}`}>
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.i}`}>{STAT_ICONS[n]}</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-tight">{s.v}</p><p className="mt-0.5 text-[11px] text-tal-plum-soft">{s.s}</p></div>
      <span className="shrink-0 text-tal-plum-soft/70">→</span>
    </div>
  )
}
function HiddenHead({ open }: { open?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div><p className="font-medium">Show hidden suggestions ({HIDDEN.length})</p><p className="mt-0.5 text-xs text-tal-plum-soft">Folders you snoozed or marked &ldquo;Not applicable&rdquo;.</p></div>
      <span className={`text-sm text-tal-plum-soft ${open ? "rotate-180" : ""}`}>▾</span>
    </div>
  )
}
function HiddenItem({ h }: { h: (typeof HIDDEN)[number] }) {
  return (
    <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-tal-line p-3">
      <div className="min-w-0"><p className="truncate font-medium">{h.n}</p><p className="text-xs text-tal-plum-soft">{h.s}</p></div>
      <span className="inline-flex h-8 items-center rounded-lg border border-tal-line bg-white px-3 text-sm">Unhide</span>
    </div>
  )
}
function NewToBody() {
  return (
    <>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white"><HelpDot /></span>
      <div className="min-w-0 flex-1"><p className="font-medium">New to The Adulting Life Organiser?</p><p className="text-xs text-tal-plum-soft">Not sure where to start? We can help.</p></div>
    </>
  )
}
const btnLine = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm"
function MatchRow({ m }: { m: (typeof AI_MATCHES)[number] }) {
  return (
    <div className="flex h-full items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
      <div className="min-w-0 flex-1"><p className="font-medium">{m.name}</p><p className="text-xs text-tal-plum-soft">{m.where} · {m.why}</p></div>
      <span className="text-tal-plum-soft">›</span>
    </div>
  )
}
function AiAnswer({ x, w, answerY, matchY, gap, noteY }: { x: number; w: number; answerY: number; matchY: number; gap: number; noteY: number }) {
  return (
    <>
      <motion.p className="absolute text-sm text-tal-plum-soft" style={{ left: x, top: answerY, width: w }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1, duration: 0.3 }}>TAL AI is looking for it…</motion.p>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}>
        <Box x={x} y={answerY} w={w} h={matchY - answerY - 12} className="flex gap-2 text-sm"><span>✨</span><span>{AI_ANSWER}</span></Box>
        {AI_MATCHES.map((m, n) => <Box key={m.name} x={x} y={matchY + n * gap} w={w} h={gap - 8}><MatchRow m={m} /></Box>)}
        <Box x={x} y={noteY} w={w} h={18} className="text-xs italic text-tal-plum-soft">Suggested by TAL AI — a guide only.</Box>
      </motion.div>
    </>
  )
}
// "Sharing — <folder>" dialog (FolderShareButton)
function ShareDialogBody() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-tal-line px-5 py-4">
        <p className="font-display text-lg">Sharing — Emergency Contacts</p>
        <p className="mt-1 text-xs text-tal-plum-soft">Who can see what you&apos;ve added to this folder. Shared entries appear in their Peace of Mind Planner.</p>
      </div>
      <div className="flex-1 space-y-5 px-5 py-4">
        <section>
          <p className="mb-2 text-xs uppercase tracking-widest text-tal-plum-soft">Shared with</p>
          <div className="space-y-1.5">
            {[{ n: "James Taylor", e: "james.taylor@example.com" }, { n: "Emma Clarke", e: "emma.clarke@example.com" }].map((p) => (
              <div key={p.n} className="rounded-lg border border-tal-line bg-tal-cream-soft/40 px-3 py-2 text-sm">
                <p className="truncate">{p.n}</p><p className="truncate text-xs text-tal-plum-soft">{p.e}</p><p className="mt-1 text-xs text-tal-plum-soft">Sarah Taylor</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <p className="mb-2 text-xs uppercase tracking-widest text-tal-plum-soft">Your entries</p>
          {[{ t: "Sarah Taylor", s: "Shared with 2 people", b: "Manage" }, { t: "Leo Taylor", s: "Not shared", b: "Share" }].map((e) => (
            <div key={e.t} className="mb-1.5 flex items-center justify-between gap-3 rounded-lg border border-tal-line px-3 py-2">
              <div className="min-w-0 text-sm"><p className="truncate">{e.t}</p><p className="text-xs text-tal-plum-soft">{e.s}</p></div>
              <span className="inline-flex h-9 shrink-0 items-center rounded-xl bg-black px-3 text-sm font-medium text-white">{e.b}</span>
            </div>
          ))}
        </section>
      </div>
      <div className="flex justify-end border-t border-tal-line px-5 py-3"><span className="inline-flex h-9 items-center rounded-xl px-4 text-sm">Done</span></div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPUTER (1200 x 760)
// ═════════════════════════════════════════════════════════════════════════════

const SB = 240 // sidebar width
const L = 272 // content left
const CW = 896 // content width
const navY = (k: number) => 168 + k * 41
// Header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const ADD_MENU = { x: 656, y: 60, w: 192, h: 160 }
const USER_MENU = { x: 952, y: 58, w: 224, h: 290 }
const FAB_Y = 680
const FAB_R = 1176

function DShell({ children, addOpen, userOpen, h = 760, fabs = true }: { children: ReactNode; addOpen?: boolean; userOpen?: boolean; h?: number; fabs?: boolean }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {/* Sidebar (AppSidebar) */}
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === ACTIVE_NAV ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === ACTIVE_NAV ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}

      {/* Header (layout.tsx) */}
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
      </Box>
      <Box {...ADD} className={`flex items-center justify-center gap-1.5 rounded-full border border-tal-line text-sm font-medium ${addOpen ? "bg-tal-cream" : "bg-white"}`}><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm ${userOpen ? "bg-tal-cream" : ""}`}>
        <Avatar />Hi Sarah<span className={`text-xs text-tal-plum-soft ${userOpen ? "rotate-180" : ""}`}>▾</span>
      </Box>

      {children}

      {fabs && <Fabs y={FAB_Y} right={FAB_R} />}

      {addOpen && (
        <Box {...ADD_MENU} className="rounded-xl border border-tal-line bg-white py-2 shadow-lg">
          {ADD_ACTIONS.map((a) => <p key={a} className="px-4 py-2 text-sm">{a}</p>)}
        </Box>
      )}
      {userOpen && <UserMenuBody {...USER_MENU} />}
    </div>
  )
}
function UserMenuBody(r: Rect) {
  return (
    <Box {...r} className="rounded-xl border border-tal-line bg-white py-2 shadow-lg">
      <div className="mb-1 border-b border-tal-line px-4 py-1.5">
        <p className="mb-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Signed in as</p>
        <p className="truncate text-sm">sarah.taylor@example.com</p>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-1.5">
        <div><p className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Subscription</p><p className="text-sm font-medium">TAL Premium</p></div>
        <span className="rounded-full bg-tal-plum px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Active</span>
      </div>
      <div className="my-1 border-t border-tal-line" />
      <p className="flex items-center gap-2 px-4 py-1.5 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-blue-600" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z" fill="currentColor" /></svg>
        Take the tour
      </p>
      <div className="my-1 border-t border-tal-line" />
      <p className="px-4 py-1.5 text-sm">Privacy policy</p>
      <p className="px-4 py-1.5 text-sm">Terms &amp; conditions</p>
      <div className="my-1 border-t border-tal-line" />
      <p className="px-4 py-1.5 text-sm">Sign out</p>
    </Box>
  )
}

// ── The Organiser (records/page) ─────────────────────────────────────────────

const O = {
  hdr: { x: L, y: 76, w: CW, h: 108 },
  title: { x: L + 16, y: 84, w: 820, h: 44 },
  search: { x: L + CW - 20 - 120 - 8 - 150, y: 136, w: 150, h: 36 },
  add: { x: L + CW - 20 - 120, y: 136, w: 120, h: 36 },
  exp: { x: L, y: 200, w: CW, h: 242 },
  expRow: (n: number) => ({ x: L + 16, y: 248 + n * 46, w: CW - 32, h: 40 }),
  catsHead: { x: L, y: 466, w: 400, h: 28 },
  cat: (n: number) => ({ x: L + (n % 3) * 304, y: 506 + Math.floor(n / 3) * 172, w: 288, h: 156 }),
  stat: (n: number) => ({ x: L + n * 227, y: 858, w: 215, h: 72 }),
  newTo: { x: L, y: 954, w: CW, h: 68 },
  guide: { x: L + CW - 20 - 190, y: 970, w: 190, h: 36 },
  hidden: { x: L, y: 1038, w: CW, h: 82 },
  hiddenOpen: { x: L, y: 1038, w: CW, h: 220 },
  hiddenItem: (n: number) => ({ x: L + 20, y: 1118 + n * 62, w: CW - 40, h: 54 }),
}
const O_H = 1280
const catsSpan = span(O.cat(0), O.cat(4))
const allCats = { x: L, y: O.cat(0).y, w: CW, h: catsSpan.h }

function DOrganiser({ addOpen, userOpen, hiddenOpen }: { addOpen?: boolean; userOpen?: boolean; hiddenOpen?: boolean }) {
  return (
    <DShell h={O_H} addOpen={addOpen} userOpen={userOpen}>
      {/* Header */}
      <Box {...O.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={L + 20} y={88} w={36} />
      <Box x={L + 68} y={88} w={CW - 88} h={36} className="flex items-center gap-3">
        <span className="font-display text-2xl leading-tight">The Adulting Life Organiser</span>
        <span className="text-tal-plum-soft/50">·</span>
        <span className="text-sm text-tal-plum-soft">All your important information, organised in one place.</span>
      </Box>
      <Box {...O.search} className={`${btnLine} gap-2 px-3 text-tal-plum-soft`}><SearchIcon size={14} />Search records</Box>
      <Box {...O.add} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black text-sm font-medium text-white"><PlusIcon />Add Record</Box>

      {/* Expiring or expired */}
      <Box {...O.exp} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={L + 16} y={216} w={400} h={24} className="flex items-center gap-2"><span className="text-amber-700"><WarnIcon /></span><span className="font-display">Expiring or expired ({EXPIRING.length})</span></Box>
      {EXPIRING.map((r, n) => <Box key={r.t} {...O.expRow(n)}><ExpRow r={r} /></Box>)}

      {/* Choose a category */}
      <Box {...O.catsHead} className="font-display text-xl">Choose a category</Box>
      {CATS.map((c, n) => <Box key={c.id} {...O.cat(n)}><CatCard c={c} /></Box>)}

      {/* StatCards */}
      {STATS.map((s, n) => <Box key={s.v} {...O.stat(n)}><StatCard s={s} n={n} /></Box>)}

      {/* New to ... */}
      <Box {...O.newTo} className="flex items-center gap-4 rounded-2xl border border-tal-line bg-tal-cream-soft px-5"><NewToBody /></Box>
      <Box {...O.guide} className={`${btnLine} gap-1`}>Getting Started Guide →</Box>

      {/* HiddenSuggestions */}
      <Box {...(hiddenOpen ? O.hiddenOpen : O.hidden)} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={L + 20} y={1058} w={CW - 40} h={42}><HiddenHead open={hiddenOpen} /></Box>
      {hiddenOpen && HIDDEN.map((h, n) => <Box key={h.n} {...O.hiddenItem(n)}><HiddenItem h={h} /></Box>)}
    </DShell>
  )
}

// ── Search (records/search + AiSearchAssist) ─────────────────────────────────

const SR = { input: { x: L, y: 128, w: 794, h: 44 }, btn: { x: L + 802, y: 128, w: 94, h: 44 } }
const SR_FOLDER = { x: L, y: 228, w: CW, h: 62 }
const AI = {
  card: { x: L, y: 196, w: CW, h: 290 },
  ask: { x: L + 20, y: 240, w: 216, h: 40 },
  answer: { x: L + 20, y: 252, w: 856, h: 44 },
  match: (n: number) => ({ x: L + 20, y: 308 + n * 70, w: 856, h: 62 }),
  note: { x: L + 20, y: 452, w: 856, h: 18 },
}
function DSearch({ q, mode }: { q: string; mode: "typing" | "found" | "none" | "ai" }) {
  return (
    <DShell fabs={false}>
      <Box x={L} y={76} w={CW} h={40} className="flex items-baseline justify-between"><span className="font-display text-3xl">Search records</span><span className="text-sm">← Back</span></Box>
      <Box {...SR.input} className="flex items-center rounded-xl border border-tal-line bg-white px-3">{mode === "typing" ? <Typed text={q} /> : q}</Box>
      <Box {...SR.btn} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Search</Box>
      {mode === "typing" ? (
        <Box x={L} y={196} w={CW} h={24} className="text-tal-plum-soft">Type something above to search across your folders and records.</Box>
      ) : mode === "found" ? (
        <>
          <Box x={L} y={196} w={300} h={24} className="font-display">Folders (1)</Box>
          <Box {...SR_FOLDER} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
            <div><p className="font-medium">Passport &amp; Travel Documents</p><p className="text-xs text-tal-plum-soft">Personal</p></div><span className="text-tal-plum-soft">›</span>
          </Box>
          <Box x={L} y={322} w={300} h={24} className="font-display">Records ({FOUND_RECORDS.length})</Box>
          {FOUND_RECORDS.map((r, n) => (
            <Box key={r.t} x={L} y={354 + n * 70} w={CW} h={62} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
              <div><p className="font-medium">{r.t}</p><p className="text-xs text-tal-plum-soft">{r.s}</p></div><span className={`rounded-full px-2 py-1 text-xs ${r.c}`}>{r.p}</span>
            </Box>
          ))}
        </>
      ) : (
        <>
          <Box {...AI.card} h={mode === "ai" ? AI.card.h : 104} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={L + 20} y={AI.card.y + 20} w={856} h={24}>Nothing matched &ldquo;{q}&rdquo; in your folders.</Box>
          {mode === "none" && <Box {...AI.ask} className="flex items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"><span>✨</span> Ask TAL AI to find it</Box>}
          {mode === "ai" && <AiAnswer x={L + 20} w={856} answerY={AI.answer.y} matchY={AI.match(0).y} gap={70} noteY={AI.note.y} />}
        </>
      )}
    </DShell>
  )
}

// ── New record (records/[category]/new + RecordEditor) ───────────────────────

const NR = {
  title: { x: L, y: 160, w: 672, h: 68 },
  expiry: { x: L, y: 252, w: 672, h: 68 },
  tags: { x: L, y: 344, w: 672, h: 92 },
  notes: { x: L, y: 460, w: 672, h: 112 },
  create: { x: L, y: 596, w: 96, h: 44 },
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
        {["glovebox", "wallet", "safe", "renewals"].filter((t) => !tags.includes(t)).map((t) => <span key={t} className="rounded-full border border-tal-line px-2 py-0.5">+ {t}</span>)}
      </div>
    </Box>
  )
}
function NotesField({ r, value }: { r: Rect; value?: string }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-sm">Notes (optional)</p>
      <div className="h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm">{value}</div>
    </Box>
  )
}
function DNewRecord() {
  return (
    <DShell>
      <Box x={L} y={76} w={200} h={20} className="text-sm text-tal-plum-soft">← Personal</Box>
      <Box x={L} y={98} w={600} h={40} className="font-display text-3xl">New record</Box>
      <Field r={NR.title} label="Title" value="Toyota RAV4 registration" />
      <Field r={NR.expiry} label="Expiry date (optional)" value="03/12/2026" w={190} />
      <TagsField r={NR.tags} tags={["glovebox"]} />
      <NotesField r={NR.notes} value="QLD rego 123·ABC. Renew online with TMR." />
      <Box {...NR.create} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Create</Box>
    </DShell>
  )
}

// ── A record (records/[category]/r/[id]) ─────────────────────────────────────

const RC = {
  pill: { x: L + CW - 70, y: 112, w: 70, h: 26 },
  expiry: { x: L, y: 240, w: 672, h: 68 },
  save: { x: L, y: 584, w: 140, h: 44 },
}
function DRecord() {
  return (
    <DShell>
      <Box x={L} y={76} w={CW} h={20} className="flex items-center gap-1.5 text-sm text-tal-plum-soft"><span>Records</span><span className="opacity-60">›</span><span>Employment</span><span className="opacity-60">›</span><span className="font-medium text-tal-plum">Sarah&apos;s first aid certificate</span></Box>
      <Box x={L} y={104} w={700} h={44} className="font-display text-3xl">Sarah&apos;s first aid certificate</Box>
      <Box {...RC.pill} className="flex items-center justify-center rounded-full bg-red-100 text-xs text-red-800">Expired</Box>
      <Field r={{ x: L, y: 156, w: 672, h: 68 }} label="Title" value="Sarah's first aid certificate" />
      <Field r={RC.expiry} label="Expiry date (optional)" value="10/11/2026" w={190} />
      <TagsField r={{ x: L, y: 332, w: 672, h: 92 }} tags={["renewals"]} />
      <NotesField r={{ x: L, y: 448, w: 672, h: 112 }} value="Provide First Aid (HLTAID011) through her work. Book the refresher course." />
      <Box {...RC.save} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save changes</Box>
      <Box x={L + 152} y={RC.save.y} w={96} h={44} className="flex items-center justify-center rounded-xl border border-red-200 text-red-700">Delete</Box>
      <Box x={L} y={660} w={672} h={28} className="font-display text-lg">Audit trail</Box>
    </DShell>
  )
}

// ── A category: Personal (records/[category] + FolderListHeader + CategoryMatrix)

const M = {
  crumbs: { x: L, y: 76, w: CW, h: 20 },
  bar: { x: L, y: 104, w: CW, h: 108 },
  toggle: { x: L + CW - 24 - 108 - 8 - 104 - 8 - 128 - 8 - 214, y: 158, w: 214, h: 40 },
  pdf: { x: L + CW - 24 - 108 - 8 - 104 - 8 - 128, y: 160, w: 128, h: 36 },
  share: { x: L + CW - 24 - 108 - 8 - 104, y: 160, w: 104, h: 36 },
  newFolder: { x: L + CW - 24 - 108, y: 162, w: 108, h: 32 },
  form: { x: L, y: 228, w: CW, h: 62 },
}
const SHARE_DLG = { x: 376, y: 100, w: 448, h: 560 }
const COL_AI = L + 400, COL_PL = L + 452, COL_U = L + 532, UW = 91
const colX = (u: number) => COL_U + u * UW
const ROW_H = 38
const mTop = (off: number) => 256 + off // table top
const mRowY = (n: number, off = 0) => mTop(off) + 56 + n * ROW_H
const M_FORM_OFF = 78

function DMatrix({ newFolder, share }: { newFolder?: boolean; share?: boolean }) {
  const off = newFolder ? M_FORM_OFF : 0
  return (
    <DShell h={newFolder ? 840 : 760} fabs={!newFolder && !share}>
      <Box {...M.crumbs} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>Personal</span></Box>
      <Box {...M.bar} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/categories/personal.png" x={L + 24} y={120} w={36} />
      <Box x={L + 72} y={126} w={200} h={22} className="flex items-center"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">The Adulting Life Organiser</span></Box>
      <Box x={L + 280} y={120} w={200} h={36} className="font-display text-2xl leading-9 text-white">Personal</Box>
      <Box {...M.toggle} className="flex items-center gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs shadow-inner">
        {["List", "Grid", "Matrix"].map((v) => (
          <span key={v} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium ${v === "Matrix" ? "scale-105 bg-white text-black shadow-sm" : "text-white/85"}`}><ViewIcon v={v} />{v}</span>
        ))}
      </Box>
      <Box {...M.pdf} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfGlyph />Download PDF</Box>
      <Box {...M.share} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><MailGlyph />Share PDF</Box>
      <Box {...M.newFolder} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-medium text-black"><PlusIcon />New Folder</Box>
      {newFolder && (
        <Box {...M.form} className="flex items-center gap-2 rounded-xl border border-tal-line bg-white p-3">
          <span className="flex h-9 flex-1 items-center rounded-lg border border-tal-plum/50 px-3 text-sm"><Typed text="Pet Records" /></span>
          <span className="inline-flex h-9 items-center rounded-xl bg-black px-3 text-sm font-medium text-white">Create</span>
          <span className="inline-flex h-9 items-center rounded-xl border border-tal-line px-3 text-sm text-tal-plum-soft">Cancel</span>
        </Box>
      )}
      <Box x={L} y={228 + off} w={CW} h={22} className="flex items-center justify-between text-xs text-tal-plum-soft">
        <Legend />
        <span className="font-medium text-tal-plum">22 folders in this section<span className="text-tal-plum-soft"> · scroll for more</span></span>
      </Box>
      {/* The table */}
      <Box x={L} y={mTop(off)} w={CW} h={56 + ROWS.length * ROW_H + 2} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={L} y={mTop(off)} w={CW} h={56} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      <Box x={L + 16} y={mTop(off) + 18} w={200} h={20} className="text-sm font-medium text-tal-plum-soft">Folder</Box>
      <Box x={COL_AI} y={mTop(off) + 10} w={52} h={40} className="text-center text-sm font-medium">AI<p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">help</p></Box>
      <Box x={COL_PL} y={mTop(off) + 10} w={80} h={40} className="text-center text-sm font-medium">Planner<p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">shareable</p></Box>
      {PEOPLE.map((p, u) => (
        <Box key={p.n} x={colX(u)} y={mTop(off) + 10} w={UW} h={40} className="whitespace-nowrap text-center text-[13px] font-medium">{p.n}<p className="mt-0.5 text-[9px] uppercase tracking-wider text-tal-plum-soft">{p.k}</p></Box>
      ))}
      {ROWS.map((r, n) => (
        <div key={r.name}>
          {n > 0 && <Box x={L} y={mRowY(n, off)} w={CW} h={1} className="bg-tal-line" />}
          <Box x={L + 12} y={mRowY(n, off)} w={COL_AI - L - 16} h={ROW_H} className="flex items-center gap-2 text-sm">
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
            <Thumb src={r.thumb} size={28} className="rounded-md ring-1 ring-tal-line" />
            <span className="truncate">{r.name}</span>
            {r.users && <span className="ml-1 shrink-0 text-[10px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
          </Box>
          {r.planner !== undefined && <Box x={COL_PL} y={mRowY(n, off)} w={80} h={ROW_H} className="flex items-center justify-center"><ShareCount n={r.planner} /></Box>}
          {r.family ? (
            <Box x={COL_U} y={mRowY(n, off) + 1} w={UW * 4} h={ROW_H - 1} className="flex items-center justify-center gap-2 bg-green-50">
              <span className="font-bold text-green-700">✓</span><span className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">· shared with family</span>
            </Box>
          ) : r.cells!.map((c, u) => (
            <Box key={u} x={colX(u)} y={mRowY(n, off) + 1} w={UW} h={ROW_H - 1} className={`flex items-center justify-center ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
          ))}
        </div>
      ))}
      {share && (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <Box {...SHARE_DLG} className="overflow-hidden rounded-2xl bg-white shadow-lg"><ShareDialogBody /></Box>
        </>
      )}
    </DShell>
  )
}
const SHARE_DONE = { x: SHARE_DLG.x + SHARE_DLG.w - 20 - 72, y: SHARE_DLG.y + SHARE_DLG.h - 12 - 36, w: 72, h: 36 }

// ── Mia's Passport folder (records/[category]/[subcategory]?user=) ───────────

const PICK_X = L + 330
const FAM_STATUS = [
  { n: "Sarah Taylor", k: "adult · primary · Started", bg: "bg-amber-50" },
  { n: "James Taylor", k: "adult · Complete", bg: "bg-emerald-50" },
  { n: "Mia Taylor", k: "child", bg: "bg-tal-cream-soft", active: true },
  { n: "Leo Taylor", k: "child", bg: "" },
]
const MISSING_FIELDS = ["Type", "Code of issuing State", "Document No.", "Family name / Surname", "Given names", "Date of birth", "Sex"]
function DMia({ picker }: { picker?: boolean }) {
  return (
    <DShell>
      <Box x={L} y={78} w={330} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span><span className="opacity-50">·</span></Box>
      <Box x={PICK_X} y={72} w={150} h={34} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span>Mia Taylor<span className="text-xs">▾</span>
      </Box>
      <Box x={PICK_X + 160} y={80} w={200} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
      <Box x={L} y={116} w={CW} h={72} className="rounded-2xl bg-black shadow-md" />
      <Img src={SUB("passport_travel")} x={L + 20} y={128} w={48} className="rounded-xl ring-2 ring-white/20" />
      <Box x={L + 84} y={134} w={500} h={36} className="font-display text-2xl leading-9 text-white">Passport &amp; Travel Documents</Box>
      <Box x={L + CW - 150} y={134} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium">Export to Excel</Box>
      <Box x={L} y={204} w={CW} h={56} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 px-4 text-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>
        Your passport details, one entry per current + past passport. Attach a scan for easy reference and to speed up applications.
      </Box>
      <Box x={L} y={276} w={CW} h={96} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><WarnIcon />7 required fields still empty</p>
        <p className="mt-0.5 text-xs text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{MISSING_FIELDS.map((f) => <span key={f} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-900">{f}</span>)}</div>
      </Box>
      <Box x={L} y={392} w={CW} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Passport document</Box>
      <Box x={L} y={412} w={196} h={44} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white shadow-sm">Upload &amp; scan a file</Box>
      <Box x={L + 206} y={416} w={180} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</Box>
      <Box x={L} y={462} w={CW} h={16} className="text-xs text-tal-plum-soft">Upload a scan or photo of the passport data page (PDF or image).</Box>
      {[[["Type", 2], ["Code of issuing State", 2], ["Document No.", 4]], [["Family name / Surname", 8]], [["Given names", 8]]].map((row, r) => {
        let col = 0
        return row.map(([label, s]) => {
          const x = L + (col / 8) * CW
          col += s as number
          return (
            <Box key={label as string} x={x} y={494 + r * 76} w={((s as number) / 8) * CW - 16} h={68}>
              <p className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">{label}<span className="text-red-500">*</span></p>
              <div className="h-11 rounded-xl border border-tal-line bg-white" />
            </Box>
          )
        })
      })}
      {picker && (
        <Box x={PICK_X} y={112} w={256} h={4 * 52 + 8} className="overflow-hidden rounded-xl border border-tal-line bg-white py-1 shadow-lg">
          {FAM_STATUS.map((u) => (
            <div key={u.n} className={`flex h-[52px] items-center justify-between px-3 text-sm ${u.bg}`}>
              <div><p className="font-medium">{u.n}</p><p className="text-xs text-tal-plum-soft">{u.k}</p></div>{u.active && <span>✓</span>}
            </div>
          ))}
        </Box>
      )}
    </DShell>
  )
}

const D_SCREENS: Record<string, ReactNode> = {
  org: <DOrganiser />,
  orgadd: <DOrganiser addOpen />,
  orguser: <DOrganiser userOpen />,
  orghidden: <DOrganiser hiddenOpen />,
  sfound: <DSearch q={Q1} mode="found" />,
  snone: <DSearch q={Q2} mode="none" />,
  sai: <DSearch q={Q2} mode="ai" />,
  newrec: <DNewRecord />,
  record: <DRecord />,
  matrix: <DMatrix />,
  share: <DMatrix share />,
  mia: <DMia />,
  miapick: <DMia picker />,
}
const BASE = "app.theadultinglife.com.au"
const U_ORG = `${BASE}/records`
const U_SEARCH = `${BASE}/records/search`
const U_NEW = `${BASE}/records/personal/new`
const U_REC = `${BASE}/records/employment/r/7c1e`
const U_PERSONAL = `${BASE}/records/personal`
const U_MIA = `${BASE}/records/personal/personal.passport_travel?user=mia`

const D_STEPS: WalkStep[] = [
  { screen: "org", url: U_ORG, caption: "The Adulting Life Organiser", detail: "All your important information, organised in one place - for the whole family. It's in the sidebar, under Setup guide.", focus: { x: 600, y: 300, scale: 1.05 }, ring: O.hdr, duration: 6500 },
  // Search
  { screen: "org", url: U_ORG, caption: "Search records", detail: "Opens the search page. Type a word - it looks through folder names, record titles, notes and the answers in your forms.", focus: { x: 900, y: 170, scale: 1.7 }, ring: O.search, click: mid(O.search), duration: 5500 },
  { screen: "sfound", url: `${U_SEARCH}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "And every passport record in the family, with its expiry date and an Active / Expiring soon / Expired label.", focus: { x: 720, y: 330, scale: 1.25 }, ring: { x: L - 4, y: 192, w: CW + 8, h: 300 }, duration: 6500 },
  { screen: "snone", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "Nothing is called \"how do i add a will\" - so TAL AI offers to point you to the right place. The first time, it asks before sending your search words.", focus: { x: 560, y: 220, scale: 1.45 }, ring: AI.ask, click: mid(AI.ask), duration: 7000 },
  { screen: "sai", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner. Click one to go straight there.", focus: { x: 620, y: 340, scale: 1.3 }, ring: { x: L + 12, y: 244, w: 872, h: 236 }, duration: 7500 },
  // Add Record
  { screen: "org", url: U_ORG, caption: "+ Add Record", detail: "Opens a new record in Personal - anything with a title and, if it has one, an expiry date.", focus: { x: 980, y: 170, scale: 1.7 }, ring: O.add, click: mid(O.add), duration: 5500 },
  { screen: "newrec", url: U_NEW, caption: "Title, expiry date, tags and notes", detail: "An expiry date becomes a reminder - under the bell, in Reminders, and here on the Organiser when it's 30 days away. Tags (wallet, glovebox, safe) help you find it later.", focus: { x: 620, y: 380, scale: 1.2 }, ring: pad(NR.expiry), click: mid(NR.create), duration: 7000 },
  // Expiring or expired
  { screen: "org", url: U_ORG, caption: "Expiring or expired (4)", detail: "Rego, insurance, cards and certificates due in the next 30 days - or already past. Each row shows its section and the expiry date.", focus: { x: 720, y: 330, scale: 1.3 }, ring: O.exp, duration: 7000 },
  { screen: "org", url: U_ORG, caption: "Click one to open it", detail: "Sarah's first aid certificate ran out on 10 November.", focus: { x: 600, y: 390, scale: 1.6 }, ring: O.expRow(EXPIRED_ROW), click: { x: L + 200, y: O.expRow(EXPIRED_ROW).y + 20 }, duration: 5500 },
  { screen: "record", url: U_REC, caption: "Update the date and it's sorted", detail: "Red Expired, amber Expiring soon, green Active. Change the expiry, Save changes, and it drops off the list. The audit trail shows who changed what.", focus: { x: 720, y: 300, scale: 1.2 }, ring: RC.pill, duration: 7500 },
  // Categories
  { screen: "org", url: U_ORG, scroll: 420, caption: "Choose a category", detail: "Personal, Health, Education, Employment and Admin & Bookkeeping - what goes in each, \"6 of 22 folders complete\", the percentage and the bar, counted across the whole family.", focus: { x: 720, y: 670, scale: 1.15 }, ring: pad(allCats, 6), duration: 7000 },
  { screen: "org", url: U_ORG, scroll: 420, caption: "Open Personal", focus: { x: 500, y: 600, scale: 1.4 }, ring: O.cat(0), click: { x: O.cat(0).x + 144, y: O.cat(0).y + 50 }, duration: 4500 },
  // Personal
  { screen: "matrix", url: U_PERSONAL, caption: "Every folder, for every person", detail: "One column per family member - Sarah, James, Mia and Leo. List, Grid or Matrix view; download or email the whole section as a PDF.", focus: { x: 720, y: 220, scale: 1.2 }, ring: M.bar, duration: 7500 },
  { screen: "matrix", url: U_PERSONAL, caption: "Read it at a glance", detail: "✓ complete, ◐ in progress, ✗ empty, — not applicable. The share icon means it can be shared in the Planner; a sparkle means AI can help plan it (like My Health Plan in Health).", focus: { x: 600, y: 300, scale: 1.45 }, ring: { x: L - 4, y: 224, w: 720, h: 30 }, duration: 8500 },
  { screen: "matrix", url: U_PERSONAL, caption: "Some folders are for the whole family", detail: "Family Members is one shared list - \"· users\" means it holds the people themselves. A dash means it doesn't apply: a driver's licence isn't for Mia or Leo.", focus: { x: 820, y: mRowY(R_LICENCE) - 60, scale: 1.3 }, ring: { x: L, y: mRowY(R_FAMILY), w: CW, h: ROW_H }, duration: 8000 },
  { screen: "matrix", url: U_PERSONAL, caption: "Who it's shared with", detail: "The number is how many people can see this folder in their Planner - green if someone, red if no one. Click to manage.", focus: { x: COL_PL + 40, y: mRowY(R_EMERG) + 60, scale: 1.7 }, ring: { x: COL_PL, y: mRowY(R_EMERG), w: 80, h: ROW_H }, click: { x: COL_PL + 40, y: mRowY(R_EMERG) + 19 }, duration: 6000 },
  { screen: "share", url: U_PERSONAL, caption: "Sharing — Emergency Contacts", detail: "James and Sarah's sister Emma can see Sarah's contacts. Share or Manage each person's entry, one at a time.", focus: { x: 600, y: 380, scale: 1.25 }, ring: SHARE_DLG, click: mid(SHARE_DONE), duration: 7500 },
  { screen: "matrix", url: U_PERSONAL, caption: "Click a square to open that person's folder", detail: "Mia's passport is still empty.", focus: { x: colX(2) + 40, y: mRowY(R_PASSPORT) + 20, scale: 1.7 }, ring: { x: colX(2), y: mRowY(R_PASSPORT), w: UW, h: ROW_H }, click: { x: colX(2) + UW / 2, y: mRowY(R_PASSPORT) + 19 }, duration: 5500 },
  { screen: "mia", url: U_MIA, caption: "Mia's Passport folder", detail: "It lists what's still missing. Upload & scan her passport and the details fill in for you.", focus: { x: 620, y: 330, scale: 1.2 }, ring: { x: L, y: 276, w: CW, h: 96 }, duration: 7000 },
  { screen: "miapick", url: U_MIA, caption: "Switch person in one click", detail: "James's is complete, Sarah's is started - pick anyone to see theirs.", focus: { x: 560, y: 220, scale: 1.6 }, ring: { x: PICK_X, y: 112, w: 256, h: 216 }, duration: 6000 },
  { screen: "matrix", url: U_PERSONAL, caption: "Need a folder that isn't there?", detail: "New Folder adds your own to the section - type a name and Create.", focus: { x: 900, y: 230, scale: 1.5 }, ring: M.newFolder, click: mid(M.newFolder), duration: 6000 },
  // The rest of the Organiser page
  { screen: "org", url: U_ORG, scroll: 520, caption: "Your progress, and peace of mind", detail: "22 of 77 folders done and 14 in progress (opens Tasks). Secure & private and Always backed up explain how your data is kept safe.", focus: { x: 720, y: 894, scale: 1.3 }, ring: span(O.stat(0), O.stat(3)), duration: 7500 },
  { screen: "orghidden", url: U_ORG, scroll: 520, caption: "New here? And folders you've hidden", detail: "Getting Started Guide opens your list of next things to do. Hidden suggestions brings back folders you snoozed or marked Not applicable - Unhide.", focus: { x: 720, y: 1100, scale: 1.2 }, ring: span(O.newTo, O.hiddenOpen), click: { x: L + 400, y: 1078 }, duration: 8000 },
  // Header and round buttons
  { screen: "orgadd", url: U_ORG, caption: "The header, on every page", detail: "Search your organiser, and + Add: Add record, Upload document, Scan document or Add reminder.", focus: { x: 620, y: 140, scale: 1.6 }, ring: { x: SEARCH.x, y: SEARCH.y, w: ADD_MENU.x + ADD_MENU.w - SEARCH.x, h: ADD_MENU.y + ADD_MENU.h - SEARCH.y }, click: mid(ADD), duration: 6500 },
  { screen: "orguser", url: U_ORG, caption: "Ask TAL AI, reminders and your account", detail: "TAL AI is your built-in guide. The bell opens Reminders. Your name opens the account menu.", focus: { x: 1000, y: 200, scale: 1.55 }, ring: { x: ASK.x, y: ASK.y, w: USER.x + USER.w - ASK.x, h: 40 }, click: mid(USER), duration: 6500 },
  { screen: "org", url: U_ORG, caption: "Three round buttons", detail: "? opens help for this page. The compass takes the guided tour. And this one plays the walkthrough - you're watching it now.", focus: { x: 1050, y: 640, scale: 1.8 }, ring: { x: FAB_R - 200, y: FAB_Y, w: 200, h: 56 }, click: { x: FAB_R - 172, y: FAB_Y + 28 }, duration: 7000 },
]

// ═════════════════════════════════════════════════════════════════════════════
// PHONE (390 x 844)
// ═════════════════════════════════════════════════════════════════════════════

const PW = 390
const PX = 8 // main px-2
const PCW = 374
const P_FAB_Y = 764
const P_FAB_R = 366
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }

const StatusBar = () => (
  <Box x={0} y={0} w={PW} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark">
    <span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
function PHeader() {
  return (
    <>
      <Box x={0} y={44} w={PW} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}
const PPage = ({ children, h = 844, fabs = false }: { children: ReactNode; h?: number; fabs?: boolean }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
    <StatusBar />
    <PHeader />
    {children}
    {fabs && <Fabs y={P_FAB_Y} right={P_FAB_R} />}
  </div>
)

// ── The Organiser on a phone ─────────────────────────────────────────────────

const PO = {
  hdr: { x: PX, y: 116, w: PCW, h: 188 },
  search: { x: 102, y: 252, w: 140, h: 36 },
  add: { x: 250, y: 252, w: 112, h: 36 },
  exp: { x: PX, y: 320, w: PCW, h: 274 },
  expRow: (n: number) => ({ x: PX + 16, y: 368 + n * 54, w: PCW - 32, h: 48 }),
  catsHead: { x: PX, y: 618, w: PCW, h: 28 },
  cat: (n: number) => ({ x: PX, y: 658 + n * 166, w: PCW, h: 150 }),
  stat: (n: number) => ({ x: PX, y: 1496 + n * 84, w: PCW, h: 72 }),
  newTo: { x: PX, y: 1844, w: PCW, h: 116 },
  guide: { x: PX + 20, y: 1908, w: 190, h: 36 },
  hidden: { x: PX, y: 1976, w: PCW, h: 98 },
  hiddenOpen: { x: PX, y: 1976, w: PCW, h: 240 },
  hiddenItem: (n: number) => ({ x: PX + 20, y: 2054 + n * 66, w: PCW - 40, h: 58 }),
}
const PO_H = 2240

function POrganiser({ hiddenOpen }: { hiddenOpen?: boolean }) {
  return (
    <PPage h={PO_H} fabs>
      <Box {...PO.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={PX + 20} y={130} w={36} />
      <Box x={PX + 68} y={128} w={PCW - 88} h={64} className="font-display text-2xl leading-tight">The Adulting Life Organiser</Box>
      <Box x={PX + 20} y={198} w={PCW - 40} h={42} className="text-sm text-tal-plum-soft">All your important information, organised in one place.</Box>
      <Box {...PO.search} className={`${btnLine} gap-2 px-3 text-tal-plum-soft`}><SearchIcon size={14} />Search records</Box>
      <Box {...PO.add} className="flex items-center justify-center gap-1.5 rounded-lg bg-black text-sm font-medium text-white"><PlusIcon />Add Record</Box>

      <Box {...PO.exp} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={PX + 16} y={336} w={PCW - 32} h={24} className="flex items-center gap-2"><span className="text-amber-700"><WarnIcon /></span><span className="font-display">Expiring or expired ({EXPIRING.length})</span></Box>
      {EXPIRING.map((r, n) => <Box key={r.t} {...PO.expRow(n)}><ExpRow r={r} /></Box>)}

      <Box {...PO.catsHead} className="font-display text-xl">Choose a category</Box>
      {CATS.map((c, n) => <Box key={c.id} {...PO.cat(n)}><CatCard c={c} /></Box>)}

      {STATS.map((s, n) => <Box key={s.v} {...PO.stat(n)}><StatCard s={s} n={n} /></Box>)}

      <Box {...PO.newTo} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Box x={PX + 20} y={1860} w={PCW - 40} h={40} className="flex items-center gap-4"><NewToBody /></Box>
      <Box {...PO.guide} className={`${btnLine} gap-1`}>Getting Started Guide →</Box>

      <Box {...(hiddenOpen ? PO.hiddenOpen : PO.hidden)} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 20} y={1996} w={PCW - 40} h={58}><HiddenHead open={hiddenOpen} /></Box>
      {hiddenOpen && HIDDEN.map((h, n) => <Box key={h.n} {...PO.hiddenItem(n)}><HiddenItem h={h} /></Box>)}
    </PPage>
  )
}

// ── Search on a phone ────────────────────────────────────────────────────────

const P_SR = { input: { x: PX, y: 172, w: 282, h: 44 }, btn: { x: 298, y: 172, w: 84, h: 44 } }
const P_AI = { card: { x: PX, y: 236, w: PCW, h: 410 }, ask: { x: PX + 20, y: 316, w: 216, h: 40 }, answerY: 320, matchY: 432, gap: 84, noteY: 604 }
function PSearch({ q, mode }: { q: string; mode: "typing" | "found" | "none" | "ai" }) {
  return (
    <PPage>
      <Box x={PX} y={120} w={PCW} h={40} className="flex items-baseline justify-between"><span className="font-display text-3xl">Search records</span><span className="text-sm">← Back</span></Box>
      <Box {...P_SR.input} className="flex items-center overflow-hidden whitespace-nowrap rounded-xl border border-tal-line bg-white px-3">{mode === "typing" ? <Typed text={q} /> : q}</Box>
      <Box {...P_SR.btn} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Search</Box>
      {mode === "typing" ? (
        <Box x={PX} y={240} w={PCW} h={48} className="text-tal-plum-soft">Type something above to search across your folders and records.</Box>
      ) : mode === "found" ? (
        <>
          <Box x={PX} y={240} w={300} h={24} className="font-display">Folders (1)</Box>
          <Box x={PX} y={272} w={PCW} h={62} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
            <div><p className="font-medium">Passport &amp; Travel Documents</p><p className="text-xs text-tal-plum-soft">Personal</p></div><span className="text-tal-plum-soft">›</span>
          </Box>
          <Box x={PX} y={366} w={300} h={24} className="font-display">Records ({FOUND_RECORDS.length})</Box>
          {FOUND_RECORDS.map((r, n) => (
            <Box key={r.t} x={PX} y={398 + n * 70} w={PCW} h={62} className="flex items-center justify-between gap-2 rounded-xl border border-tal-line bg-white px-4 py-3">
              <div className="min-w-0"><p className="font-medium">{r.t}</p><p className="text-xs text-tal-plum-soft">{r.s}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${r.c}`}>{r.p}</span>
            </Box>
          ))}
        </>
      ) : (
        <>
          <Box {...P_AI.card} h={mode === "ai" ? P_AI.card.h : 140} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={PX + 20} y={P_AI.card.y + 20} w={PCW - 40} h={48}>Nothing matched &ldquo;{q}&rdquo; in your folders.</Box>
          {mode === "none" && <Box {...P_AI.ask} className="flex items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"><span>✨</span> Ask TAL AI to find it</Box>}
          {mode === "ai" && <AiAnswer x={PX + 20} w={PCW - 40} answerY={P_AI.answerY} matchY={P_AI.matchY} gap={P_AI.gap} noteY={P_AI.noteY} />}
        </>
      )}
    </PPage>
  )
}

// ── New record and a record, on a phone ──────────────────────────────────────

const PNR = {
  expiry: { x: PX, y: 290, w: PCW, h: 68 },
  create: { x: PX, y: 640, w: 96, h: 44 },
}
function PNewRecord() {
  return (
    <PPage>
      <Box x={PX} y={120} w={200} h={20} className="text-sm text-tal-plum-soft">← Personal</Box>
      <Box x={PX} y={142} w={PCW} h={40} className="font-display text-3xl">New record</Box>
      <Field r={{ x: PX, y: 206, w: PCW, h: 68 }} label="Title" value="Toyota RAV4 registration" />
      <Field r={PNR.expiry} label="Expiry date (optional)" value="03/12/2026" w={190} />
      <TagsField r={{ x: PX, y: 374, w: PCW, h: 110 }} tags={["glovebox"]} />
      <NotesField r={{ x: PX, y: 508, w: PCW, h: 112 }} value="QLD rego 123·ABC. Renew online with TMR." />
      <Box {...PNR.create} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Create</Box>
    </PPage>
  )
}
const PRC = { pill: { x: PX + PCW - 70, y: 168, w: 70, h: 26 }, save: { x: PX, y: 696, w: 140, h: 44 } }
function PRecord() {
  return (
    <PPage>
      <Box x={PX} y={120} w={PCW} h={20} className="flex items-center gap-1.5 truncate text-sm text-tal-plum-soft"><span>Records</span><span className="opacity-60">›</span><span>Employment</span><span className="opacity-60">›</span><span className="truncate font-medium text-tal-plum">Sarah&apos;s first aid certificate</span></Box>
      <Box x={PX} y={148} w={280} h={80} className="font-display text-3xl leading-tight">Sarah&apos;s first aid certificate</Box>
      <Box {...PRC.pill} className="flex items-center justify-center rounded-full bg-red-100 text-xs text-red-800">Expired</Box>
      <Field r={{ x: PX, y: 252, w: PCW, h: 68 }} label="Title" value="Sarah's first aid certificate" />
      <Field r={{ x: PX, y: 336, w: PCW, h: 68 }} label="Expiry date (optional)" value="10/11/2026" w={190} />
      <TagsField r={{ x: PX, y: 420, w: PCW, h: 110 }} tags={["renewals"]} />
      <NotesField r={{ x: PX, y: 562, w: PCW, h: 112 }} value="Provide First Aid (HLTAID011) through her work. Book the refresher course." />
      <Box {...PRC.save} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save changes</Box>
      <Box x={PX + 152} y={PRC.save.y} w={96} h={44} className="flex items-center justify-center rounded-xl border border-red-200 text-red-700">Delete</Box>
    </PPage>
  )
}

// ── Personal on a phone (FolderListHeader + CategoryMatrix's MobileMatrix) ───

const PM = {
  bar: { x: PX, y: 144, w: PCW, h: 208 },
  toggle: { x: PX + 24, y: 252, w: 214, h: 40 },
  pdf: { x: PX + 24, y: 302, w: 36, h: 36 },
  share: { x: PX + 68, y: 302, w: 36, h: 36 },
  newFolder: { x: PX + 112, y: 304, w: 108, h: 32 },
  legend: { x: PX, y: 368, w: PCW, h: 92 },
  card: { x: PX, y: 468, w: PCW },
  names: { x: PX, y: 468, w: PCW, h: 140 },
}
const P_ROW_H = 78
const pRowY = (n: number) => 608 + n * P_ROW_H
const pCellX = (u: number) => PX + 12 + u * 88
const P_CELL_W = 86
const PM_H = pRowY(ROWS.length) + 40

function PMatrix() {
  return (
    <PPage h={PM_H}>
      <Box x={PX} y={116} w={PCW} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>Personal</span></Box>
      <Box {...PM.bar} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/categories/personal.png" x={PX + 24} y={160} w={36} />
      <Box x={PX + 72} y={167} w={220} h={22} className="flex items-center"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">The Adulting Life Organiser</span></Box>
      <Box x={PX + 24} y={206} w={200} h={34} className="font-display text-2xl leading-9 text-white">Personal</Box>
      <Box {...PM.toggle} className="flex items-center gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs shadow-inner">
        {["List", "Grid", "Matrix"].map((v) => (
          <span key={v} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium ${v === "Matrix" ? "scale-105 bg-white text-black shadow-sm" : "text-white/85"}`}><ViewIcon v={v} />{v}</span>
        ))}
      </Box>
      <Box {...PM.pdf} className="inline-flex items-center justify-center rounded-xl border border-tal-line bg-white"><PdfGlyph /></Box>
      <Box {...PM.share} className="inline-flex items-center justify-center rounded-xl border border-tal-line bg-white"><MailGlyph /></Box>
      <Box {...PM.newFolder} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-medium text-black"><PlusIcon />New Folder</Box>
      <Box {...PM.legend} className="text-xs text-tal-plum-soft">
        <Legend phone />
        <p className="mt-2 font-medium text-tal-plum">22 folders in this section<span className="text-tal-plum-soft"> · scroll for more</span></p>
      </Box>
      {/* MobileMatrix */}
      <Box x={PX} y={PM.card.y} w={PCW} h={140 + ROWS.length * P_ROW_H} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box {...PM.names} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      {PEOPLE.map((p, u) => (
        <Box key={p.n} x={pCellX(u)} y={PM.card.y + 12} w={P_CELL_W} h={120} className="flex items-end justify-center">
          <div className="truncate px-1 text-xs font-medium leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {p.n}{p.primary && <span className="ml-1 text-tal-plum-soft">★</span>}
          </div>
        </Box>
      ))}
      {ROWS.map((r, n) => (
        <div key={r.name}>
          {n > 0 && <Box x={PX} y={pRowY(n)} w={PCW} h={1} className="bg-tal-line" />}
          <Box x={PX + 8} y={pRowY(n) + 8} w={PCW - 16} h={24} className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
            <Thumb src={r.thumb} size={24} className="rounded-md ring-1 ring-tal-line" />
            <span className="min-w-0 truncate">{r.name}</span>
            {r.users && <span className="ml-1 shrink-0 text-[9px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
            {r.planner !== undefined && <span className="ml-1 inline-flex shrink-0 text-tal-plum"><ShareIcon size={13} /></span>}
          </Box>
          {r.family ? (
            <Box x={PX + 8} y={pRowY(n) + 38} w={PCW - 16} h={32} className="flex items-center justify-center gap-2 rounded-md bg-green-50">
              <span className="font-bold text-green-700">✓</span><span className="text-[9px] font-medium uppercase tracking-widest text-tal-plum-soft">· family</span>
            </Box>
          ) : r.cells!.map((c, u) => (
            <Box key={u} x={pCellX(u)} y={pRowY(n) + 38} w={P_CELL_W} h={32} className={`flex items-center justify-center rounded-md ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
          ))}
        </div>
      ))}
    </PPage>
  )
}

// ── Mia's Passport folder on a phone ─────────────────────────────────────────

const P_PICK = { x: PX, y: 142, w: 150, h: 34 }
function PMia({ picker }: { picker?: boolean }) {
  return (
    <PPage>
      <Box x={PX} y={116} w={PCW} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span><span className="opacity-50">·</span></Box>
      <Box {...P_PICK} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span>Mia Taylor<span className="text-xs">▾</span>
      </Box>
      <Box x={PX + 160} y={150} w={200} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
      <Box x={PX} y={188} w={PCW} h={124} className="rounded-2xl bg-black shadow-md" />
      <Img src={SUB("passport_travel")} x={PX + 20} y={200} w={48} className="rounded-xl ring-2 ring-white/20" />
      <Box x={PX + 84} y={206} w={260} h={36} className="font-display text-2xl leading-9 text-white">Passport &amp; Travel Documents</Box>
      <Box x={PX + 20} y={260} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium">Export to Excel</Box>
      <Box x={PX} y={324} w={PCW} h={92} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 px-4 text-sm leading-snug">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>
        Your passport details, one entry per current + past passport. Attach a scan for easy reference and to speed up applications.
      </Box>
      <Box x={PX} y={430} w={PCW} h={150} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><WarnIcon />7 required fields still empty</p>
        <p className="mt-0.5 text-xs text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{MISSING_FIELDS.map((f) => <span key={f} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-900">{f}</span>)}</div>
      </Box>
      <Box x={PX} y={598} w={PCW} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Passport document</Box>
      <Box x={PX} y={618} w={196} h={44} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white shadow-sm">Upload &amp; scan a file</Box>
      <Box x={PX} y={670} w={180} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</Box>
      <Box x={PX} y={714} w={PCW} h={34} className="text-xs text-tal-plum-soft">Upload a scan or photo of the passport data page (PDF or image).</Box>
      <Box x={PX} y={756} w={PCW} h={68}>
        <p className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">Type<span className="text-red-500">*</span></p>
        <div className="h-11 rounded-xl border border-tal-line bg-white" />
      </Box>
      {picker && (
        <Box x={PX} y={182} w={256} h={4 * 52 + 8} className="overflow-hidden rounded-xl border border-tal-line bg-white py-1 shadow-lg">
          {FAM_STATUS.map((u) => (
            <div key={u.n} className={`flex h-[52px] items-center justify-between px-3 text-sm ${u.bg}`}>
              <div><p className="font-medium">{u.n}</p><p className="text-xs text-tal-plum-soft">{u.k}</p></div>{u.active && <span>✓</span>}
            </div>
          ))}
        </Box>
      )}
    </PPage>
  )
}

const P_SCREENS: Record<string, ReactNode> = {
  org: <POrganiser />,
  orghidden: <POrganiser hiddenOpen />,
  stype: <PSearch q={Q1} mode="typing" />,
  sfound: <PSearch q={Q1} mode="found" />,
  snone: <PSearch q={Q2} mode="none" />,
  sai: <PSearch q={Q2} mode="ai" />,
  newrec: <PNewRecord />,
  record: <PRecord />,
  matrix: <PMatrix />,
  mia: <PMia />,
  miapick: <PMia picker />,
}
const pFull = (r: Rect) => ({ x: PX, y: r.y, w: PCW, h: r.h })

const P_STEPS: WalkStep[] = [
  { screen: "org", url: U_ORG, caption: "The Adulting Life Organiser", detail: "Every important record for the whole family, in five sections. Open it from the ☰ menu.", duration: 6000 },
  // Search
  { screen: "org", url: U_ORG, caption: "Search records", detail: "On a phone, this is where search lives.", focus: { x: 195, y: 230, scale: 1.4 }, ring: PO.search, click: mid(PO.search), duration: 5000 },
  { screen: "stype", url: U_SEARCH, caption: "Type what you're after", detail: "Folder names, record titles, notes and the answers in your forms.", focus: { x: 195, y: 200, scale: 1.4 }, ring: P_SR.btn, click: mid(P_SR.btn), duration: 6000 },
  { screen: "sfound", url: `${U_SEARCH}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "And every passport record in the family, with its expiry date.", focus: { x: 195, y: 380, scale: 1.1 }, ring: { x: PX - 2, y: 236, w: PCW + 4, h: 300 }, duration: 6000 },
  { screen: "snone", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "It points you to the right place. The first time, it asks before sending your search words.", focus: { x: 195, y: 300, scale: 1.3 }, ring: P_AI.ask, click: mid(P_AI.ask), duration: 6500 },
  { screen: "sai", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner. Tap one to go there.", focus: { x: 195, y: 440, scale: 1.08 }, ring: { x: PX + 12, y: P_AI.answerY - 8, w: PCW - 24, h: P_AI.noteY + 26 - P_AI.answerY }, duration: 7500 },
  // Add Record
  { screen: "org", url: U_ORG, caption: "+ Add Record", detail: "A new record in Personal - anything with a title and, if it has one, an expiry date.", focus: { x: 260, y: 230, scale: 1.4 }, ring: PO.add, click: mid(PO.add), duration: 5000 },
  { screen: "newrec", url: U_NEW, caption: "Title, expiry date, tags and notes", detail: "An expiry date becomes a reminder - under the bell, in Reminders, and on the Organiser when it's due.", focus: { x: 195, y: 420, scale: 1.05 }, ring: pad(PNR.expiry), click: mid(PNR.create), duration: 7500 },
  // Expiring
  { screen: "org", url: U_ORG, scroll: 220, caption: "Expiring or expired (4)", detail: "Anything due in the next 30 days, or already past - with its section and date.", focus: { x: 195, y: 460, scale: 1.08 }, ring: PO.exp, duration: 6500 },
  { screen: "org", url: U_ORG, scroll: 220, caption: "Tap one to open it", detail: "Sarah's first aid certificate ran out on 10 November.", focus: { x: 195, y: 560, scale: 1.3 }, ring: PO.expRow(EXPIRED_ROW), click: { x: 180, y: PO.expRow(EXPIRED_ROW).y + 24 }, duration: 5000 },
  { screen: "record", url: U_REC, caption: "Update the date and it's sorted", detail: "Red Expired, amber Expiring soon, green Active. Change the expiry and Save changes.", focus: { x: 195, y: 420, scale: 1.05 }, ring: PRC.pill, click: mid(PRC.save), duration: 7000 },
  // Categories
  { screen: "org", url: U_ORG, scroll: 640, caption: "Choose a category", detail: "Personal, Health, Education, Employment and Admin & Bookkeeping - each with what goes in it.", focus: { x: 195, y: 1000, scale: 1.05 }, ring: span(PO.cat(0), PO.cat(4)), duration: 6500 },
  { screen: "org", url: U_ORG, scroll: 640, caption: "How far along each one is", detail: "\"6 of 22 folders complete\", the percentage and the bar - for the whole family.", focus: { x: 195, y: 760, scale: 1.4 }, ring: { x: PX + 16, y: PO.cat(0).y + 104, w: PCW - 32, h: 34 }, click: { x: 195, y: PO.cat(0).y + 50 }, duration: 6500 },
  // Personal
  { screen: "matrix", url: U_PERSONAL, caption: "Every folder, for every person", detail: "List, Grid or Matrix; download or email the section as a PDF; or add a New Folder of your own.", focus: { x: 195, y: 300, scale: 1.08 }, ring: PM.bar, duration: 7000 },
  { screen: "matrix", url: U_PERSONAL, caption: "Read it at a glance", detail: "✓ complete, ◐ in progress, ✗ empty, — not applicable. The share icon means shareable in the Planner; a sparkle means AI can help plan it.", focus: { x: 195, y: 420, scale: 1.2 }, ring: PM.legend, duration: 8000 },
  { screen: "matrix", url: U_PERSONAL, scroll: 280, caption: "One column per person", detail: "Names run up the side to fit - Sarah ★ is the account holder, then James, Mia and Leo.", focus: { x: 195, y: 600, scale: 1.12 }, ring: PM.names, duration: 6500 },
  { screen: "matrix", url: U_PERSONAL, scroll: 280, caption: "Family folders, and what doesn't apply", detail: "Family Members is one list for the whole family. A dash means it doesn't apply - no driver's licence for Mia or Leo.", focus: { x: 195, y: 760, scale: 1.08 }, ring: pFull({ x: 0, y: pRowY(R_FAMILY), w: 0, h: P_ROW_H }), duration: 7500 },
  { screen: "matrix", url: U_PERSONAL, scroll: 600, caption: "Tap a square to open that person's folder", detail: "Mia's passport is still empty.", focus: { x: 250, y: pRowY(R_PASSPORT) + 54, scale: 1.4 }, ring: { x: pCellX(2), y: pRowY(R_PASSPORT) + 38, w: P_CELL_W, h: 32 }, click: { x: pCellX(2) + P_CELL_W / 2, y: pRowY(R_PASSPORT) + 54 }, duration: 5500 },
  { screen: "mia", url: U_MIA, caption: "Mia's Passport folder", detail: "It lists what's still missing. Upload & scan her passport and the details fill in for you.", focus: { x: 195, y: 520, scale: 1.05 }, ring: { x: PX, y: 430, w: PCW, h: 150 }, duration: 7000 },
  { screen: "miapick", url: U_MIA, caption: "Switch person in one tap", detail: "James's is complete, Sarah's is started.", focus: { x: 160, y: 280, scale: 1.3 }, ring: { x: PX, y: 182, w: 256, h: 216 }, click: mid(P_PICK), duration: 6000 },
  // The rest of the page
  { screen: "org", url: U_ORG, scroll: 1320, caption: "Your progress, and peace of mind", detail: "22 of 77 folders done and 14 in progress. Secure & private and Always backed up explain how your data is kept safe.", focus: { x: 195, y: 1660, scale: 1.08 }, ring: span(PO.stat(0), PO.stat(3)), duration: 7000 },
  { screen: "orghidden", url: U_ORG, scroll: 1396, caption: "New here? And folders you've hidden", detail: "Getting Started Guide shows what to do next. Hidden suggestions brings back folders you snoozed or marked Not applicable.", focus: { x: 195, y: 2030, scale: 1.05 }, ring: span(PO.newTo, PO.hiddenOpen), click: { x: 195, y: 2020 }, duration: 7500 },
  // Header and round buttons
  { screen: "org", url: U_ORG, caption: "TAL AI, reminders, account and menu", detail: "TAL AI is your built-in guide. The bell opens Reminders, your picture opens the account menu, and ☰ opens every other page.", focus: { x: 250, y: 160, scale: 1.6 }, ring: { x: P_ASK.x - 4, y: 54, w: P_MENU.x + P_MENU.w - P_ASK.x + 8, h: 48 }, duration: 7000 },
  { screen: "org", url: U_ORG, caption: "Three round buttons", detail: "? opens help for this page. The compass takes the guided tour. And this one plays the walkthrough - you're watching it now.", focus: { x: 270, y: 780, scale: 1.5 }, ring: { x: P_FAB_R - 200, y: P_FAB_Y, w: 200, h: 56 }, click: { x: P_FAB_R - 172, y: P_FAB_Y + 28 }, duration: 7000 },
]

export default function OrganiserWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "The Adulting Life Organiser (phone)" : "The Adulting Life Organiser (computer)"} url={U_ORG} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "The Adulting Life Organiser", subtitle: "Every important document, for the whole family" }} />
  )
}
