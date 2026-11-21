"use client"

// "Your dashboard" walkthrough for the public /demo page and the dashboard's
// walkthrough button (components/demo/PageWalkthroughFab). Hand-built copies of
// the real screens with a made-up family's sample data (the Taylors, Brisbane) -
// no sign-in, no API calls. Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column; search via the Organiser)
// Copies: app/(app)/dashboard/page.tsx (WelcomeHero, EmergencyCard, banner,
// WizardResumeCard, ProgressCard, StatCards, LifeAdminOverview, RecentSection,
// ContinueLearningCard, CelebrationBanner, RemindersSection, MissingInfoCard,
// QuickActions, TalAiHelperCard, PomCard, LearnCard), components/RecentActivityCard,
// components/PdfActions, components/PlannerShareButton, components/MissingFolderMenu,
// app/(app)/layout.tsx (header), components/AppSidebar + nav-items, components/MobileNav,
// components/HeaderQuickBar, components/UserMenu, components/HelpButton,
// components/tour/TourFab, components/demo/PageWalkthroughFab,
// app/(app)/records/page.tsx (header + categories, phone search route),
// app/(app)/records/search/page.tsx, components/AiSearchAssist + AiConsentGate.
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"
import { useWalkthroughView, type WalkthroughDevice } from "./useWalkthroughDevice"

const Box = ({ x, y, w, h, children, className = "" }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h }}>{children}</div>
)
const Img = ({ src, x, y, w, h, className = "rounded-xl" }: { src: string; x: number; y: number; w: number; h?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute object-cover ${className}`} style={{ left: x, top: y, width: w, height: h ?? w }} />
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

// ── Icons (copied from nav-items.tsx, layout.tsx and the dashboard) ──────────

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
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const TalAiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
const Avatar = ({ size = 36 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white" style={{ width: size, height: size }}>S</span>
)
const WarnBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
)
const EmergencyGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2 3 20h18L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>
)
const ArrowGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const RobotGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M9 12h.01M15 12h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /><path d="M12 4v3M8 19v2M16 19v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
const BookGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
)
const HeartGlyph = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 21s-7-4.5-9-9.5C1.5 7 5 4 8 4c1.7 0 3.1.9 4 2.2C12.9 4.9 14.3 4 16 4c3 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const StarGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.4 1.3-6.6L2.5 9.3l6.6-.8L12 2.5Z" /></svg>
)
const EyeGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>
)
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ShieldGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 11a3 3 0 1 1 6 0v1H9v-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><rect x="8" y="12" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>
)
const DotsGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
)
const ActIcon = ({ kind }: { kind: string }) =>
  kind === "file" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" /></svg>
  : kind === "answer" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 13l2 2 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  : kind === "lesson" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2c.4 0 .78.16 1.06.44l1.3 1.31c.28.28.66.44 1.06.44H19.5A1.5 1.5 0 0 1 21 8.69v9.31A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>

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

const SUMMARY = "5 reminders are coming up and 4 tasks are waiting."
const STATS = [
  { label: "Records & Documents", sub: "Stored securely", v: 23, bg: "bg-violet-50 ring-violet-100", img: "records-documents" },
  { label: "Things expiring soon", sub: "View reminders", v: 5, bg: "bg-amber-50 ring-amber-100", img: "expiring-soon" },
  { label: "Tasks to complete", sub: "Keep it up!", v: 4, bg: "bg-sky-50 ring-sky-100", img: "tasks" },
  { label: "All good", sub: "No overdue items", v: 18, bg: "bg-emerald-50 ring-emerald-100", img: "all-good" },
]
const CATS = [
  { id: "personal", label: "Personal", done: 9, missing: 15, pct: 38, bg: "bg-violet-50 ring-violet-100", bar: "bg-violet-500" },
  { id: "health", label: "Health", done: 6, missing: 11, pct: 35, bg: "bg-amber-50 ring-amber-100", bar: "bg-amber-500" },
  { id: "education", label: "Education", done: 3, missing: 6, pct: 33, bg: "bg-sky-50 ring-sky-100", bar: "bg-sky-500" },
  { id: "employment", label: "Employment", done: 2, missing: 6, pct: 25, bg: "bg-rose-50 ring-rose-100", bar: "bg-rose-500" },
  { id: "admin", label: "Admin & Bookkeeping", done: 3, missing: 18, pct: 14, bg: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-500" },
]
const RECENT = [
  { t: "Medicare card", s: "Health · Today" },
  { t: "Mia's passport", s: "Personal · Yesterday" },
  { t: "Home & contents insurance", s: "Admin & Bookkeeping · 3 days ago" },
  { t: "Leo — school enrolment", s: "Education · 1 week ago" },
]
const ACTIVITY = [
  { k: "file", tone: "bg-violet-100 text-violet-700", t: "Uploaded document: medicare-card.pdf", when: "Today, 9:14 am" },
  { k: "record", tone: "bg-sky-100 text-sky-700", t: "Updated record: Mia's passport", when: "Yesterday, 7:40 pm" },
  { k: "answer", tone: "bg-amber-100 text-amber-800", t: "Updated Home Insurance", when: "3d ago" },
  { k: "lesson", tone: "bg-emerald-100 text-emerald-700", t: "Completed lesson: Birth Certificate", when: "5d ago" },
]
const REMINDERS = [
  { t: "Toyota RAV4 registration", d: "Due in 12 days · 3 Dec 2026" },
  { t: "Home & contents insurance", d: "Due in 24 days · 15 Dec 2026" },
]
const MISSING = [
  { t: "Power of Attorney Details", c: "Personal", reason: "Important for your Emergency Information page.", started: false, menu: false },
  { t: "Dental Records", c: "Health", reason: "", started: true, menu: true },
]
const QUICK = [
  { t: "Add Record", bg: "bg-violet-50", img: "add-record" },
  { t: "Upload Document", bg: "bg-emerald-50", img: "upload-document" },
  { t: "Scan Document", bg: "bg-amber-50", img: "scan-document" },
  { t: "Add Reminder", bg: "bg-rose-50", img: "add-reminder" },
]
const ADD_ACTIONS = ["Add record", "Upload document", "Scan document", "Add reminder"]
const AI_ANSWER = "Your will goes in the Will & Funeral Instructions folder in Personal - add your executor and attach a copy. For your wishes and letters to loved ones, use the Peace of Mind Planner."
const AI_MATCHES = [
  { name: "Will & Funeral Instructions", where: "Personal", why: "store your will and executors" },
  { name: "Peace of Mind Planner", where: "Page", why: "funeral wishes and letters to loved ones" },
]
const Q1 = "passport"
const Q2 = "how do i add a will"

// Small shared pieces of the real cards
function EmergencyCardBody() {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><EmergencyGlyph /></span>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-white/80">In case of emergency</p>
        <p className="font-medium leading-snug">Your emergency information</p>
        <p className="mt-1 text-xs text-white/85">Contacts, medications, insurance and will, on one page ready when it&apos;s needed.</p>
      </div>
    </div>
  )
}
function WizardBody() {
  return (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><ArrowGlyph /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug"><span className="mr-2 text-[10px] font-medium uppercase tracking-widest text-white/80">Setup guide</span>You&apos;re 5 of 8 steps in</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-white" style={{ width: "63%" }} /></div>
      </div>
      <span className="shrink-0 text-white/90">→</span>
    </>
  )
}
function ProgressBody() {
  return (
    <>
      <p className="mb-0.5 flex items-center gap-2 text-sm font-medium"><span>✨</span>You&apos;re doing great!</p>
      <p className="mb-2 text-xs text-tal-plum-soft">You&apos;ve completed 29% of your Organiser</p>
      <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-violet-500" style={{ width: "29%" }} /></div><span className="text-xs font-medium tabular-nums">29%</span></div>
    </>
  )
}
function ReminderRow({ r }: { r: (typeof REMINDERS)[number] }) {
  return (
    <div className="h-full rounded-xl border border-tal-line bg-white p-3">
      <p className="font-medium">{r.t}</p>
      <div className="mt-1 flex items-center justify-between gap-3"><span className="text-xs text-tal-plum-soft">{r.d}</span><span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Soon</span></div>
    </div>
  )
}
function MissingRow({ m }: { m: (typeof MISSING)[number] }) {
  return (
    <div className="flex h-full items-center gap-2 rounded-xl border border-tal-line bg-white p-3">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{m.t}</p>
          <p className="text-xs text-tal-plum-soft">{m.c}</p>
          {m.reason && <p className="mt-1 text-xs italic text-tal-plum-soft/90">{m.reason}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${m.started ? "bg-amber-100 text-amber-900" : "bg-tal-cream text-tal-plum-soft"}`}>{m.started ? "In progress" : "Not started"}</span>
      </div>
      {m.menu && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tal-plum-soft"><DotsGlyph /></span>}
    </div>
  )
}
function ActivityRow({ a }: { a: (typeof ACTIVITY)[number] }) {
  return (
    <div className="flex h-full items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.tone}`}><ActIcon kind={a.k} /></span>
      <span className="line-clamp-3 min-w-0 flex-1 break-all text-sm leading-snug">{a.t}</span>
      <span className="shrink-0 text-xs tabular-nums text-tal-plum-soft">{a.when}</span>
    </div>
  )
}
function ContinueBody() {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-tal-cream-soft text-violet-600"><BookGlyph /></span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-violet-700">Identity documents</p>
          <p className="font-medium leading-snug">Passport &amp; Travel Documents</p>
          <p className="mt-1 text-xs text-tal-plum-soft">3 of 6 lessons · 50% · 4 min read</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-violet-500" style={{ width: "50%" }} /></div>
    </>
  )
}
function PomHead() {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-white"><HeartGlyph /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-tight">Peace of Mind Planner</p>
        <p className="mt-1 text-sm text-tal-plum-soft">Record your wishes, key contacts and practical instructions for the people you trust.</p>
      </div>
    </div>
  )
}
function PomProgress() {
  return (
    <>
      <div className="mb-1.5 flex items-center justify-between text-xs text-tal-plum-soft"><span>3 of 9 sections filled in</span><span className="font-medium">33%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-black" style={{ width: "33%" }} /></div>
      <p className="mt-2 text-sm">Next: <span className="font-medium">Device Access Details</span></p>
    </>
  )
}
const pdfBtn = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"
const iconBtn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tal-line bg-white"
function LearnBody() {
  return (
    <>
      <p className="mb-1 font-display text-xl">Learn progress</p>
      <p className="mb-4 text-sm text-tal-plum-soft">7 of 58 articles read.</p>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-black" style={{ width: "12%" }} /></div>
      <p className="text-sm">2 quizzes taken · 2 passed →</p>
    </>
  )
}
function TalHelperBody() {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-display text-lg">Need a hand?</p>
        <p className="mb-3 text-xs text-tal-plum-soft">Ask TAL AI for help with a form, life-admin task or next step.</p>
        <span className="inline-flex h-9 items-center rounded-lg bg-black px-3 text-sm font-medium text-white">Ask a question</span>
      </div>
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tal-cream-soft"><RobotGlyph /></span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPUTER (1200 x 760)
// ═════════════════════════════════════════════════════════════════════════════

const D_H = 1700 // the dashboard is taller than the window - steps scroll it
const SB = 240 // sidebar width
const L = 272 // content left
const LW = 586 // left column width
const AX = 890 // aside left
const AW = 278 // aside width
const HALF = 285 // half of the left column
const R2 = L + HALF + 16 // second half's left
const navY = (k: number) => 168 + k * 41
// Header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const ADD_MENU = { x: 656, y: 60, w: 192, h: 160 }
const USER_MENU = { x: 952, y: 58, w: 224, h: 290 }
// Dashboard blocks (y in screen px)
const D = {
  hero: { x: L, y: 84, w: HALF, h: 100 },
  sos: { x: R2, y: 72, w: HALF, h: 124 },
  banner: { x: L, y: 228, w: LW, h: 146 },
  wizard: { x: L, y: 406, w: 385, h: 104 },
  progress: { x: L + 401, y: 406, w: 185, h: 104 },
  stats: { x: L, y: 542, w: LW, h: 172 },
  overview: { x: L, y: 746, w: LW, h: 278 },
  recent: { x: L, y: 1056, w: HALF, h: 296 },
  learn: { x: L, y: 1368, w: HALF, h: 196 },
  activity: { x: R2, y: 1056, w: HALF, h: 340 },
  party: { x: L, y: 1580, w: LW, h: 72 },
  reminders: { x: AX, y: 72, w: AW, h: 256 },
  missing: { x: AX, y: 344, w: AW, h: 316 },
  quick: { x: AX, y: 676, w: AW, h: 172 },
  helper: { x: AX, y: 864, w: AW, h: 154 },
  pom: { x: AX, y: 1034, w: AW, h: 420 },
  lprog: { x: AX, y: 1470, w: AW, h: 164 },
}
const POM_ROW = (r: number) => D.pom.y + D.pom.h - 24 - 36 - (2 - r) * 44
const D_SHIELD = { x: AX + 142, y: POM_ROW(2), w: 36, h: 36 }
const statX = (n: number) => L + n * 150
const catX = (n: number) => L + 24 + n * 110
const FAB_Y = 680 // bottom-6 in the first window
const FAB_R = 1176 // right-6

function DShell({ children, query, typed, addOpen, userOpen, h = D_H, fabs = true }: { children: ReactNode; query?: string; typed?: boolean; addOpen?: boolean; userOpen?: boolean; h?: number; fabs?: boolean }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {/* Sidebar (AppSidebar) */}
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === 0 ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === 0 ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}
      <Box x={16} y={772} w={208} h={136} className="flex flex-col items-center justify-center rounded-2xl bg-tal-cream-soft p-5 text-center text-tal-plum">
        <HeartGlyph />
        <p className="mb-2 mt-2 font-display text-lg leading-tight">You&apos;ve got this!</p>
        <p className="text-xs leading-snug text-tal-plum-soft">One step at a time.<br />We&apos;re here to help.</p>
      </Box>
      <Box x={78} y={920} w={84} h={36} className="flex justify-center gap-2">
        <span className="h-9 w-9 rounded-full bg-tal-cream" /><span className="h-9 w-9 rounded-full bg-tal-cream" />
      </Box>

      {/* Header (layout.tsx) */}
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span>
        {query ? <span>{typed ? <Typed text={query} /> : query}</span> : <span className="text-tal-plum-soft">Search your organiser…</span>}
      </Box>
      <Box {...ADD} className={`flex items-center justify-center gap-1.5 rounded-full border border-tal-line text-sm font-medium ${addOpen ? "bg-tal-cream" : "bg-white"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>Add
      </Box>
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
      {userOpen && (
        <Box {...USER_MENU} className="rounded-xl border border-tal-line bg-white py-2 shadow-lg">
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
      )}
    </div>
  )
}

function DDash(props: { addOpen?: boolean; userOpen?: boolean; query?: string; typed?: boolean }) {
  return (
    <DShell {...props}>
      {/* WelcomeHero + EmergencyCard */}
      <Box {...D.hero} className="py-2">
        <p className="font-display text-3xl leading-tight">Hi Sarah.</p>
        <p className="mt-1 text-tal-plum-soft">{SUMMARY}</p>
      </Box>
      <Box {...D.sos} className="rounded-2xl bg-red-600 p-4 text-white shadow-md"><EmergencyCardBody /></Box>
      <Img src="/thumbnails/banners/dashboard.jpg" x={D.banner.x} y={D.banner.y} w={D.banner.w} h={D.banner.h} className="rounded-2xl border border-tal-line" />
      {/* SetupAndProgressRow */}
      <Box {...D.wizard} className="flex items-center gap-4 rounded-2xl bg-black p-5 text-white shadow-sm"><WizardBody /></Box>
      <Box {...D.progress} className="flex flex-col justify-center rounded-2xl bg-tal-cream-soft p-5"><ProgressBody /></Box>
      {/* StatCards */}
      {STATS.map((s, n) => (
        <Box key={s.label} x={statX(n)} y={D.stats.y} w={134} h={D.stats.h} className={`rounded-2xl p-5 ring-1 ${s.bg}`}>
          <div className="flex items-center justify-between gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/thumbnails/dashboard/${s.img}.png`} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
            <span className="font-display text-2xl leading-none tabular-nums">{s.v}</span>
          </div>
          <p className="mt-4 font-medium leading-tight">{s.label}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-tal-plum-soft"><span>{s.sub}</span><span>→</span></div>
        </Box>
      ))}
      {/* LifeAdminOverview */}
      <Box {...D.overview} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={L + 24} y={D.overview.y + 24} w={LW - 48} h={28} className="flex items-baseline justify-between">
        <span className="font-display text-xl">Organiser Overview</span><span className="text-sm text-tal-plum-soft">View all sections →</span>
      </Box>
      {CATS.map((c, n) => (
        <Box key={c.id} x={catX(n)} y={D.overview.y + 68} w={98} h={186} className={`flex flex-col rounded-2xl p-3 ring-1 ${c.bg}`}>
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/thumbnails/categories/${c.id}.png`} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
            <span className="font-display text-3xl leading-none">{c.done}</span>
          </div>
          <p className="mb-3 h-9 text-sm font-medium leading-tight">{c.label}</p>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white"><div className={`h-full ${c.bar}`} style={{ width: `${c.pct}%` }} /></div>
          <p className="flex items-center gap-1 text-xs text-tal-plum-soft"><WarnBadge />{c.missing} missing</p>
        </Box>
      ))}
      {/* RecentSection + ContinueLearningCard */}
      <Box x={L} y={D.recent.y} w={HALF} h={28} className="font-display text-xl">Pick up where you left off</Box>
      {RECENT.map((r, n) => (
        <Box key={r.t} x={L} y={D.recent.y + 40 + n * 66} w={HALF} h={58} className="rounded-xl border border-tal-line bg-white p-3">
          <p className="truncate font-medium">{r.t}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{r.s}</p>
        </Box>
      ))}
      <Box {...D.learn} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3"><span className="font-display text-xl">Continue Learning</span><span className="text-sm text-tal-plum-soft">View all →</span></div>
        <ContinueBody />
      </Box>
      {/* RecentActivityCard */}
      <Box {...D.activity} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={R2 + 24} y={D.activity.y + 24} w={HALF - 48} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Recent activity</span><span className="text-sm text-tal-plum-soft">View all 9 →</span></Box>
      {ACTIVITY.map((a, n) => (
        <Box key={a.t} x={R2 + 20} y={D.activity.y + 72 + n * 68} w={HALF - 40} h={64}><ActivityRow a={a} /></Box>
      ))}
      {/* CelebrationBanner */}
      <Box {...D.party} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><StarGlyph /></span>
        <div><p className="font-medium">Great job! You&apos;ve uploaded 3 new documents this month.</p><p className="text-xs text-tal-plum-soft">You&apos;re building a better future for you!</p></div>
      </Box>

      {/* Aside: RemindersSection */}
      <Box {...D.reminders} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={AX + 24} y={D.reminders.y + 22} w={AW - 48} h={52}>
        <p className="font-display text-xl leading-tight">Upcoming reminders</p>
        <p className="mt-1 text-sm text-tal-plum-soft">View all 5 (in next 60 days) →</p>
      </Box>
      {REMINDERS.map((r, n) => (
        <Box key={r.t} x={AX + 24} y={D.reminders.y + 88 + n * 76} w={AW - 48} h={68}><ReminderRow r={r} /></Box>
      ))}
      {/* MissingInfoCard */}
      <Box {...D.missing} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={AX + 20} y={D.missing.y + 20} w={AW - 40} h={26} className="flex items-baseline justify-between"><span className="font-display text-lg">Next things to complete</span><span className="text-xs text-tal-plum-soft">View all →</span></Box>
      <Box x={AX + 20} y={D.missing.y + 52} w={AW - 40} h={18} className="text-xs text-tal-plum-soft">A few folders are still empty or half-done.</Box>
      <Box x={AX + 20} y={D.missing.y + 82} w={AW - 40} h={124}><MissingRow m={MISSING[0]} /></Box>
      <Box x={AX + 20} y={D.missing.y + 214} w={AW - 40} h={82}><MissingRow m={MISSING[1]} /></Box>
      {/* QuickActions */}
      <Box {...D.quick} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={AX + 20} y={D.quick.y + 20} w={AW - 40} h={24} className="font-display text-lg">Quick Actions</Box>
      {QUICK.map((q, n) => (
        <Box key={q.t} x={AX + 20 + n * 61} y={D.quick.y + 56} w={54} h={96} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center ${q.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/dashboard/${q.img}.png`} alt="" className="h-9 w-9 rounded-xl bg-white object-cover ring-1 ring-white" />
          <span className="text-[11px] font-medium leading-tight">{q.t}</span>
        </Box>
      ))}
      {/* TalAiHelperCard */}
      <Box {...D.helper} className="rounded-2xl border border-tal-line bg-white p-5"><TalHelperBody /></Box>
      {/* PomCard */}
      <Box {...D.pom} className="rounded-2xl border border-tal-line bg-gradient-to-br from-white to-tal-cream-soft p-6">
        <PomHead />
        <div className="mt-5"><PomProgress /></div>
      </Box>
      <Box x={AX + 24} y={POM_ROW(0)} w={92} h={36} className="inline-flex items-center justify-center rounded-lg bg-black text-sm font-medium text-white">Continue</Box>
      <Box x={AX + 124} y={POM_ROW(0)} w={36} h={36} className={iconBtn}><EyeGlyph /></Box>
      <Box x={AX + 24} y={POM_ROW(1)} w={132} h={36} className={pdfBtn}><PdfGlyph />Download PDF</Box>
      <Box x={AX + 24} y={POM_ROW(2)} w={110} h={36} className={pdfBtn}><MailGlyph />Share PDF</Box>
      <Box {...D_SHIELD} className={iconBtn}><ShieldGlyph /></Box>
      {/* LearnCard */}
      <Box {...D.lprog} className="rounded-2xl border border-tal-line bg-white p-6"><LearnBody /></Box>
    </DShell>
  )
}

// Search results page (app/(app)/records/search) - the header search lands here.
const SR = { input: { x: L, y: 128, w: 794, h: 44 }, btn: { x: L + 802, y: 128, w: 94, h: 44 } }
const SR_FOLDER = { x: L, y: 228, w: 896, h: 62 }
const AI = {
  card: { x: L, y: 196, w: 896, h: 290 },
  ask: { x: L + 20, y: 240, w: 216, h: 40 },
  answer: { x: L + 20, y: 252, w: 856, h: 44 },
  match: (n: number) => ({ x: L + 20, y: 308 + n * 70, w: 856, h: 62 }),
  note: { x: L + 20, y: 452, w: 856, h: 18 },
}
const CONSENT = { x: 376, y: 250, w: 448, h: 262 }
const CONSENT_GO = { x: CONSENT.x + CONSENT.w - 24 - 96, y: CONSENT.y + CONSENT.h - 24 - 36, w: 96, h: 36 }

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
function ConsentModal({ x, y, w, h, go }: { x: number; y: number; w: number; h: number; go: { x: number; y: number; w: number; h: number } }) {
  return (
    <>
      <div className="absolute inset-0 bg-black/40" />
      <Box x={x} y={y} w={w} h={h} className="rounded-2xl bg-white p-6 shadow-lg">
        <p className="mb-2 font-display text-lg">Ask TAL AI to find it</p>
        <p className="mb-4 text-sm text-tal-plum-soft">Your search words are sent to OpenAI, with the names of the app&apos;s folders and pages, so it can work out where to find what you&apos;re after. Nothing you&apos;ve stored in your folders is sent. It isn&apos;t used to train their models.</p>
        <p className="flex items-center gap-2 text-xs text-tal-plum-soft"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-blue-600 text-[9px] text-white">✓</span>Don&apos;t ask me again on this device</p>
      </Box>
      <Box x={go.x - 84} y={go.y} w={76} h={36} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>
      <Box {...go} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Continue</Box>
    </>
  )
}

function DSearch({ q, mode }: { q: string; mode: "found" | "none" | "consent" | "ai" }) {
  return (
    <DShell query={q} h={760} fabs={false}>
      <Box x={L} y={76} w={896} h={40} className="flex items-baseline justify-between"><span className="font-display text-3xl">Search records</span><span className="text-sm">← Back</span></Box>
      <Box {...SR.input} className="flex items-center rounded-xl border border-tal-line bg-white px-3">{q}</Box>
      <Box {...SR.btn} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Search</Box>
      {mode === "found" ? (
        <>
          <Box x={L} y={196} w={300} h={24} className="font-display">Folders (1)</Box>
          <Box {...SR_FOLDER} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
            <div><p className="font-medium">Passport &amp; Travel Documents</p><p className="text-xs text-tal-plum-soft">Personal</p></div><span className="text-tal-plum-soft">›</span>
          </Box>
          <Box x={L} y={322} w={300} h={24} className="font-display">Records (2)</Box>
          {[{ t: "Sarah's passport", s: "Personal · expires 2031-03-14", p: "Active", c: "bg-green-100 text-green-800" }, { t: "Mia's passport", s: "Personal · expires 2027-01-09", p: "Expiring soon", c: "bg-amber-100 text-amber-800" }].map((r, n) => (
            <Box key={r.t} x={L} y={354 + n * 70} w={896} h={62} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
              <div><p className="font-medium">{r.t}</p><p className="text-xs text-tal-plum-soft">{r.s}</p></div><span className={`rounded-full px-2 py-1 text-xs ${r.c}`}>{r.p}</span>
            </Box>
          ))}
        </>
      ) : (
        <>
          <Box {...AI.card} h={mode === "ai" ? AI.card.h : 104} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={L + 20} y={AI.card.y + 20} w={856} h={24}>Nothing matched &ldquo;{q}&rdquo; in your folders.</Box>
          {mode !== "ai" && <Box {...AI.ask} className="flex items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"><span>✨</span> Ask TAL AI to find it</Box>}
          {mode === "ai" && <AiAnswer x={L + 20} w={856} answerY={AI.answer.y} matchY={AI.match(0).y} gap={70} noteY={AI.note.y} />}
          {mode === "consent" && <ConsentModal {...CONSENT} go={CONSENT_GO} />}
        </>
      )}
    </DShell>
  )
}

const D_SCREENS: Record<string, ReactNode> = {
  dash: <DDash />,
  dashadd: <DDash addOpen />,
  dashuser: <DDash userOpen />,
  typing: <DDash query={Q1} typed />,
  found: <DSearch q={Q1} mode="found" />,
  none: <DSearch q={Q2} mode="none" />,
  consent: <DSearch q={Q2} mode="consent" />,
  ai: <DSearch q={Q2} mode="ai" />,
}
const UD = "app.theadultinglife.com.au/dashboard"
const US1 = `app.theadultinglife.com.au/records/search?q=${Q1}`
const US2 = "app.theadultinglife.com.au/records/search?q=how+do+i+add+a+will"
const mid = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const ring = (b: { x: number; y: number; w: number; h: number }, pad = 0) => ({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 })

const D_STEPS: WalkStep[] = [
  { screen: "dash", url: UD, caption: "Your dashboard - life at a glance", detail: "What's coming up, what's left to do and how far you've got, for the whole family, on one page.", duration: 6500 },
  // Search
  { screen: "typing", url: UD, caption: "Search your organiser", detail: "Type a word - a folder, a record title, a note - and press Enter.", focus: { x: 470, y: 120, scale: 1.6 }, ring: SEARCH, click: { x: SEARCH.x + 200, y: SEARCH.y + 20 }, duration: 6000 },
  { screen: "found", url: US1, caption: "\"passport\" finds the Passport folder", detail: "Plus every passport record in the family, with its expiry. Click the folder to open it.", focus: { x: 720, y: 300, scale: 1.25 }, ring: SR_FOLDER, click: { x: L + 200, y: SR_FOLDER.y + 31 }, duration: 6500 },
  { screen: "none", url: US2, caption: "No match? Ask TAL AI to find it", detail: "Search for \"how do i add a will\" and nothing is called that - so TAL AI offers to point you to the right place.", focus: { x: 560, y: 220, scale: 1.45 }, ring: AI.ask, click: mid(AI.ask), duration: 6500 },
  { screen: "consent", url: US2, caption: "Only your search words are sent", detail: "The first time, it asks first. Nothing you've stored in your folders goes to the AI.", focus: { x: 600, y: 380, scale: 1.4 }, ring: CONSENT_GO, click: mid(CONSENT_GO), duration: 6500 },
  { screen: "ai", url: US2, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner - with a line on what to do there.", focus: { x: 620, y: 340, scale: 1.3 }, ring: { x: L + 12, y: 244, w: 872, h: 200 }, duration: 8000 },
  { screen: "ai", url: US2, caption: "Click a suggestion to go straight there", detail: "Typos work too - \"pasport\" finds nothing, and TAL AI says you meant Passport. It's a guide only.", focus: { x: 620, y: 360, scale: 1.3 }, ring: AI.match(0), click: { x: L + 160, y: AI.match(0).y + 31 }, duration: 7000 },
  // Header
  { screen: "dashadd", url: UD, caption: "+ Add - from anywhere", detail: "Add record, Upload document, Scan document or Add reminder, without hunting for the right page.", focus: { x: 720, y: 150, scale: 1.7 }, ring: { x: ADD.x, y: ADD.y, w: ADD_MENU.w, h: ADD_MENU.y + ADD_MENU.h - ADD.y }, click: mid(ADD), duration: 6500 },
  { screen: "dash", url: UD, caption: "Ask TAL AI", detail: "TAL = The Adulting Life. Your built-in guide - ask it anything about the app, a form or a life-admin job.", focus: { x: 980, y: 120, scale: 1.7 }, ring: ASK, click: mid(ASK), duration: 6000 },
  { screen: "dash", url: UD, caption: "The bell opens your reminders", detail: "Every renewal and expiry date - rego, insurance, passports - in one list.", focus: { x: 1000, y: 120, scale: 1.8 }, ring: BELL, click: mid(BELL), duration: 5000 },
  { screen: "dashuser", url: UD, caption: "Your account menu", detail: "Who's signed in, your TAL Premium plan, take the tour again, privacy, terms and sign out.", focus: { x: 1010, y: 220, scale: 1.6 }, ring: { x: USER_MENU.x, y: USER.y, w: USER_MENU.w, h: USER_MENU.y + USER_MENU.h - USER.y }, click: mid(USER), duration: 6500 },
  // Top of the page
  { screen: "dash", url: UD, caption: "Hi Sarah - here's what's waiting", detail: "A one-line summary: reminders coming up (or expired) and tasks still to do.", focus: { x: 480, y: 160, scale: 1.6 }, ring: ring(D.hero, 4), duration: 5500 },
  { screen: "dash", url: UD, caption: "In case of emergency", detail: "One tap to the family's emergency page: contacts, medications, insurance and will - ready for a paramedic or a trusted person.", focus: { x: 715, y: 160, scale: 1.6 }, ring: D.sos, click: { x: mid(D.sos).x, y: mid(D.sos).y }, duration: 6500 },
  { screen: "dash", url: UD, caption: "Upcoming reminders", detail: "The next things due in the next 60 days - amber when soon, red when expired. View all opens Reminders.", focus: { x: 1000, y: 220, scale: 1.45 }, ring: D.reminders, duration: 6500 },
  { screen: "dash", url: UD, caption: "Your Setup guide and progress", detail: "Pick up the Setup guide where you left off - and watch how much of your Organiser you've filled in.", scroll: 140, focus: { x: 565, y: 400, scale: 1.25 }, ring: { x: L - 4, y: D.wizard.y - 4, w: LW + 8, h: D.wizard.h + 8 }, click: mid(D.wizard), duration: 7000 },
  { screen: "dash", url: UD, caption: "Four numbers that matter", detail: "Records & Documents and All good open the Organiser; Things expiring soon opens Reminders; Tasks to complete opens Tasks.", scroll: 330, focus: { x: 565, y: 628, scale: 1.4 }, ring: D.stats, duration: 8000 },
  { screen: "dash", url: UD, caption: "Organiser Overview", detail: "Personal, Health, Education, Employment and Admin - how many folders are done and how many are still missing.", scroll: 520, focus: { x: 565, y: 885, scale: 1.35 }, ring: D.overview, click: { x: catX(0) + 49, y: D.overview.y + 160 }, duration: 7000 },
  { screen: "dash", url: UD, caption: "Pick up where you left off", detail: "The last records you touched, and the next lesson in Learn - one click back in.", scroll: 820, focus: { x: 420, y: 1300, scale: 1.25 }, ring: { x: L - 4, y: D.recent.y - 4, w: HALF + 8, h: D.learn.y + D.learn.h - D.recent.y + 8 }, duration: 7000 },
  { screen: "dash", url: UD, caption: "Recent activity", detail: "Uploads, updates and lessons from the whole family - and a cheer when you've been busy.", scroll: 940, focus: { x: 600, y: 1350, scale: 1.2 }, ring: D.activity, duration: 6500 },
  // Right-hand column
  { screen: "dash", url: UD, caption: "Next things to complete", detail: "Empty or half-done folders, the important ones first. The ⋯ menu snoozes one for 30 days or marks it Not applicable.", scroll: 220, focus: { x: 1020, y: 500, scale: 1.45 }, ring: D.missing, click: { x: AX + AW - 50, y: D.missing.y + 255 }, duration: 7500 },
  { screen: "dash", url: UD, caption: "Quick Actions - and a hand from TAL AI", detail: "Add Record, Upload Document, Scan Document, Add Reminder. Stuck? Ask a question.", scroll: 480, focus: { x: 1020, y: 850, scale: 1.4 }, ring: { x: AX, y: D.quick.y, w: AW, h: D.helper.y + D.helper.h - D.quick.y }, duration: 7000 },
  { screen: "dash", url: UD, caption: "Peace of Mind Planner", detail: "Continue where you're up to, preview it, download or email the PDF - or nominate someone you trust to view it.", scroll: 760, focus: { x: 1020, y: 1235, scale: 1.4 }, ring: D.pom, click: mid(D_SHIELD), duration: 8000 },
  { screen: "dash", url: UD, caption: "Learn progress", detail: "Bite-sized lessons on Australian life admin, with quizzes - see how many you've read.", scroll: 940, focus: { x: 1020, y: 1520, scale: 1.4 }, ring: D.lprog, duration: 6000 },
  // Sidebar and round buttons
  { screen: "dash", url: UD, caption: "Everything else is in the menu", detail: "The Organiser, Documents, Receipts, the Planner, Learn, TAL AI, Tasks, Reminders, Emergency, Settings, Subscription and Maps.", focus: { x: 300, y: 420, scale: 1.15 }, ring: { x: 8, y: navY(0) - 4, w: 224, h: navY(13) + 45 - navY(0) }, duration: 8000 },
  { screen: "dash", url: UD, caption: "Three round buttons, on every page", detail: "? opens help for the page you're on. The compass takes the guided tour.", focus: { x: 1050, y: 640, scale: 1.8 }, ring: { x: FAB_R - 128, y: FAB_Y, w: 128, h: 56 }, duration: 6500 },
  { screen: "dash", url: UD, caption: "And this one plays the walkthrough", detail: "You're watching it now. Pages with a walkthrough show this button.", focus: { x: 1050, y: 640, scale: 1.8 }, ring: { x: FAB_R - 200, y: FAB_Y, w: 56, h: 56 }, click: { x: FAB_R - 172, y: FAB_Y + 28 }, duration: 6000 },
]

// ═════════════════════════════════════════════════════════════════════════════
// PHONE (390 x 844)
// ═════════════════════════════════════════════════════════════════════════════

const PW = 390
const PX = 8 // main px-2
const PCW = 374
const P_FAB_Y = 764
const P_FAB_R = 366
// Mobile header controls (layout.tsx at < 768px)
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const P_USER_MENU = { x: 102, y: 102, w: 224, h: 290 }
// Dashboard blocks (y in screen px)
const P = {
  hero: { x: PX, y: 116, w: PCW, h: 100 },
  sos: { x: PX, y: 232, w: PCW, h: 104 },
  banner: { x: PX, y: 368, w: PCW, h: 94 },
  wizard: { x: PX, y: 494, w: PCW, h: 92 },
  progress: { x: PX, y: 602, w: PCW, h: 96 },
  stat: (n: number) => ({ x: PX, y: 730 + n * 96, w: PCW, h: 80 }),
  overview: { x: PX, y: 1130, w: PCW, h: 510 },
  recent: { x: PX, y: 1672, w: PCW, h: 296 },
  learn: { x: PX, y: 1984, w: PCW, h: 168 },
  activity: { x: PX, y: 2168, w: PCW, h: 336 },
  party: { x: PX, y: 2536, w: PCW, h: 84 },
  reminders: { x: PX, y: 2652, w: PCW, h: 260 },
  missing: { x: PX, y: 2928, w: PCW, h: 300 },
  quick: { x: PX, y: 3244, w: PCW, h: 300 },
  helper: { x: PX, y: 3560, w: PCW, h: 150 },
  pom: { x: PX, y: 3726, w: PCW, h: 290 },
  lprog: { x: PX, y: 4032, w: PCW, h: 160 },
}
const P_H = 4230
const P_POM_ROW = P.pom.y + P.pom.h - 24 - 36
const P_SHIELD = { x: PX + 256, y: P_POM_ROW, w: 36, h: 36 }

const StatusBar = ({ light }: { light?: boolean }) => (
  <Box x={0} y={0} w={PW} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${light ? "text-white" : "text-tal-plum-dark"}`}>
    <span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
function PHeader({ userOpen }: { userOpen?: boolean }) {
  return (
    <>
      <Box x={0} y={44} w={PW} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 ${userOpen ? "bg-tal-cream" : ""}`}><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}
const PPage = ({ children, h = 844 }: { children: ReactNode; h?: number }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>{children}</div>
)

function PDash({ userOpen, drawer }: { userOpen?: boolean; drawer?: boolean }) {
  return (
    <PPage h={P_H}>
      <StatusBar />
      <PHeader userOpen={userOpen} />
      <Box {...P.hero} className="py-2">
        <p className="font-display text-2xl leading-tight">Hi Sarah.</p>
        <p className="mt-1 text-tal-plum-soft">{SUMMARY}</p>
      </Box>
      <Box {...P.sos} className="rounded-2xl bg-red-600 p-4 text-white shadow-md"><EmergencyCardBody /></Box>
      <Img src="/thumbnails/banners/dashboard.jpg" x={P.banner.x} y={P.banner.y} w={P.banner.w} h={P.banner.h} className="rounded-2xl border border-tal-line" />
      <Box {...P.wizard} className="flex items-center gap-4 rounded-2xl bg-black p-5 text-white shadow-sm"><WizardBody /></Box>
      <Box {...P.progress} className="flex flex-col justify-center rounded-2xl bg-tal-cream-soft p-5"><ProgressBody /></Box>
      {STATS.map((s, n) => (
        <Box key={s.label} {...P.stat(n)} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${s.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/dashboard/${s.img}.png`} alt="" className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
          <div className="min-w-0 flex-1"><p className="font-medium leading-tight">{s.label}</p><p className="mt-0.5 truncate text-xs text-tal-plum-soft">{s.sub}</p></div>
          <div className="flex shrink-0 flex-col items-end"><span className="font-display text-2xl leading-none tabular-nums">{s.v}</span><span className="mt-1 text-xs text-tal-plum-soft">→</span></div>
        </Box>
      ))}
      {/* Organiser Overview */}
      <Box {...P.overview} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 24} y={P.overview.y + 24} w={PCW - 48} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Organiser Overview</span><span className="text-sm text-tal-plum-soft">View all sections →</span></Box>
      {CATS.map((c, n) => (
        <Box key={c.id} x={PX + 24} y={P.overview.y + 68 + n * 86} w={PCW - 48} h={74} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${c.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/categories/${c.id}.png`} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{c.label}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white"><div className={`h-full ${c.bar}`} style={{ width: `${c.pct}%` }} /></div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-tal-plum-soft"><WarnBadge />{c.missing} missing</p>
          </div>
          <span className="shrink-0 font-display text-3xl leading-none tabular-nums">{c.done}</span>
        </Box>
      ))}
      {/* Pick up where you left off + Continue Learning */}
      <Box x={PX} y={P.recent.y} w={PCW} h={28} className="font-display text-xl">Pick up where you left off</Box>
      {RECENT.map((r, n) => (
        <Box key={r.t} x={PX} y={P.recent.y + 40 + n * 66} w={PCW} h={58} className="rounded-xl border border-tal-line bg-white p-3">
          <p className="truncate font-medium">{r.t}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{r.s}</p>
        </Box>
      ))}
      <Box {...P.learn} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3"><span className="font-display text-xl">Continue Learning</span><span className="text-sm text-tal-plum-soft">View all →</span></div>
        <ContinueBody />
      </Box>
      {/* Recent activity */}
      <Box {...P.activity} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 24} y={P.activity.y + 24} w={PCW - 48} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Recent activity</span><span className="text-sm text-tal-plum-soft">View all 9 →</span></Box>
      {ACTIVITY.map((a, n) => (
        <Box key={a.t} x={PX + 16} y={P.activity.y + 72 + n * 62} w={PCW - 32} h={54}><ActivityRow a={a} /></Box>
      ))}
      <Box {...P.party} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><StarGlyph /></span>
        <div><p className="font-medium leading-snug">Great job! You&apos;ve uploaded 3 new documents this month.</p><p className="text-xs text-tal-plum-soft">You&apos;re building a better future for you!</p></div>
      </Box>
      {/* Upcoming reminders */}
      <Box {...P.reminders} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={PX + 24} y={P.reminders.y + 22} w={PCW - 48} h={52}>
        <p className="font-display text-xl leading-tight">Upcoming reminders</p>
        <p className="mt-1 text-sm text-tal-plum-soft">View all 5 (in next 60 days) →</p>
      </Box>
      {REMINDERS.map((r, n) => (
        <Box key={r.t} x={PX + 24} y={P.reminders.y + 90 + n * 76} w={PCW - 48} h={68}><ReminderRow r={r} /></Box>
      ))}
      {/* Next things to complete */}
      <Box {...P.missing} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 20} y={P.missing.y + 20} w={PCW - 40} h={26} className="flex items-baseline justify-between"><span className="font-display text-lg">Next things to complete</span><span className="text-xs text-tal-plum-soft">View all →</span></Box>
      <Box x={PX + 20} y={P.missing.y + 52} w={PCW - 40} h={18} className="text-xs text-tal-plum-soft">A few folders are still empty or half-done.</Box>
      <Box x={PX + 20} y={P.missing.y + 82} w={PCW - 40} h={98}><MissingRow m={MISSING[0]} /></Box>
      <Box x={PX + 20} y={P.missing.y + 188} w={PCW - 40} h={76}><MissingRow m={MISSING[1]} /></Box>
      {/* Quick Actions */}
      <Box {...P.quick} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 20} y={P.quick.y + 20} w={PCW - 40} h={24} className="font-display text-lg">Quick Actions</Box>
      {QUICK.map((q, n) => (
        <Box key={q.t} x={PX + 20 + (n % 2) * 173} y={P.quick.y + 56 + Math.floor(n / 2) * 116} w={161} h={104} className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center ${q.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/dashboard/${q.img}.png`} alt="" className="h-12 w-12 rounded-xl bg-white object-cover ring-1 ring-white" />
          <span className="text-sm font-medium">{q.t}</span>
        </Box>
      ))}
      <Box {...P.helper} className="rounded-2xl border border-tal-line bg-white p-5"><TalHelperBody /></Box>
      <Box {...P.pom} className="rounded-2xl border border-tal-line bg-gradient-to-br from-white to-tal-cream-soft p-6">
        <PomHead />
        <div className="mt-5"><PomProgress /></div>
      </Box>
      <Box x={PX + 24} y={P_POM_ROW} w={92} h={36} className="inline-flex items-center justify-center rounded-lg bg-black text-sm font-medium text-white">Continue</Box>
      {[<EyeGlyph key="e" />, <PdfGlyph key="p" />, <MailGlyph key="m" />].map((g, n) => (
        <Box key={n} x={PX + 124 + n * 44} y={P_POM_ROW} w={36} h={36} className={n === 0 ? iconBtn : "inline-flex items-center justify-center rounded-xl border border-tal-line bg-white"}>{g}</Box>
      ))}
      <Box {...P_SHIELD} className={iconBtn}><ShieldGlyph /></Box>
      <Box {...P.lprog} className="rounded-2xl border border-tal-line bg-white p-6"><LearnBody /></Box>

      <Fabs y={P_FAB_Y} right={P_FAB_R} />

      {userOpen && (
        <Box {...P_USER_MENU} className="rounded-xl border border-tal-line bg-white py-2 shadow-lg">
          <div className="mb-1 border-b border-tal-line px-4 py-1.5"><p className="mb-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Signed in as</p><p className="truncate text-sm">sarah.taylor@example.com</p></div>
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
      )}
      {drawer && <PDrawer />}
    </PPage>
  )
}

// The menu drawer (MobileNav): the phone's version of the sidebar.
const DRAWER_W = 288
const dNavY = (k: number) => 156 + k * 44
function PDrawer() {
  return (
    <>
      <div className="absolute left-0 top-0 w-full bg-black/50" style={{ height: 844 }} />
      <Box x={0} y={0} w={DRAWER_W} h={844} className="bg-black text-white shadow-2xl" />
      <StatusBar light />
      <Img src="/icons-pwa/icon-192.png" x={16} y={60} w={40} />
      <Box x={DRAWER_W - 52} y={62} w={36} h={36} className="flex items-center justify-center rounded-full text-white/80">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
      <Box x={0} y={106} w={DRAWER_W} h={34} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.</Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={dNavY(k)} w={DRAWER_W - 24} h={40} className={`flex items-center gap-3 rounded-xl px-3 text-sm ${k === 0 ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${k === 0 ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
          <span className={`flex h-8 w-6 shrink-0 items-center justify-center text-xs font-semibold ${k === 0 ? "text-tal-plum/70" : "text-white/70"}`}>ⓘ</span>
        </Box>
      ))}
    </>
  )
}

// The Organiser's header (app/(app)/records): on a phone, search lives here.
const P_SEARCH_BTN = { x: 102, y: 252, w: 140, h: 36 }
const P_CAT_DESC: Record<string, string> = {
  personal: "IDs, birth certificates, wills and important personal information.",
  health: "Medical records, health insurance, medications and doctors.",
  education: "Certificates, transcripts, resumes and study records.",
}
const P_CAT_PILL: Record<string, string> = { personal: "bg-violet-100 text-violet-800", health: "bg-amber-100 text-amber-800", education: "bg-sky-100 text-sky-800" }
function POrganiser() {
  return (
    <PPage>
      <StatusBar />
      <PHeader />
      <Box x={PX} y={116} w={PCW} h={188} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={PX + 20} y={130} w={36} />
      <Box x={PX + 68} y={128} w={PCW - 88} h={64} className="font-display text-2xl leading-tight">The Adulting Life Organiser</Box>
      <Box x={PX + 20} y={198} w={PCW - 40} h={42} className="text-sm text-tal-plum-soft">All your important information, organised in one place.</Box>
      <Box {...P_SEARCH_BTN} className="flex items-center gap-2 rounded-lg border border-tal-line bg-white px-3 text-sm text-tal-plum-soft"><SearchIcon size={14} />Search records</Box>
      <Box x={250} y={252} w={112} h={36} className="flex items-center justify-center gap-1.5 rounded-lg bg-black text-sm font-medium text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>Add Record
      </Box>
      <Box x={PX} y={320} w={PCW} h={28} className="font-display text-xl">Choose a category</Box>
      {CATS.slice(0, 3).map((c, n) => (
        <Box key={c.id} x={PX} y={360 + n * 166} w={PCW} h={150} className={`flex flex-col rounded-2xl p-5 ring-1 ${c.bg}`}>
          <div className="mb-3 flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/thumbnails/categories/${c.id}.png`} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
            <div className="min-w-0 flex-1"><p className="font-display text-lg leading-tight">{c.label}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{P_CAT_DESC[c.id]}</p></div>
          </div>
          <div className="mt-auto">
            <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">{c.done} of {c.done + c.missing} folders complete</span><span className={`rounded-full px-2 py-0.5 font-medium ${P_CAT_PILL[c.id]}`}>{c.pct}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full ${c.bar}`} style={{ width: `${c.pct}%` }} /></div>
          </div>
        </Box>
      ))}
    </PPage>
  )
}

// Search results page on a phone
const P_SR = { input: { x: PX, y: 172, w: 282, h: 44 }, btn: { x: 298, y: 172, w: 84, h: 44 } }
const P_FOLDER = { x: PX, y: 272, w: PCW, h: 62 }
const P_AI = {
  card: { x: PX, y: 236, w: PCW, h: 410 },
  ask: { x: PX + 20, y: 316, w: 216, h: 40 },
  answerY: 320,
  matchY: 432,
  gap: 84,
  noteY: 604,
}
const P_CONSENT = { x: 16, y: 262, w: 358, h: 318 }
const P_CONSENT_GO = { x: P_CONSENT.x + P_CONSENT.w - 24 - 96, y: P_CONSENT.y + P_CONSENT.h - 24 - 36, w: 96, h: 36 }
function PSearch({ q, mode, typed }: { q: string; mode: "found" | "none" | "consent" | "ai" | "empty"; typed?: boolean }) {
  return (
    <PPage>
      <StatusBar />
      <PHeader />
      <Box x={PX} y={120} w={PCW} h={40} className="flex items-baseline justify-between"><span className="font-display text-3xl">Search records</span><span className="text-sm">← Back</span></Box>
      <Box {...P_SR.input} className="flex items-center overflow-hidden whitespace-nowrap rounded-xl border border-tal-line bg-white px-3">{typed ? <Typed text={q} /> : q}</Box>
      <Box {...P_SR.btn} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Search</Box>
      {mode === "empty" ? (
        <Box x={PX} y={240} w={PCW} h={48} className="text-tal-plum-soft">Type something above to search across your folders and records.</Box>
      ) : mode === "found" ? (
        <>
          <Box x={PX} y={240} w={300} h={24} className="font-display">Folders (1)</Box>
          <Box {...P_FOLDER} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3">
            <div><p className="font-medium">Passport &amp; Travel Documents</p><p className="text-xs text-tal-plum-soft">Personal</p></div><span className="text-tal-plum-soft">›</span>
          </Box>
          <Box x={PX} y={366} w={300} h={24} className="font-display">Records (2)</Box>
          {[{ t: "Sarah's passport", s: "Personal · expires 2031-03-14", p: "Active", c: "bg-green-100 text-green-800" }, { t: "Mia's passport", s: "Personal · expires 2027-01-09", p: "Expiring soon", c: "bg-amber-100 text-amber-800" }].map((r, n) => (
            <Box key={r.t} x={PX} y={398 + n * 70} w={PCW} h={62} className="flex items-center justify-between gap-2 rounded-xl border border-tal-line bg-white px-4 py-3">
              <div className="min-w-0"><p className="font-medium">{r.t}</p><p className="text-xs text-tal-plum-soft">{r.s}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${r.c}`}>{r.p}</span>
            </Box>
          ))}
        </>
      ) : (
        <>
          <Box {...P_AI.card} h={mode === "ai" ? P_AI.card.h : 140} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={PX + 20} y={P_AI.card.y + 20} w={PCW - 40} h={48}>Nothing matched &ldquo;{q}&rdquo; in your folders.</Box>
          {mode !== "ai" && <Box {...P_AI.ask} className="flex items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"><span>✨</span> Ask TAL AI to find it</Box>}
          {mode === "ai" && <AiAnswer x={PX + 20} w={PCW - 40} answerY={P_AI.answerY} matchY={P_AI.matchY} gap={P_AI.gap} noteY={P_AI.noteY} />}
          {mode === "consent" && <ConsentModal {...P_CONSENT} go={P_CONSENT_GO} />}
        </>
      )}
    </PPage>
  )
}

const P_SCREENS: Record<string, ReactNode> = {
  dash: <PDash />,
  user: <PDash userOpen />,
  drawer: <PDash drawer />,
  organiser: <POrganiser />,
  typing: <PSearch q={Q1} mode="empty" typed />,
  found: <PSearch q={Q1} mode="found" />,
  none: <PSearch q={Q2} mode="none" />,
  consent: <PSearch q={Q2} mode="consent" />,
  ai: <PSearch q={Q2} mode="ai" />,
}

const UO = "app.theadultinglife.com.au/records"
const USE = "app.theadultinglife.com.au/records/search"
const pSpan = (a: { y: number }, b: { y: number; h: number }) => ({ x: PX, y: a.y, w: PCW, h: b.y + b.h - a.y })

const P_STEPS: WalkStep[] = [
  { screen: "dash", url: UD, caption: "Your dashboard - life at a glance", detail: "What's coming up, what's left to do and how far you've got, for the whole family.", duration: 6500 },
  // Header
  { screen: "dash", url: UD, caption: "Ask TAL AI, reminders and your account", detail: "TAL AI is your built-in guide. The bell opens Reminders. Your picture opens the account menu.", focus: { x: 250, y: 160, scale: 1.6 }, ring: { x: P_ASK.x - 4, y: 54, w: P_USER.x + P_USER.w - P_ASK.x + 8, h: 48 }, duration: 6500 },
  { screen: "user", url: UD, caption: "Your account menu", detail: "Who's signed in, your TAL Premium plan, take the tour again, privacy, terms and sign out.", focus: { x: 214, y: 260, scale: 1.3 }, ring: { x: P_USER_MENU.x, y: P_USER.y, w: P_USER_MENU.w, h: P_USER_MENU.y + P_USER_MENU.h - P_USER.y }, click: { x: P_USER.x + 32, y: P_USER.y + 20 }, duration: 6500 },
  { screen: "drawer", url: UD, caption: "Everything else is in the menu", detail: "Tap ☰ for the Organiser, Documents, Receipts, the Planner, Learn, TAL AI, Tasks, Reminders, Emergency, Settings and more. ⓘ explains each one.", focus: { x: 150, y: 460, scale: 1.08 }, ring: { x: 8, y: dNavY(0) - 4, w: DRAWER_W - 16, h: dNavY(13) + 48 - dNavY(0) }, duration: 8000 },
  // Search
  { screen: "drawer", url: UD, caption: "To search, open the Organiser", detail: "On a phone, search lives at the top of The Adulting Life Organiser.", focus: { x: 150, y: 260, scale: 1.4 }, ring: { x: 12, y: dNavY(2), w: DRAWER_W - 24, h: 40 }, click: { x: 120, y: dNavY(2) + 20 }, duration: 5500 },
  { screen: "organiser", url: UO, caption: "Tap Search records", focus: { x: 195, y: 230, scale: 1.4 }, ring: P_SEARCH_BTN, click: { x: P_SEARCH_BTN.x + 70, y: P_SEARCH_BTN.y + 18 }, duration: 5000 },
  { screen: "typing", url: USE, caption: "Type what you're after", detail: "A folder, a record title, a note or a field value.", focus: { x: 195, y: 200, scale: 1.4 }, ring: P_SR.btn, click: { x: P_SR.btn.x + 42, y: P_SR.btn.y + 22 }, duration: 6000 },
  { screen: "found", url: `${USE}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "Plus every passport record in the family, with its expiry. Tap to open it.", focus: { x: 195, y: 380, scale: 1.12 }, ring: P_FOLDER, click: { x: 150, y: P_FOLDER.y + 31 }, duration: 6500 },
  { screen: "none", url: `${USE}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "\"how do i add a will\" isn't the name of anything - so TAL AI offers to point you to the right place.", focus: { x: 195, y: 300, scale: 1.3 }, ring: P_AI.ask, click: { x: P_AI.ask.x + 108, y: P_AI.ask.y + 20 }, duration: 6500 },
  { screen: "consent", url: `${USE}?q=how+do+i+add+a+will`, caption: "Only your search words are sent", detail: "The first time, it asks first. Nothing you've stored in your folders goes to the AI.", focus: { x: 195, y: 420, scale: 1.1 }, ring: P_CONSENT_GO, click: { x: P_CONSENT_GO.x + 48, y: P_CONSENT_GO.y + 18 }, duration: 6500 },
  { screen: "ai", url: `${USE}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner - with a line on what to do there.", focus: { x: 195, y: 440, scale: 1.08 }, ring: { x: PX + 12, y: P_AI.answerY - 8, w: PCW - 24, h: P_AI.noteY + 26 - P_AI.answerY }, duration: 8000 },
  { screen: "ai", url: `${USE}?q=how+do+i+add+a+will`, caption: "Tap a suggestion to go straight there", detail: "Typos work too - \"pasport\" finds nothing, and TAL AI says you meant Passport. It's a guide only.", focus: { x: 195, y: 470, scale: 1.12 }, ring: { x: PX + 20, y: P_AI.matchY, w: PCW - 40, h: P_AI.gap - 8 }, click: { x: 160, y: P_AI.matchY + 34 }, duration: 7000 },
  // The dashboard, top to bottom
  { screen: "dash", url: UD, caption: "Hi Sarah - here's what's waiting", detail: "A one-line summary: reminders coming up (or expired) and tasks still to do.", focus: { x: 195, y: 170, scale: 1.3 }, ring: P.hero, duration: 5500 },
  { screen: "dash", url: UD, caption: "In case of emergency", detail: "One tap to the family's emergency page: contacts, medications, insurance and will.", focus: { x: 195, y: 290, scale: 1.12 }, ring: P.sos, click: { x: 195, y: P.sos.y + 52 }, duration: 6500 },
  { screen: "dash", url: UD, caption: "Your Setup guide and progress", detail: "Pick up the Setup guide where you left off - and see how much of your Organiser is filled in.", scroll: 300, focus: { x: 195, y: 560, scale: 1.08 }, ring: pSpan(P.wizard, P.progress), click: { x: 195, y: P.wizard.y + 46 }, duration: 7000 },
  { screen: "dash", url: UD, caption: "Four numbers that matter", detail: "Records & Documents and All good open the Organiser; Things expiring soon opens Reminders; Tasks to complete opens Tasks.", scroll: 560, focus: { x: 195, y: 900, scale: 1.08 }, ring: pSpan(P.stat(0), P.stat(3)), duration: 8000 },
  { screen: "dash", url: UD, caption: "Organiser Overview", detail: "Personal, Health, Education, Employment and Admin - folders done and still missing.", scroll: 1000, focus: { x: 195, y: 1385, scale: 1.05 }, ring: P.overview, click: { x: 195, y: P.overview.y + 105 }, duration: 7000 },
  { screen: "dash", url: UD, caption: "Pick up where you left off", detail: "The last records you touched, and the next lesson in Learn.", scroll: 1500, focus: { x: 195, y: 1900, scale: 1.05 }, ring: pSpan(P.recent, P.learn), duration: 7000 },
  { screen: "dash", url: UD, caption: "Recent activity", detail: "Uploads, updates and lessons from the whole family - and a cheer when you've been busy.", scroll: 2040, focus: { x: 195, y: 2420, scale: 1.05 }, ring: pSpan(P.activity, P.party), duration: 6500 },
  { screen: "dash", url: UD, caption: "Upcoming reminders", detail: "What's due in the next 60 days - amber when soon, red when expired.", scroll: 2560, focus: { x: 195, y: 2860, scale: 1.08 }, ring: P.reminders, duration: 6000 },
  { screen: "dash", url: UD, caption: "Next things to complete", detail: "Empty or half-done folders, important ones first. ⋯ snoozes one for 30 days or marks it Not applicable.", scroll: 2700, focus: { x: 195, y: 3080, scale: 1.08 }, ring: P.missing, click: { x: PX + PCW - 46, y: P.missing.y + 226 }, duration: 7500 },
  { screen: "dash", url: UD, caption: "Quick Actions", detail: "Add Record, Upload Document, Scan Document or Add Reminder in one tap.", scroll: 3020, focus: { x: 195, y: 3394, scale: 1.08 }, ring: P.quick, duration: 6000 },
  { screen: "dash", url: UD, caption: "Need a hand? And your Planner", detail: "Ask TAL AI a question. Continue the Peace of Mind Planner, preview it, download or email the PDF, or nominate someone to view it.", scroll: 3380, focus: { x: 195, y: 3790, scale: 1.05 }, ring: pSpan(P.helper, P.pom), click: { x: P_SHIELD.x + 18, y: P_SHIELD.y + 18 }, duration: 8000 },
  { screen: "dash", url: UD, caption: "Learn progress", detail: "Bite-sized lessons on Australian life admin, with quizzes.", scroll: 3386, focus: { x: 195, y: 4110, scale: 1.1 }, ring: P.lprog, duration: 5500 },
  // Round buttons
  { screen: "dash", url: UD, caption: "Three round buttons, on every page", detail: "? opens help for the page you're on. The compass takes the guided tour.", focus: { x: 300, y: 780, scale: 1.6 }, ring: { x: P_FAB_R - 128, y: P_FAB_Y, w: 128, h: 56 }, duration: 6500 },
  { screen: "dash", url: UD, caption: "And this one plays the walkthrough", detail: "You're watching it now.", focus: { x: 250, y: 780, scale: 1.6 }, ring: { x: P_FAB_R - 200, y: P_FAB_Y, w: 56, h: 56 }, click: { x: P_FAB_R - 172, y: P_FAB_Y + 28 }, duration: 6000 },
]

export default function DashboardWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Your dashboard (phone)" : "Your dashboard (computer)"} url={UD} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Your dashboard", subtitle: "Everything at a glance - and how to find anything." }} />
  )
}
