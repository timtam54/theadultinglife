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
// Pages the dashboard opens: app/(app)/emergency + lib/services/emergency,
// app/(app)/reminders + CustomReminderRow, app/welcome + WelcomeWizard,
// app/(app)/tasks + TasksList + lib/services/onboarding, app/(app)/learn,
// app/(app)/templates/peace-of-mind-planner, app/(app)/records/[category]/[subcategory]
// + PageForm (Health Insurance Details & Statements questions from migrations
// 096/097/175/178/189), app/(app)/records/new + FolderPickerGrid, app/(app)/reminders/new.
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
  { t: "Health Insurance Details & Statements", c: "Health", reason: "Important for your Emergency Information page.", started: true, menu: false },
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
      <p className="mb-4 text-sm text-tal-plum-soft">7 of 59 articles read.</p>
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
// PAGES THE DASHBOARD OPENS - sample data and pieces both versions share
// ═════════════════════════════════════════════════════════════════════════════

type Rect = { x: number; y: number; w: number; h: number }
const T_SUB = (id: string) => `/thumbnails/subcategories/${id}.png`
const Thumb = ({ src, size = 40, className = "rounded-lg ring-1 ring-tal-line" }: { src: string; size?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`shrink-0 bg-white object-cover ${className}`} style={{ width: size, height: size }} />
)
const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
const FolderGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const CalendarGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
const PersonPlusGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
const Crumbs = ({ x, y, w, items, sep = "/" }: { x: number; y: number; w: number; items: string[]; sep?: string }) => (
  <Box x={x} y={y} w={w} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft">
    {items.map((t, k) => <span key={t} className="flex items-center gap-2">{k > 0 && <span className="text-tal-plum-soft/50">{sep}</span>}{t}</span>)}
  </Box>
)
const HeadPill = ({ children }: { children: ReactNode }) => <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">{children}</span>
const HeadThumb = ({ id }: { id: string }) => <Thumb src={`/thumbnails/dashboard/${id}.png`} size={36} className="rounded-xl" />

// ── Emergency (app/(app)/emergency + lib/services/emergency) ─────────────────
// Field labels are the folders' real questions (Emergency Contacts, List of
// Medical Advisers, Custom — Medication List, Health Insurance Details & Statements).
type ESec = { label: string; cat: "personal" | "health" | "admin"; records: { t: string; who: string; f: [string, string][] }[] }
const E_SECTIONS: ESec[] = [
  { label: "Emergency contacts", cat: "personal", records: [
    { t: "Emma Clarke", who: "Sarah Taylor", f: [["Full Name", "Emma Clarke"], ["Relationship", "Sister (next of kin)"], ["Priority", "Primary"], ["Phone Number", "0412 345 678"]] },
    { t: "James Taylor", who: "Sarah Taylor", f: [["Full Name", "James Taylor"], ["Relationship", "Spouse"], ["Priority", "Secondary"], ["Phone Number", "0423 456 789"]] },
  ] },
  { label: "Doctors & medical advisers", cat: "health", records: [
    { t: "Bayside Family Practice", who: "Sarah Taylor", f: [["Business Name", "Bayside Family Practice"], ["Contact Name", "Dr Priya Nair"], ["Speciality / Role", "GP"], ["Phone Number", "07 3396 1180"]] },
  ] },
  { label: "Current medications", cat: "health", records: [
    { t: "Salbutamol inhaler", who: "Leo Taylor", f: [["Medication name", "Salbutamol inhaler"], ["Dosage", "100mcg"], ["Frequency", "2 puffs when needed"], ["Prescribed by", "Dr Priya Nair"]] },
  ] },
  { label: "Health insurance", cat: "health", records: [
    { t: "Kinfolk Health", who: "Sarah Taylor", f: [["Insurance Provider", "Kinfolk Health"], ["Member Number", "4417 2093"], ["Level of Cover", "Hospital + Extras"], ["Renewal Date", "2027-01-28"]] },
  ] },
]
const E_MISSING = ["Medicare & health card", "Licence & ID", "Advanced health directive", "Will & funeral instructions", "Power of attorney", "Life insurance", "Home insurance", "Vehicle insurance"]
const E_TONE = { personal: { chip: "bg-violet-100 text-violet-800", bar: "bg-violet-500" }, health: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" }, admin: { chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-600" } }
const E_COUNT = "5 records across 4 family members"
function ESection({ s, phone }: { s: ESec; phone?: boolean }) {
  const tone = E_TONE[s.cat]
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-tal-line bg-white shadow-sm">
      <div className="flex h-14 items-center gap-3 border-b border-tal-line bg-tal-cream-soft/50 px-5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${tone.bar}`}><FolderGlyph /></span>
        <span className="truncate font-display text-lg">{s.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${tone.chip}`}>{s.records.length}</span>
        <span className="ml-auto shrink-0 text-xs text-tal-plum-soft">Edit →</span>
      </div>
      {s.records.map((r) => (
        <div key={r.t} className="border-b border-tal-line p-4 last:border-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="font-medium">{r.t}</span><span className="text-xs text-tal-plum-soft">{r.who}</span></div>
          <div className={`grid gap-x-4 gap-y-0.5 text-sm ${phone ? "grid-cols-1" : "grid-cols-[max-content_1fr]"}`}>
            {r.f.map(([l, v]) => <div key={l} className="contents"><span className="text-tal-plum-soft">{l}</span><span>{v}</span></div>)}
          </div>
        </div>
      ))}
    </div>
  )
}
// Section heights and positions (header 57, each record 63 + a line per field)
function eLayout(y0: number, phone: boolean) {
  const ys: number[] = [], hs: number[] = []
  let y = y0
  for (const s of E_SECTIONS) {
    const h = 57 + s.records.reduce((a, r) => a + 63 + r.f.length * (phone ? 42 : 22), 0)
    ys.push(y); hs.push(h); y += h + 24
  }
  return { ys, hs, end: y - 24 }
}
function EStillMissing() {
  return (
    <div className="h-full rounded-2xl border border-dashed border-tal-line bg-white p-5">
      <p className="mb-1 font-display text-lg">Still missing</p>
      <p className="mb-3 text-sm text-tal-plum-soft">These folders have no records yet. Filling them makes this page more useful in an emergency.</p>
      <div className="flex flex-wrap gap-2">{E_MISSING.map((m) => <span key={m} className="rounded-full border border-tal-line bg-tal-cream-soft px-3 py-1 text-sm">{m} →</span>)}</div>
    </div>
  )
}

// ── Reminders (app/(app)/reminders + components/CustomReminderRow) ──────────
type RStat = "expired" | "soon" | "upcoming"
const REM_ALL: { t: string; d: string; s: RStat; thumb?: string; repeat?: string }[] = [
  { t: "Toyota RAV4 registration", d: "Due in 12 days · 3 Dec 2026", s: "soon", thumb: T_SUB("personal.vehicle_details") },
  { t: "Home & contents insurance", d: "Due in 24 days · 15 Dec 2026", s: "soon", thumb: T_SUB("admin.home_insurance") },
  { t: "Book Leo's dentist check-up", d: "Due in 27 days · 18 Dec 2026", s: "soon", repeat: "yearly" },
  { t: "Driver's licence — James Taylor", d: "Due in 38 days · 29 Dec 2026", s: "soon", thumb: T_SUB("personal.drivers_licence") },
  { t: "Mia's passport", d: "Due in 49 days · 9 Jan 2027", s: "soon", thumb: T_SUB("personal.passport_travel") },
  { t: "Health insurance — Kinfolk Health", d: "Due in 68 days · 28 Jan 2027", s: "upcoming", thumb: T_SUB("health.health_insurance") },
]
const REM_CUSTOM = 2
const RemPill = ({ s }: { s: RStat }) => (
  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s === "expired" ? "bg-red-100 text-red-800" : s === "soon" ? "bg-amber-100 text-amber-900" : "bg-tal-cream-soft text-tal-plum-soft"}`}>
    {s === "expired" ? "Expired" : s === "soon" ? "Soon" : "Upcoming"}
  </span>
)
function RemRow({ r }: { r: (typeof REM_ALL)[number] }) {
  if (r.repeat) {
    return (
      <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-tal-line bg-white px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">CUSTOM</span><span className="truncate text-sm font-medium">{r.t}</span></div>
          <div className="mt-1 flex items-center gap-2"><span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-800">{r.repeat}</span><span className="truncate text-xs text-tal-plum-soft">{r.d}</span></div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <RemPill s={r.s} />
          <span className="flex items-center gap-1 text-xs"><span className="px-1.5 text-tal-plum-soft">Snooze</span><span className="px-1.5 text-emerald-700">Done</span><span className="px-1 text-tal-plum-soft">×</span></span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-tal-line bg-white px-4">
      {r.thumb && <Thumb src={r.thumb} />}
      <div className="min-w-0 flex-1"><div className="truncate font-medium">{r.t}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{r.d}</div></div>
      <RemPill s={r.s} />
    </div>
  )
}

// ── Tasks (app/(app)/tasks + lib/services/onboarding + components/TasksList)
const SETUP_STEPS: [string, boolean][] = [
  ["Add your family members (or confirm it's just you)", true],
  ["Got the physical Adulting Life organiser? Grab it — you can file along as you go", true],
  ["Start filling in an Organiser folder", true],
  ["Finish filling in an Organiser folder", true],
  ["Fill in one Peace of Mind section", true],
  ["Complete 5 Peace of Mind sections", false],
  ["Read your first Learn article", true],
  ["Take a quiz", true],
  ["Watch a Learn video", false],
]
const MY_TASKS: [string, string][] = [
  ["Compare health insurance quotes", "Due 5 Jan 2027 · → Kinfolk Health"],
  ["Book James's eye test", "Added 2 Nov 2026"],
]
function SetupStepRow({ t, done }: { t: string; done: boolean }) {
  return (
    <div className={`flex h-full items-center gap-3 rounded-xl border border-tal-line p-3 ${done ? "bg-tal-cream-soft/60" : "bg-white"}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-emerald-500 text-white" : "border border-tal-line bg-white"}`}>{done && "✓"}</span>
      <span className={`text-sm ${done ? "text-tal-plum-soft line-through" : ""}`}>{t}</span>
    </div>
  )
}
function TaskRow({ t, sub }: { t: string; sub: string }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-tal-line bg-white p-3">
      <span className="flex h-6 w-6 shrink-0 rounded-full border border-tal-line" />
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t}</div><div className="mt-0.5 truncate text-xs text-tal-plum-soft">{sub}</div></div>
      <span className="text-tal-plum-soft">×</span>
    </div>
  )
}
function TaskFilter() {
  return (
    <div className="flex h-full items-center">
      <span className="inline-flex rounded-lg border border-tal-line bg-white p-1 text-xs font-medium">
        <span className="flex h-8 items-center rounded-md bg-black px-3 text-white">Open (2)</span>
        <span className="flex h-8 items-center rounded-md px-3 text-tal-plum-soft">All (4)</span>
      </span>
      <span className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-tal-line bg-tal-cream-soft px-3 text-sm font-medium"><PlusIcon />Add a task</span>
    </div>
  )
}

// ── The Organiser (app/(app)/records) - copied from OrganiserWalkthrough ────
const O_CATS = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 9, total: 24, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 6, total: 17, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { id: "education", t: "Education", d: "Certificates, transcripts, resumes and study records.", done: 3, total: 9, tone: "bg-sky-50 ring-sky-100", bar: "bg-sky-500", pill: "bg-sky-100 text-sky-800" },
  { id: "employment", t: "Employment", d: "Work contracts, tax details, super and payslips.", done: 2, total: 8, tone: "bg-rose-50 ring-rose-100", bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800" },
  { id: "admin", t: "Admin & Bookkeeping", d: "Finances, accounts, utility bills, insurance and paperwork.", done: 3, total: 21, tone: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-800" },
]
const oPct = (c: (typeof O_CATS)[number]) => Math.round((c.done / c.total) * 100)
const O_EXPIRING = [
  { t: "Toyota RAV4 registration", c: "Personal", d: "2026-12-03", thumb: T_SUB("personal.vehicle_details") },
  { t: "Home & contents insurance", c: "Admin & Bookkeeping", d: "2026-12-15", thumb: T_SUB("admin.home_insurance") },
]
const O_STATS = [
  { v: "5 Categories", s: "Organised for you", c: "bg-violet-50 ring-violet-100", i: "bg-violet-100 text-violet-700" },
  { v: "23 of 79 folders", s: "12 in progress", c: "bg-sky-50 ring-sky-100", i: "bg-sky-100 text-sky-700" },
  { v: "Secure & private", s: "Only you can access", c: "bg-emerald-50 ring-emerald-100", i: "bg-emerald-100 text-emerald-700" },
  { v: "Always backed up", s: "Your data is safe", c: "bg-amber-50 ring-amber-100", i: "bg-amber-100 text-amber-700" },
]
const STAT_ICONS: ReactNode[] = [
  <svg key="f" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  <svg key="c" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="s" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="b" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 18h10a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.7 1.36A3.5 3.5 0 0 0 7 18Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
]
const btnLine = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm"
function OExpRow({ r }: { r: (typeof O_EXPIRING)[number] }) {
  return (
    <div className="flex h-full items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
      <Thumb src={r.thumb} size={32} className="rounded-lg ring-1 ring-white" />
      <span className="min-w-0 flex-1 leading-snug"><span className="font-medium">{r.t}</span> <span className="text-tal-plum-soft">— {r.c} · expires {r.d}</span></span>
    </div>
  )
}
function OCatCard({ c }: { c: (typeof O_CATS)[number] }) {
  return (
    <div className={`flex h-full flex-col rounded-2xl p-5 ring-1 ${c.tone}`}>
      <div className="mb-3 flex items-start gap-3">
        <Thumb src={`/thumbnails/categories/${c.id}.png`} size={64} className="rounded-xl ring-1 ring-white" />
        <div className="min-w-0 flex-1"><p className="font-display text-lg leading-tight">{c.t}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{c.d}</p></div>
      </div>
      <div className="mt-auto">
        <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">{c.done} of {c.total} folders complete</span><span className={`rounded-full px-2 py-0.5 font-medium ${c.pill}`}>{oPct(c)}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full ${c.bar}`} style={{ width: `${oPct(c)}%` }} /></div>
      </div>
    </div>
  )
}
function OStatCard({ s, n }: { s: (typeof O_STATS)[number]; n: number }) {
  return (
    <div className={`flex h-full items-center gap-3 rounded-2xl p-4 ring-1 ${s.c}`}>
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.i}`}>{STAT_ICONS[n]}</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-tight">{s.v}</p><p className="mt-0.5 text-[11px] text-tal-plum-soft">{s.s}</p></div>
      <span className="shrink-0 text-tal-plum-soft/70">→</span>
    </div>
  )
}
function ONewTo() {
  return (
    <>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white">?</span>
      <div className="min-w-0 flex-1"><p className="font-medium">New to The Adulting Life Organiser?</p><p className="text-xs text-tal-plum-soft">Not sure where to start? We can help.</p></div>
    </>
  )
}
function OHiddenHead() {
  return (
    <div className="flex items-center justify-between">
      <div><p className="font-medium">Show hidden suggestions (2)</p><p className="mt-0.5 text-xs text-tal-plum-soft">Folders you snoozed or marked &ldquo;Not applicable&rdquo;.</p></div>
      <span className="text-sm text-tal-plum-soft">▾</span>
    </div>
  )
}

// ── Setup guide (app/welcome + WelcomeWizard + lib/services/onboarding-wizard)
const WZ_STEPS = ["Hello", "Setup", "Family", "Personal", "Health", "Education", "Employment", "Admin"]
const WZ_CUR = 5 // Education - Sarah is 5 of 8 steps in
const WZ_EXPLAIN = "Everything you type here is saved directly into your Organiser folders — nothing is duplicated, and you can jump back to any folder from the Organiser at any time. Tap a numbered step above to move around."
const WZ_SUB = "This section covers courses, enrolment details, qualifications. If it does not apply right now, you can skip it."
const WZ_INTRO = "This section is for study, courses and qualifications. Add anything you are currently studying, qualifications you have completed, and your enrolment details. You can fill in the form provided, upload a scanned copy, or do both. If nobody in your family is studying right now, feel free to skip this section."
const WZ_BULLETS = ["Current courses and enrolment details", "Past qualifications and certificates", "Student ID and campus info", "Fill in the form, upload a scan, or do both. Totally your choice."]
type Cell = "done" | "started" | "empty" | "na"
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
const WZ_PEOPLE = ["Sarah ★", "James", "Mia", "Leo"]
const WZ_ROWS: { n: string; id: string; c: Cell[] }[] = [
  { n: "Primary Education", id: "education.primary_details", c: ["na", "na", "done", "done"] },
  { n: "Primary Reports & Certificates", id: "education.primary_reports", c: ["na", "na", "done", "started"] },
  { n: "Secondary Education", id: "education.secondary_details", c: ["done", "done", "done", "na"] },
  { n: "Secondary Reports & Certificates", id: "education.secondary_reports", c: ["empty", "empty", "started", "na"] },
  { n: "Tertiary Education", id: "education.tertiary_details", c: ["done", "empty", "na", "na"] },
  { n: "Tertiary Transcripts & Certificates", id: "education.tertiary_reports", c: ["empty", "empty", "na", "na"] },
]
const WZ_GO = "Keep going with Primary Reports & Certificates →"
function WzExplainer() {
  return (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-tal-line bg-tal-cream px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10 text-sm font-semibold">i</span>
      <p className="text-sm leading-relaxed"><span className="font-medium">The Setup Guide walks you through your Organiser section by section.</span> {WZ_EXPLAIN}</p>
    </div>
  )
}
function WzDots({ phone }: { phone?: boolean }) {
  return (
    <div className="flex h-full items-start justify-center gap-0.5">
      {WZ_STEPS.map((t, i) => {
        const active = i === WZ_CUR, done = i < WZ_CUR
        return (
          <div key={t} className="flex items-start gap-0.5">
            <div className={`flex shrink-0 flex-col items-center gap-1.5 ${phone ? "w-[34px]" : "w-14"}`}>
              <div className="relative">
                <span className={`flex items-center justify-center rounded-full font-semibold ${active ? `${phone ? "h-8 w-8" : "h-10 w-10"} bg-tal-plum text-sm text-white shadow-md ring-2 ring-tal-plum ring-offset-2` : done ? `${phone ? "h-7 w-7" : "h-8 w-8"} bg-black text-xs text-white` : `${phone ? "h-7 w-7" : "h-8 w-8"} bg-white text-xs text-tal-plum-soft ring-1 ring-tal-line`}`}>{i + 1}</span>
                {done && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-2 ring-white">✓</span>}
              </div>
              <span className={`text-center leading-tight ${phone ? "text-[8px]" : "text-[10px]"} ${active ? "font-semibold" : done ? "" : "text-tal-plum-soft"}`}>{t}</span>
            </div>
            {i < WZ_STEPS.length - 1 && <span className={`mt-4 h-0.5 shrink-0 ${phone ? "w-1" : "w-3"} ${done ? "bg-black" : "bg-tal-line"}`} />}
          </div>
        )
      })}
    </div>
  )
}
function WzCardHead() {
  return (
    <>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">Step {WZ_CUR + 1} of 8 · {WZ_CUR} done</p>
      <p className="font-display text-4xl leading-tight">Education</p>
      <p className="mt-2 text-tal-plum-soft">{WZ_SUB}</p>
      <p className="mt-4 rounded-xl border border-tal-line bg-tal-cream-soft/60 px-4 py-2.5 text-sm font-medium">Your progress · {WZ_CUR} of 8 done</p>
    </>
  )
}
function WzIntro() {
  return (
    <>
      <p className="leading-relaxed">{WZ_INTRO}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-tal-plum-soft">{WZ_BULLETS.map((b) => <li key={b} className="flex gap-2"><span className="text-tal-plum">•</span>{b}</li>)}</ul>
    </>
  )
}
const WzFoldersHead = () => (
  <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-display">Folders in this section</span><span className="text-xs text-tal-plum-soft">3 complete · 2 started · 9 total</span></div>
)

// ── Learn (app/(app)/learn) ───────────────────────────────────────────────────
const LN_PATHS: { t: string; id: string; done: number; total: number; bg: string; text: string; bar: string }[] = [
  { t: "Personal", id: "personal", done: 4, total: 15, bg: "bg-violet-100 ring-violet-200", text: "text-violet-800", bar: "bg-violet-500" },
  { t: "Health", id: "health", done: 2, total: 12, bg: "bg-amber-100 ring-amber-200", text: "text-amber-900", bar: "bg-amber-500" },
  { t: "Education", id: "education", done: 1, total: 7, bg: "bg-sky-100 ring-sky-200", text: "text-sky-900", bar: "bg-sky-500" },
  { t: "Employment", id: "employment", done: 0, total: 11, bg: "bg-rose-100 ring-rose-200", text: "text-rose-900", bar: "bg-rose-500" },
  { t: "Admin & Bookkeeping", id: "admin", done: 0, total: 14, bg: "bg-emerald-100 ring-emerald-200", text: "text-emerald-900", bar: "bg-emerald-600" },
]
const LN_READ = 7, LN_TOTAL = 59, LN_PCT = Math.round((LN_READ / LN_TOTAL) * 100)
const LN_NEXT = [["Will & Funeral Instructions", "personal"], ["Power of Attorney Details", "personal"], ["Advanced Health Directive", "personal"], ["Health Insurance Details", "health"]]
function LnHeader({ phone }: { phone?: boolean }) {
  return (
    <div className="h-full rounded-2xl border border-tal-line bg-tal-cream-soft px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Thumb src="/thumbnails/learn/adulting-hub.png" size={40} className="rounded-xl ring-1 ring-white" />
        <span className="font-display text-2xl leading-tight">The Adulting Life Unlocked</span>
        {!phone && <span className="text-tal-plum-soft/50">·</span>}
        <span className="text-sm text-tal-plum-soft">{phone && <span className="mr-2 text-tal-plum-soft/50">·</span>}Practical lessons to help you navigate life with confidence.</span>
      </div>
    </div>
  )
}
function LnResume() {
  return (
    <div className="h-full rounded-2xl bg-violet-100 p-5 ring-1 ring-violet-200">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-violet-800">Continue where you left off</p>
      <p className="mb-2 text-xs text-tal-plum-soft">Identity documents · Personal</p>
      <div className="flex items-start gap-3">
        <Thumb src="/thumbnails/categories/personal.png" size={48} className="rounded-xl ring-1 ring-white" />
        <div className="min-w-0"><p className="font-display text-lg leading-tight">Passport &amp; Travel Documents</p><p className="mt-1 text-xs text-tal-plum-soft">4 min read</p></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full bg-violet-500" style={{ width: "50%" }} /></div>
      <div className="mt-1.5 flex justify-between text-[11px] text-tal-plum-soft"><span>3 of 6 lessons complete</span><span className="font-medium">50%</span></div>
      <span className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-black px-3 text-sm font-medium text-white">Resume lesson →</span>
    </div>
  )
}
function LnPro() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-tal-cream p-5 ring-1 ring-tal-cream">
      <span className="absolute right-4 top-4 text-2xl">🏆</span>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest">Keep going</p>
      <p className="font-display text-xl leading-tight">You&apos;re becoming an Adulting Pro!</p>
      <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-2xl leading-none">{LN_PCT}%</span><span className="text-sm text-tal-plum-soft">complete</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-gradient-to-r from-violet-500 to-tal-plum" style={{ width: `${LN_PCT}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs"><span className="text-tal-plum-soft">{LN_READ} of {LN_TOTAL} lessons read</span><span className="font-medium">Next lesson →</span></div>
    </div>
  )
}
function LnPath({ p }: { p: (typeof LN_PATHS)[number] }) {
  const pc = Math.round((p.done / p.total) * 100)
  return (
    <div className={`flex h-full flex-col rounded-2xl p-4 ring-1 ${p.bg}`}>
      <Thumb src={`/thumbnails/categories/${p.id}.png`} size={48} className="rounded-xl ring-1 ring-white" />
      <p className={`mt-2 text-sm font-medium leading-tight ${p.text}`}>{p.t}</p>
      <p className="mt-0.5 text-[11px] text-tal-plum-soft">{p.total} lessons</p>
      <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-white/70"><div className={`h-full ${p.bar}`} style={{ width: `${pc}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-[10px] text-tal-plum-soft"><span>{p.done}/{p.total}</span><span className="font-medium">{pc}%</span></div>
    </div>
  )
}
const LnPathsHead = () => (
  <div className="flex items-baseline justify-between"><span className="font-display text-xl">Your Learning Paths</span><span className="text-xs text-tal-plum-soft">{LN_READ} of {LN_TOTAL} lessons complete</span></div>
)
function LnStreak() {
  return (
    <div className="h-full rounded-2xl bg-amber-100 p-5 ring-1 ring-amber-200">
      <div className="flex items-start justify-between">
        <div><p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-amber-900">Learning streak</p><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl leading-none text-amber-900">4</span><span className="text-sm text-amber-900/80">days</span></div></div>
        <span className="text-3xl">🔥</span>
      </div>
      <p className="mt-1 text-xs text-amber-900/80">Longest: 9 days</p>
    </div>
  )
}

// ── Peace of Mind Planner index (app/(app)/templates/peace-of-mind-planner)
// Empty sections are hidden on the real page, so only filled ones show.
const PL_GROUPS: { g: string; rows: { t: string; hint?: string; organiser: boolean; n?: number }[] }[] = [
  { g: "Important Consultants & Contacts", rows: [{ t: "Doctors", hint: "GP and any specialists — shared with the Organiser's Medical Advisers folder.", organiser: true, n: 1 }] },
  { g: "Insurances", rows: [{ t: "Health Insurance", organiser: true, n: 1 }] },
  { g: "My End-of-Life Plan", rows: [{ t: "Wishes (general)", organiser: false }] },
  { g: "Letters", rows: [{ t: "Letters", organiser: false }] },
]
const PL_INTRO = "The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view."
function PlRow({ r }: { r: (typeof PL_GROUPS)[number]["rows"][number] }) {
  return (
    <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-tal-line bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${r.organiser ? "bg-tal-cream-soft ring-1 ring-tal-line" : "bg-white text-tal-plum-soft ring-1 ring-tal-line"}`}>{r.organiser ? "↔" : "◇"}</span>
        <div className="min-w-0"><p className="font-medium">{r.t}</p>{r.hint && <p className="mt-0.5 text-xs text-tal-plum-soft">{r.hint}</p>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {r.organiser ? <span className="text-xs text-green-700">{r.n} {r.n === 1 ? "entry" : "entries"}</span> : <span className="text-xs text-tal-plum-soft">Planner-only</span>}
        <span className="text-sm text-tal-plum-soft">→</span>
      </div>
    </div>
  )
}
function plLayout(y0: number, rowH: (r: (typeof PL_GROUPS)[number]["rows"][number]) => number) {
  const heads: number[] = [], rows: Rect[] = []
  let y = y0
  for (const g of PL_GROUPS) {
    heads.push(y); y += 36
    for (const r of g.rows) { const h = rowH(r); rows.push({ x: 0, y, w: 0, h }); y += h + 8 }
    y += 16
  }
  return { heads, rows, end: y - 24 }
}

// ── A folder: Health Insurance Details & Statements
// (app/(app)/records/[category]/[subcategory] + components/PageForm, repeating
// entries). Questions from supabase/migrations 096, 097, 175, 178 and 189.
const REMIND_HINT = "Added to your Reminders automatically — from 30 days before, and once it has passed."
type HQ = { l: string; v?: string; hint?: string; half?: boolean; kind?: "file" | "area" }
const HI_QS: HQ[][] = [
  [{ l: "Policy document", kind: "file", hint: "Upload a scan or photo (PDF or image). We can read it for you." }],
  [{ l: "Insurance Provider", v: "Kinfolk Health" }],
  [{ l: "Member Number", v: "4417 2093", half: true }, { l: "Level of Cover", v: "Hospital + Extras", hint: "e.g. Hospital + Extras", half: true }],
  [{ l: "Provider Contact", v: "members@kinfolkhealth.example", kind: "area" }],
  [{ l: "Commencement date", v: "01/02/2019", hint: "When your policy started", half: true }, { l: "Renewal Date", v: "28/01/2027", hint: REMIND_HINT, half: true }],
  [{ l: "Review date", hint: `When you next plan to review the policy. ${REMIND_HINT}`, half: true }, { l: "Cancellation date", hint: "Leave blank while the policy is active", half: true }],
  [{ l: "Premium ($)" }],
  [{ l: "Notes", kind: "area" }],
]
function HiField({ q, phone }: { q: HQ; phone?: boolean }) {
  return (
    <div className="h-full">
      <p className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">{q.l}</p>
      {q.kind === "file" ? (
        <div className={`flex gap-2.5 ${phone ? "flex-col items-start" : "items-center"}`}>
          <span className="flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white shadow-sm">Upload &amp; scan a file</span>
          <span className="flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</span>
        </div>
      ) : (
        <div className={`rounded-xl border border-tal-line bg-white px-3 text-[15px] ${q.kind === "area" ? "h-20 py-2.5" : "flex h-11 items-center"}`}>{q.v}</div>
      )}
      {q.hint && <p className="mt-1 text-xs text-tal-plum-soft">{q.hint}</p>}
    </div>
  )
}
const HI_PICK_HINT = "click to switch person"
function HiPicker() {
  return (
    <div className="flex h-full items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span>Sarah Taylor<span className="text-xs">▾</span>
    </div>
  )
}
function HiEntryHead() {
  return (
    <div className="flex h-full items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-tal-line bg-white"><PersonPlusGlyph /></span>
    </div>
  )
}

// ── Add a record (app/(app)/records/new + components/FolderPickerGrid) ──────
const AR_GROUPS: { g: string; f: [string, string][] }[] = [
  { g: "Personal", f: [
    ["Emergency Contacts", "personal.emergency_contacts"], ["Birth Certificates", "personal.birth_certificates"], ["Passport & Travel Documents", "personal.passport_travel"],
    ["Driver's Licence", "personal.drivers_licence"], ["Marriage Certificate", "personal.marriage_certificate"], ["Electoral Roll Number & Registered Address", "personal.electoral_roll"],
    ["Will & Funeral Instructions", "personal.will_funeral"], ["Power of Attorney Details", "personal.power_of_attorney"], ["Advanced Health Directive", "personal.advanced_health_directive"],
  ] },
  { g: "Health", f: [
    ["List of Medical Advisers", "health.medical_advisers"], ["Custom — Medication List", "health.medication_list"], ["Health Insurance Details & Statements", "health.health_insurance"],
  ] },
]
const AR_TEXT = "Pick the folder this record belongs to. We'll set up the right fields for you — or you can scan a document to fill them in with AI."
function ArFolder({ name, id }: { name: string; id: string }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-tal-line bg-white p-3">
      <Thumb src={T_SUB(id)} size={40} className="rounded-lg bg-tal-cream-soft" />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="shrink-0 text-tal-plum-soft/60">›</span>
    </div>
  )
}
function ArHeader() {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 px-5 py-4 text-white shadow-md">
      <Thumb src="/thumbnails/dashboard/add-record.png" size={44} className="rounded-xl" />
      <div className="min-w-0 flex-1"><p className="font-display text-2xl leading-tight">Add a record</p><p className="mt-1 text-sm text-white/80">{AR_TEXT}</p></div>
    </div>
  )
}

// ── Add a reminder (app/(app)/reminders/new) ─────────────────────────────────
const AM_ROWS: [string, string, string, "personal" | "health" | "admin"][] = [
  ["Passport", "Personal · Expires 9 Jan 2027", "Update date", "personal"],
  ["Driver's licence & IDs", "Personal · Expires 29 Dec 2026", "Update date", "personal"],
  ["Car registration", "Personal · Expires 3 Dec 2026", "Update date", "personal"],
  ["Vehicle insurance", "Admin & Bookkeeping · Not added yet", "Add record + date", "admin"],
  ["Home insurance", "Admin & Bookkeeping · Expires 15 Dec 2026", "Update date", "admin"],
  ["Health insurance", "Health · Not added yet", "Add record + date", "health"],
  ["Life insurance", "Health · Not added yet", "Add record + date", "health"],
  ["Rental agreement", "Admin & Bookkeeping · Not added yet", "Add record + date", "admin"],
  ["Warranty", "Admin & Bookkeeping · Not added yet", "Add record + date", "admin"],
  ["Phone / device contract", "Admin & Bookkeeping · Not added yet", "Add record + date", "admin"],
]
const AM_TONE = { personal: { bg: "bg-violet-50 ring-violet-100", text: "text-violet-800" }, health: { bg: "bg-amber-50 ring-amber-100", text: "text-amber-800" }, admin: { bg: "bg-emerald-50 ring-emerald-100", text: "text-emerald-800" } }
function AmRow({ r }: { r: (typeof AM_ROWS)[number] }) {
  const tone = AM_TONE[r[3]]
  return (
    <div className={`flex h-full items-center gap-4 rounded-2xl p-4 ring-1 ${tone.bg}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ${tone.text}`}><CalendarGlyph /></span>
      <div className="min-w-0 flex-1"><p className="font-medium leading-tight">{r[0]}</p><p className="mt-0.5 text-xs leading-snug text-tal-plum-soft">{r[1]}</p></div>
      <span className={`flex h-8 shrink-0 items-center rounded-lg bg-white px-2.5 text-xs font-medium ${tone.text}`}>{r[2]} →</span>
    </div>
  )
}
function AmElse() {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl bg-tal-cream-soft p-4 ring-1 ring-tal-line">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white"><PlusIcon size={18} /></span>
      <div className="min-w-0 flex-1"><p className="font-medium leading-tight">Something else with a date</p><p className="mt-0.5 text-xs text-tal-plum-soft">Car service, appointments, errands, anything.</p></div>
      <span className="flex h-8 shrink-0 items-center rounded-lg bg-white px-3 text-xs font-medium">Custom reminder →</span>
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
  missing: { x: AX, y: 344, w: AW, h: 356 },
  quick: { x: AX, y: 716, w: AW, h: 172 },
  helper: { x: AX, y: 904, w: AW, h: 154 },
  pom: { x: AX, y: 1074, w: AW, h: 420 },
  lprog: { x: AX, y: 1510, w: AW, h: 164 },
}
const D_MISS0 = { x: AX + 20, y: D.missing.y + 82, w: AW - 40, h: 164 }
const POM_ROW = (r: number) => D.pom.y + D.pom.h - 24 - 36 - (2 - r) * 44
const D_SHIELD = { x: AX + 142, y: POM_ROW(2), w: 36, h: 36 }
const statX = (n: number) => L + n * 150
const catX = (n: number) => L + 24 + n * 110
const FAB_Y = 680 // bottom-6 in the first window
const FAB_R = 1176 // right-6

function DShell({ children, query, typed, addOpen, userOpen, h = D_H, fabs = true, active = 0 }: { children: ReactNode; query?: string; typed?: boolean; addOpen?: boolean; userOpen?: boolean; h?: number; fabs?: boolean; active?: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {/* Sidebar (AppSidebar) */}
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === active ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === active ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
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
      <Box {...D_MISS0}><MissingRow m={MISSING[0]} /></Box>
      <Box x={AX + 20} y={D.missing.y + 254} w={AW - 40} h={82}><MissingRow m={MISSING[1]} /></Box>
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

// ── Computer: the pages the dashboard opens ─────────────────────────────────

const CW = 896 // content width

// Emergency
const E_HDR = { x: L, y: 104, w: CW, h: 100 }
const eD = eLayout(260, false)
const E_MISS = { x: L, y: eD.end + 32, w: CW, h: 180 }
const E_H = E_MISS.y + E_MISS.h + 48
function DEmergency() {
  return (
    <DShell h={E_H} active={10} fabs={false}>
      <Crumbs x={L} y={76} w={CW} items={["Dashboard", "Emergency"]} />
      <Box {...E_HDR} className="rounded-2xl bg-red-600 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20"><EmergencyGlyph /></span>
          <HeadPill>In case of emergency</HeadPill>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"><PdfGlyph />Download PDF</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"><MailGlyph />Share PDF</span>
          <span className="inline-flex h-8 items-center rounded-xl bg-white/15 px-3 text-xs font-medium">Excel</span>
        </div>
        <p className="mt-2 font-display text-xl leading-tight">Everything a paramedic, hospital or trusted person might need</p>
      </Box>
      <Box x={L} y={216} w={CW} h={20} className="text-sm text-tal-plum-soft">{E_COUNT}</Box>
      {E_SECTIONS.map((s, n) => <Box key={s.label} x={L} y={eD.ys[n]} w={CW} h={eD.hs[n]}><ESection s={s} /></Box>)}
      <Box {...E_MISS}><EStillMissing /></Box>
    </DShell>
  )
}

// Reminders
const RM_HDR = { x: L, y: 76, w: CW, h: 68 }
const RM_ADD = { x: L + CW - 24 - 136, y: 92, w: 136, h: 36 }
const rmRow = (n: number) => ({ x: L, y: 204 + n * 80, w: CW, h: 72 })
function DReminders() {
  return (
    <DShell h={760} active={9}>
      <Box {...RM_HDR} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <HeadThumb id="expiring-soon" /><HeadPill>Reminders</HeadPill>
        <span className="font-display text-2xl leading-tight">What&apos;s coming up</span>
        <span className="mx-1 text-white/40">·</span><span className="text-sm text-white/80">{REM_ALL.length} upcoming</span>
      </Box>
      <Box {...RM_ADD} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-tal-plum"><PlusIcon />Add reminder</Box>
      <Box x={L} y={168} w={CW} h={28} className="font-display text-xl">Upcoming</Box>
      {REM_ALL.map((r, n) => <Box key={r.t} {...rmRow(n)}><RemRow r={r} /></Box>)}
    </DShell>
  )
}

// Tasks
const TK_HDR = { x: L, y: 76, w: CW, h: 68 }
const TK_SETUP = { x: L, y: 168, w: CW, h: 576 }
const TK_LIST = { x: L, y: 768, w: CW, h: 184 }
const TK_H = 1000
function DTasks() {
  return (
    <DShell h={TK_H} active={8} fabs={false}>
      <Box {...TK_HDR} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <HeadThumb id="tasks" /><HeadPill>Tasks</HeadPill>
        <span className="font-display text-2xl leading-tight">Your list</span>
        <span className="mx-1 text-white/40">·</span><span className="text-sm text-white/80">4 things to do</span>
      </Box>
      <Box {...TK_SETUP} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={L + 20} y={TK_SETUP.y + 20} w={CW - 40} h={28} className="flex items-baseline justify-between"><span className="font-display text-lg">Setup steps</span><span className="text-xs text-tal-plum-soft">7 of 9 done · 78%</span></Box>
      {SETUP_STEPS.map(([t, done], n) => <Box key={t} x={L + 20} y={TK_SETUP.y + 60 + n * 56} w={CW - 40} h={48}><SetupStepRow t={t} done={done} /></Box>)}
      <Box x={L} y={TK_LIST.y} w={CW} h={40}><TaskFilter /></Box>
      {MY_TASKS.map(([t, sub], n) => <Box key={t} x={L} y={TK_LIST.y + 56 + n * 72} w={CW} h={64}><TaskRow t={t} sub={sub} /></Box>)}
    </DShell>
  )
}

// The Organiser
const OR = {
  hdr: { x: L, y: 76, w: CW, h: 108 },
  exp: { x: L, y: 200, w: CW, h: 156 },
  expRow: (n: number) => ({ x: L + 16, y: 248 + n * 46, w: CW - 32, h: 40 }),
  catsHead: { x: L, y: 380, w: 400, h: 28 },
  cat: (n: number) => ({ x: L + (n % 3) * 304, y: 420 + Math.floor(n / 3) * 172, w: 288, h: 156 }),
  stat: (n: number) => ({ x: L + n * 227, y: 772, w: 215, h: 72 }),
  newTo: { x: L, y: 868, w: CW, h: 68 },
  hidden: { x: L, y: 952, w: CW, h: 82 },
}
const OR_H = 1070
const OR_CATS = { x: L, y: OR.catsHead.y, w: CW, h: OR.cat(4).y + 156 - OR.catsHead.y }
function DOrganiser() {
  return (
    <DShell h={OR_H} active={2} fabs={false}>
      <Box {...OR.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={L + 20} y={88} w={36} />
      <Box x={L + 68} y={88} w={CW - 88} h={36} className="flex items-center gap-3">
        <span className="font-display text-2xl leading-tight">The Adulting Life Organiser</span>
        <span className="text-tal-plum-soft/50">·</span>
        <span className="text-sm text-tal-plum-soft">All your important information, organised in one place.</span>
      </Box>
      <Box x={L + CW - 20 - 120 - 8 - 150} y={136} w={150} h={36} className={`${btnLine} gap-2 px-3 text-tal-plum-soft`}><SearchIcon size={14} />Search records</Box>
      <Box x={L + CW - 20 - 120} y={136} w={120} h={36} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black text-sm font-medium text-white"><PlusIcon />Add Record</Box>
      <Box {...OR.exp} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={L + 16} y={216} w={400} h={24} className="flex items-center gap-2"><span className="text-amber-700"><WarnBadge /></span><span className="font-display">Expiring or expired ({O_EXPIRING.length})</span></Box>
      {O_EXPIRING.map((r, n) => <Box key={r.t} {...OR.expRow(n)}><OExpRow r={r} /></Box>)}
      <Box {...OR.catsHead} className="font-display text-xl">Choose a category</Box>
      {O_CATS.map((c, n) => <Box key={c.id} {...OR.cat(n)}><OCatCard c={c} /></Box>)}
      {O_STATS.map((s, n) => <Box key={s.v} {...OR.stat(n)}><OStatCard s={s} n={n} /></Box>)}
      <Box {...OR.newTo} className="flex items-center gap-4 rounded-2xl border border-tal-line bg-tal-cream-soft px-5"><ONewTo /></Box>
      <Box x={L + CW - 20 - 190} y={884} w={190} h={36} className={`${btnLine} gap-1`}>Getting Started Guide →</Box>
      <Box {...OR.hidden} className="rounded-2xl border border-tal-line bg-white px-5 py-5"><OHiddenHead /></Box>
    </DShell>
  )
}

// Setup guide (app/welcome has its own header, no sidebar; max-w-5xl)
const WX = 128, WW = 944
const WZ = {
  exit: { x: WX + WW - 40 - 152, y: 14, w: 152, h: 36 },
  explain: { x: WX + 40, y: 104, w: WW - 80, h: 80 },
  dots: { x: WX, y: 224, w: WW, h: 60 },
  card: { x: WX + 40, y: 316, w: WW - 80, h: 860 },
  head: { x: WX + 80, y: 356, w: WW - 160, h: 162 },
  intro: { x: WX + 80, y: 542, w: WW - 160, h: 190 },
  fhead: { x: WX + 80, y: 748, w: WW - 160, h: 24 },
  matrix: { x: WX + 80, y: 780, w: WW - 160, h: 280 },
  go: { x: WX + 80, y: 1092, w: 400, h: 44 },
}
const WZ_H = 1250
function DWelcome() {
  const colW = 104, nameW = WZ.matrix.w - 4 * colW
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: WZ_H }}>
      <Box x={0} y={0} w={1200} h={64} className="border-b border-tal-line/60 bg-white/60" />
      <Img src="/icons-pwa/icon-192.png" x={WX + 40} y={14} w={36} />
      <Box {...WZ.exit} className="flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Exit to Dashboard
      </Box>
      <Box {...WZ.explain}><WzExplainer /></Box>
      <Box x={WX} y={200} w={WW} h={16} className="text-center text-[11px] text-tal-plum-soft">Tap any number to jump to that step</Box>
      <Box {...WZ.dots}><WzDots /></Box>
      <Box {...WZ.card} className="rounded-3xl bg-white shadow-sm ring-1 ring-tal-line" />
      <Box {...WZ.head}><WzCardHead /></Box>
      <Box {...WZ.intro}><WzIntro /></Box>
      <Box {...WZ.fhead}><WzFoldersHead /></Box>
      <Box {...WZ.matrix} className="overflow-hidden rounded-xl border border-tal-line bg-white text-sm">
        <div className="flex h-10 items-center border-b border-tal-line bg-tal-cream-soft/60 text-xs font-medium">
          <span className="px-3" style={{ width: nameW }}>Folder</span>
          {WZ_PEOPLE.map((p) => <span key={p} className="text-center" style={{ width: colW }}>{p}</span>)}
        </div>
        {WZ_ROWS.map((r) => (
          <div key={r.n} className="flex h-10 items-center border-b border-tal-line last:border-0">
            <span className="flex items-center gap-2 px-3" style={{ width: nameW }}><Thumb src={T_SUB(r.id)} size={26} className="rounded-md" /><span className="truncate">{r.n}</span></span>
            {r.c.map((c, k) => <span key={k} className={`mx-1 flex h-8 items-center justify-center rounded-md ${CELL[c].bg}`} style={{ width: colW - 8 }}><span className={CELL[c].c}>{CELL[c].s}</span></span>)}
          </div>
        ))}
      </Box>
      <Box {...WZ.go} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">{WZ_GO}</Box>
      <Box x={WZ.go.x + 412} y={WZ.go.y} w={210} h={44} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">I&apos;ve done enough for now</Box>
      <Box x={WZ.go.x + 634} y={WZ.go.y} w={150} h={44} className="flex items-center text-sm text-tal-plum-soft">Skip this section</Box>
      <Box x={WX + 40} y={1200} w={WW - 80} h={20} className="flex justify-between text-sm text-tal-plum-soft"><span>← Back</span><span>Skip this step</span></Box>
    </div>
  )
}

// Learn
const LW7 = 610, LAX = L + LW7 + 24, LAW = CW - LW7 - 24
const LN = {
  hdr: { x: L, y: 76, w: LW7, h: 64 },
  resume: { x: L, y: 164, w: 297, h: 248 },
  pro: { x: L + 313, y: 164, w: 297, h: 248 },
  pathsHead: { x: L, y: 436, w: LW7, h: 28 },
  path: (n: number) => ({ x: L + n * 125, y: 472, w: 113, h: 158 }),
  streak: { x: LAX, y: 76, w: LAW, h: 118 },
  next: { x: LAX, y: 210, w: LAW, h: 300 },
}
function DLearn() {
  return (
    <DShell h={760} active={6}>
      <Box {...LN.hdr}><LnHeader /></Box>
      <Box {...LN.resume}><LnResume /></Box>
      <Box {...LN.pro}><LnPro /></Box>
      <Box {...LN.pathsHead}><LnPathsHead /></Box>
      {LN_PATHS.map((p, n) => <Box key={p.id} {...LN.path(n)}><LnPath p={p} /></Box>)}
      <Box {...LN.streak}><LnStreak /></Box>
      <Box {...LN.next} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between"><span className="font-display text-lg">Up next</span><span className="text-xs text-tal-plum-soft">View all →</span></div>
        {LN_NEXT.map(([t, c]) => (
          <div key={t} className="flex items-center gap-3 py-2">
            <Thumb src={`/thumbnails/categories/${c}.png`} size={40} className="rounded-lg ring-1 ring-white" />
            <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium leading-snug">{t}</p><p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">{c === "health" ? "Health" : "Personal"}</p></div>
            <span className="text-tal-plum-soft">→</span>
          </div>
        ))}
      </Box>
    </DShell>
  )
}

// Peace of Mind Planner index
const plD = plLayout(472, (r) => (r.hint ? 64 : 50))
const PL_ALL = { x: L, y: plD.heads[0], w: CW, h: plD.end - plD.heads[0] }
function DPlanner() {
  return (
    <DShell h={Math.max(760, plD.end + 48)} active={5} fabs={false}>
      <Box x={L} y={78} w={300} h={20} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box x={L} y={100} w={600} h={40} className="font-display text-3xl">Peace of Mind Planner</Box>
      <Box x={L} y={148} w={672} h={48} className="leading-snug text-tal-plum-soft">{PL_INTRO}</Box>
      <Box x={L} y={208} w={124} h={36} className={pdfBtn}><PdfGlyph />Download PDF</Box>
      <Box x={L + 132} y={208} w={104} h={36} className={pdfBtn}><MailGlyph />Share PDF</Box>
      <Box x={L + 248} y={216} w={500} h={20} className="text-xs text-tal-plum-soft">One document, in the same order as the printed Planner — to keep somewhere safe.</Box>
      <Img src="/thumbnails/banners/planner.jpg" x={L} y={268} w={768} h={180} className="rounded-2xl border border-tal-line" />
      {PL_GROUPS.map((g, gi) => <Box key={g.g} x={L} y={plD.heads[gi]} w={CW} h={28} className="font-display text-lg">{g.g}</Box>)}
      {PL_GROUPS.flatMap((g) => g.rows).map((r, n) => <Box key={r.t} x={L} y={plD.rows[n].y} w={CW} h={plD.rows[n].h}><PlRow r={r} /></Box>)}
    </DShell>
  )
}

// Health Insurance Details & Statements (the folder's form)
const HI_CARD_Y = 208
const HI_ROW_H = [84, 68, 84, 100, 104, 104, 68, 100]
const hiRowY = (r: number) => HI_CARD_Y + 64 + HI_ROW_H.slice(0, r).reduce((a, h) => a + h + 16, 0)
const HI_SAVE = { x: L + 16, y: hiRowY(8), w: 72, h: 40 }
const HI_CARD = { x: L, y: HI_CARD_Y, w: CW, h: HI_SAVE.y + 40 + 16 - HI_CARD_Y }
const HI_ADD = { x: L, y: HI_CARD.y + HI_CARD.h + 24, w: 130, h: 40 }
const HI_H = HI_ADD.y + 40 + 48
const HI_HALF = (CW - 32 - 16) / 2
function DFolder() {
  return (
    <DShell h={HI_H} active={2} fabs={false}>
      <Box x={L} y={78} w={300} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Health</span><span className="opacity-50">·</span></Box>
      <Box x={L + 290} y={72} w={150} h={34}><HiPicker /></Box>
      <Box x={L + 450} y={80} w={200} h={18} className="text-xs italic text-tal-plum-soft">{HI_PICK_HINT}</Box>
      <Box x={L} y={116} w={CW} h={72} className="rounded-2xl bg-black shadow-md" />
      <Img src={T_SUB("health.health_insurance")} x={L + 20} y={128} w={48} className="rounded-xl ring-2 ring-white/20" />
      <Box x={L + 84} y={134} w={600} h={36} className="font-display text-2xl leading-9 text-white">Health Insurance Details &amp; Statements</Box>
      <Box x={L + CW - 150} y={134} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium">Export to Excel</Box>
      <Box {...HI_CARD} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={L + 16} y={HI_CARD_Y + 16} w={CW - 32} h={36}><HiEntryHead /></Box>
      {HI_QS.map((row, r) => row.map((q, k) => (
        <Box key={q.l} x={L + 16 + (q.half && k === 1 ? HI_HALF + 16 : 0)} y={hiRowY(r)} w={q.half ? HI_HALF : CW - 32} h={HI_ROW_H[r]}><HiField q={q} /></Box>
      )))}
      <Box {...HI_SAVE} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      <Box {...HI_ADD} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
    </DShell>
  )
}

// Add a record
const AR_HDR = { x: L, y: 104, w: CW, h: 92 }
const AR_COLW = (CW - 16) / 3
const arCard = (g: number, n: number) => ({ x: L + (n % 3) * (AR_COLW + 8), y: (g === 0 ? 256 : 534) + Math.floor(n / 3) * 74, w: AR_COLW, h: 66 })
function DAddRecord() {
  return (
    <DShell h={760} active={2}>
      <Crumbs x={L} y={76} w={CW} items={["Dashboard", "Add a record"]} sep="·" />
      <Box {...AR_HDR}><ArHeader /></Box>
      {AR_GROUPS.map((g, gi) => (
        <div key={g.g}>
          <Box x={L} y={gi === 0 ? 220 : 498} w={CW} h={28} className="font-display text-lg">{g.g}</Box>
          {g.f.map(([n, id], k) => <Box key={id} {...arCard(gi, k)}><ArFolder name={n} id={id} /></Box>)}
        </div>
      ))}
    </DShell>
  )
}

// Add a reminder
const AM_HDR = { x: L, y: 104, w: CW, h: 68 }
const AM_ELSE = { x: L, y: 196, w: CW, h: 80 }
const AM_COLW = (CW - 12) / 2
const amRow = (n: number) => ({ x: L + (n % 2) * (AM_COLW + 12), y: 292 + Math.floor(n / 2) * 88, w: AM_COLW, h: 76 })
function DAddReminder() {
  return (
    <DShell h={760} active={9}>
      <Crumbs x={L} y={76} w={CW} items={["Reminders", "Add a reminder"]} />
      <Box {...AM_HDR} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <HeadThumb id="add-reminder" /><HeadPill>Reminders</HeadPill>
        <span className="font-display text-2xl leading-tight">Add a reminder</span>
        <span className="mx-1 text-white/40">·</span><span className="text-sm text-white/80">Pick something to add an expiry to.</span>
        <span className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-tal-plum"><PlusIcon />Custom reminder</span>
      </Box>
      <Box {...AM_ELSE}><AmElse /></Box>
      {AM_ROWS.map((r, n) => <Box key={r[0]} {...amRow(n)}><AmRow r={r} /></Box>)}
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
  emergency: <DEmergency />,
  reminders: <DReminders />,
  welcome: <DWelcome />,
  organiser: <DOrganiser />,
  tasks: <DTasks />,
  learn: <DLearn />,
  folder: <DFolder />,
  addrec: <DAddRecord />,
  addrem: <DAddReminder />,
  planner: <DPlanner />,
}
const UD = "app.theadultinglife.com.au/dashboard"
const US1 = `app.theadultinglife.com.au/records/search?q=${Q1}`
const US2 = "app.theadultinglife.com.au/records/search?q=how+do+i+add+a+will"
const B = "app.theadultinglife.com.au"
const U_EMERG = `${B}/emergency`, U_REM = `${B}/reminders`, U_WELCOME = `${B}/welcome`, U_ORG = `${B}/records`, U_TASKS = `${B}/tasks`
const U_LEARN = `${B}/learn`, U_FOLDER = `${B}/records/health/health.health_insurance`, U_ADDREC = `${B}/records/new`, U_ADDREM = `${B}/reminders/new`
const U_PLANNER = `${B}/templates/peace-of-mind-planner`
const mid = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const ring = (b: { x: number; y: number; w: number; h: number }, pad = 0) => ({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 })
// Zoom so the box fills the window (never below 1x, never above `max`).
const fz = (r: Rect, max = 1.6, W = 1200, H = 760) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: Math.round(Math.max(1, Math.min(max, W / (r.w + 80), H / (r.h + 80))) * 100) / 100 })
const statBox = (n: number) => ({ x: statX(n), y: D.stats.y, w: 134, h: D.stats.h })
const quickBox = (n: number) => ({ x: AX + 20 + n * 61, y: D.quick.y + 56, w: 54, h: 96 })
const D_VIEW_ALL = { x: AX + 24, y: D.reminders.y + 50, w: 210, h: 22 }
const D_NAV = { x: 8, y: navY(0) - 4, w: 224, h: navY(13) + 45 - navY(0) }
const D_NAV_PLANNER = { x: 12, y: navY(5), w: 216, h: 37 }
const E_TOP = { x: L, y: E_HDR.y, w: CW, h: eD.ys[0] + eD.hs[0] - E_HDR.y }
const E_BOTTOM = { x: L, y: eD.ys[3], w: CW, h: E_MISS.y + E_MISS.h - eD.ys[3] }
const RM_LIST = { x: L, y: 168, w: CW, h: rmRow(REM_ALL.length - 1).y + 72 - 168 }
const WZ_TOP = { x: WX + 40, y: 196, w: WW - 80, h: WZ.head.y + WZ.head.h - 196 }
const WZ_BOTTOM = { x: WZ.fhead.x - 8, y: WZ.fhead.y - 8, w: WZ.fhead.w + 16, h: WZ.go.y + WZ.go.h - WZ.fhead.y + 16 }
const OR_TOP = { x: L, y: OR.hdr.y, w: CW, h: OR.exp.y + OR.exp.h - OR.hdr.y }
const TK_LIST_ALL = { x: L, y: TK_LIST.y, w: CW, h: 56 + 2 * 72 - 8 }
const LN_MAIN = { x: L, y: LN.resume.y, w: LW7, h: LN.path(0).y + LN.path(0).h - LN.resume.y }
const HI_TOP = { x: L, y: 116, w: CW, h: hiRowY(3) + 4 - 116 }
const HI_DATES = { x: L, y: hiRowY(4) - 8, w: CW, h: HI_SAVE.y + HI_SAVE.h - hiRowY(4) + 16 }
const AR_PERSONAL = { x: L, y: 220, w: CW, h: arCard(0, 8).y + 66 - 220 }
const AM_TOP = { x: L, y: AM_ELSE.y, w: CW, h: amRow(5).y + 76 - AM_ELSE.y }
const dScroll = (r: Rect, pageH: number) => Math.round(Math.max(0, Math.min(pageH - 760, r.y + r.h / 2 - 380)))

const D_STEPS: WalkStep[] = [
  { screen: "dash", url: UD, caption: "Your dashboard - life at a glance", detail: "What's coming up, what's left to do and how far you've got, for the whole family. Click any card to open it.", duration: 6500 },
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
  { screen: "dash", url: UD, caption: "Hi Sarah - here's what's waiting", detail: "A one-line summary: reminders coming up (or expired) and tasks still to do.", focus: { x: 480, y: 160, scale: 1.6 }, ring: ring(D.hero, 4), duration: 5000 },
  // Emergency
  { screen: "dash", url: UD, caption: "In case of emergency", detail: "Click the red card to open the family's emergency page.", focus: { x: 715, y: 160, scale: 1.6 }, ring: D.sos, click: mid(D.sos), duration: 5000 },
  { screen: "emergency", url: U_EMERG, caption: "Everything a paramedic might need", detail: "Emergency contacts, doctors, medications and health insurance, gathered from your Organiser folders. Download or share it as a PDF.", focus: fz(E_TOP), ring: E_TOP, duration: 8000 },
  { screen: "emergency", url: U_EMERG, scroll: E_H - 760, caption: "And what's still missing", detail: "Folders with nothing in them yet - an advance health directive, a will, a power of attorney. Tap one to fill it in.", focus: fz(E_BOTTOM, 1.4), ring: E_BOTTOM, duration: 7000 },
  // Reminders
  { screen: "dash", url: UD, caption: "Upcoming reminders", detail: "What's due in the next 60 days. Click View all to see every one.", focus: { x: 1000, y: 220, scale: 1.45 }, ring: D.reminders, click: mid(D_VIEW_ALL), duration: 5500 },
  { screen: "reminders", url: U_REM, caption: "Every date, in one list", detail: "Renewals and expiry dates from every folder - rego, insurance, licences, passports. Amber is Soon, red is Expired. Click one to open it.", focus: fz({ x: L, y: RM_HDR.y, w: CW, h: RM_LIST.y + RM_LIST.h - RM_HDR.y }), ring: RM_LIST, duration: 7500 },
  // Setup guide
  { screen: "dash", url: UD, caption: "Your Setup guide", detail: "Sarah is 5 of 8 steps in. Click to carry on where she left off.", scroll: 140, focus: { x: 565, y: 440, scale: 1.3 }, ring: { x: L - 4, y: D.wizard.y - 4, w: LW + 8, h: D.wizard.h + 8 }, click: mid(D.wizard), duration: 5500 },
  { screen: "welcome", url: U_WELCOME, caption: "Step 6 of 8: Education", detail: "The Setup guide goes section by section - your family, then Personal, Health, Education, Employment and Admin. Tap any number to jump.", focus: fz(WZ_TOP), ring: WZ_TOP, duration: 7500 },
  { screen: "welcome", url: U_WELCOME, scroll: WZ_H - 760, caption: "What's done, for each person", detail: "✓ complete, ◐ started, ✗ empty, — doesn't apply. Keep going opens the next folder - what you type saves straight into your Organiser.", focus: fz(WZ_BOTTOM), ring: WZ_BOTTOM, duration: 8000 },
  // The four stat cards
  { screen: "dash", url: UD, caption: "Records & Documents: 23", detail: "Everything you've stored. Click to open The Adulting Life Organiser.", scroll: 330, focus: fz(D.stats, 1.4), ring: statBox(0), click: mid(statBox(0)), duration: 5500 },
  { screen: "organiser", url: U_ORG, caption: "The Adulting Life Organiser", detail: "Every record for the whole family, in five sections. Expiring or expired shows anything due in the next 30 days.", focus: fz(OR_TOP), ring: OR_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Things expiring soon: 5", detail: "Click to open Reminders.", scroll: 330, focus: fz(D.stats, 1.4), ring: statBox(1), click: mid(statBox(1)), duration: 4500 },
  { screen: "reminders", url: U_REM, caption: "Your own reminders too", detail: "Add reminder for anything with a date - like Leo's dentist check-up. Custom ones can repeat yearly; Snooze or mark them Done.", focus: fz({ x: L, y: RM_ADD.y, w: CW, h: rmRow(REM_CUSTOM).y + 72 - RM_ADD.y }, 1.4), ring: rmRow(REM_CUSTOM), duration: 7000 },
  { screen: "dash", url: UD, caption: "Tasks to complete: 4", detail: "Click to open Tasks.", scroll: 330, focus: fz(D.stats, 1.4), ring: statBox(2), click: mid(statBox(2)), duration: 4500 },
  { screen: "tasks", url: U_TASKS, caption: "Setup steps", detail: "Your getting-started checklist - 7 of 9 done. Each one takes you to the place to do it.", focus: fz({ x: L, y: TK_HDR.y, w: CW, h: TK_SETUP.y + TK_SETUP.h - TK_HDR.y }), ring: TK_SETUP, duration: 6500 },
  { screen: "tasks", url: U_TASKS, scroll: TK_H - 760, caption: "And your own to-do list", detail: "Add a task, give it a due date, link it to a record and tick it off. Open shows what's left.", focus: fz(TK_LIST_ALL, 1.5), ring: TK_LIST_ALL, duration: 6500 },
  { screen: "dash", url: UD, caption: "All good: 18", detail: "Records that are up to date, with nothing overdue. Click to see them in the Organiser.", scroll: 330, focus: fz(D.stats, 1.4), ring: statBox(3), click: mid(statBox(3)), duration: 5000 },
  { screen: "organiser", url: U_ORG, scroll: dScroll(OR_CATS, OR_H), caption: "How complete each section is", detail: "Personal, Health, Education, Employment and Admin - 23 of 79 folders done across the family. Open one to see every folder.", focus: fz(OR_CATS), ring: OR_CATS, duration: 7000 },
  // Lower left
  { screen: "dash", url: UD, caption: "Organiser Overview", detail: "The same five sections on your dashboard: folders done, and how many are still missing.", scroll: 520, focus: { x: 565, y: 885, scale: 1.35 }, ring: D.overview, duration: 6000 },
  { screen: "dash", url: UD, caption: "Continue Learning", detail: "Your next lesson: Passport & Travel Documents. Click to open Learn.", scroll: 820, focus: fz(D.learn, 1.6), ring: D.learn, click: mid(D.learn), duration: 5000 },
  { screen: "learn", url: U_LEARN, caption: "Learn: bite-sized lessons", detail: "Resume your lesson, see how far you've got and work through each section's path. Learn progress on the dashboard opens here too.", focus: fz(LN_MAIN, 1.3), ring: LN_MAIN, duration: 7500 },
  { screen: "dash", url: UD, caption: "Recent activity", detail: "Uploads, updates and lessons from the whole family - and a cheer when you've been busy.", scroll: 940, focus: { x: 600, y: 1350, scale: 1.2 }, ring: D.activity, duration: 6000 },
  // Right-hand column
  { screen: "dash", url: UD, caption: "Next things to complete", detail: "Empty or half-done folders, the important ones first. Click Health Insurance Details & Statements.", scroll: 220, focus: fz(D.missing, 1.45), ring: D.missing, click: mid(D_MISS0), duration: 6000 },
  { screen: "folder", url: U_FOLDER, caption: "The folder's questions", detail: "Sarah's policy: provider, member number and level of cover. Upload & scan the policy document and the details fill in for you.", focus: fz(HI_TOP), ring: HI_TOP, duration: 8000 },
  { screen: "folder", url: U_FOLDER, scroll: HI_H - 760, caption: "Dates become reminders", detail: "Renewal and review dates go straight into Reminders. Leave blank what you don't know yet and Save. + Add another for a second policy.", focus: fz(HI_DATES), ring: HI_DATES, duration: 8000 },
  { screen: "dash", url: UD, caption: "Quick Actions", detail: "Add Record, Upload Document, Scan Document or Add Reminder. Click Add Record.", scroll: 480, focus: fz(D.quick, 1.6), ring: D.quick, click: mid(quickBox(0)), duration: 5500 },
  { screen: "addrec", url: U_ADDREC, caption: "Add a record: pick its folder", detail: "Choose where it belongs and the right questions are set up for you - or scan a document and AI fills them in.", focus: fz(AR_PERSONAL), ring: AR_PERSONAL, duration: 7000 },
  { screen: "dash", url: UD, caption: "Add Reminder", detail: "Stuck on something? The card below lets you ask TAL AI a question.", scroll: 480, focus: fz({ x: AX, y: D.quick.y, w: AW, h: D.helper.y + D.helper.h - D.quick.y }, 1.5), ring: quickBox(3), click: mid(quickBox(3)), duration: 5000 },
  { screen: "addrem", url: U_ADDREM, caption: "Add a reminder", detail: "Pick a passport, licence, rego or policy to update its expiry date - or Custom reminder for anything else with a date.", focus: fz(AM_TOP), ring: AM_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Peace of Mind Planner", detail: "Continue where you're up to, preview it, download or email the PDF - or nominate someone you trust to view it.", scroll: 760, focus: { x: 1020, y: 1275, scale: 1.4 }, ring: D.pom, click: mid(D_SHIELD), duration: 7000 },
  // Sidebar, the Planner and round buttons
  { screen: "dash", url: UD, caption: "Everything else is in the menu", detail: "The Organiser, Documents, Receipts, Learn, TAL AI, Tasks, Reminders, Emergency, Settings and more. Click Peace of Mind Planner.", focus: { x: 300, y: 420, scale: 1.15 }, ring: D_NAV, click: mid(D_NAV_PLANNER), duration: 7000 },
  { screen: "planner", url: U_PLANNER, scroll: Math.max(0, plD.end + 48 - 760), caption: "The Planner: what your family would need", detail: "Sections marked ↔ share their entries with your Organiser; wishes and letters live only here. Download it all as one PDF.", focus: fz(PL_ALL, 1.4), ring: PL_ALL, duration: 7500 },
  { screen: "dash", url: UD, caption: "Two round buttons, on every page", detail: "? opens help for the page you're on. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 1050, y: 640, scale: 1.8 }, ring: { x: FAB_R - 128, y: FAB_Y, w: 128, h: 56 }, click: { x: FAB_R - 100, y: FAB_Y + 28 }, duration: 7000 },
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
  missing: { x: PX, y: 2928, w: PCW, h: 310 },
  quick: { x: PX, y: 3254, w: PCW, h: 300 },
  helper: { x: PX, y: 3570, w: PCW, h: 150 },
  pom: { x: PX, y: 3736, w: PCW, h: 290 },
  lprog: { x: PX, y: 4042, w: PCW, h: 160 },
}
const P_H = 4240
const P_MISS0 = { x: PX + 20, y: P.missing.y + 82, w: PCW - 40, h: 124 }
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
      <Box {...P_MISS0}><MissingRow m={MISSING[0]} /></Box>
      <Box x={PX + 20} y={P.missing.y + 214} w={PCW - 40} h={76}><MissingRow m={MISSING[1]} /></Box>
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

// ── Phone: the pages the dashboard opens (mobile layouts) ───────────────────

const PIcon = ({ children, light }: { children: ReactNode; light?: boolean }) => (
  <span className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-xl ${light ? "bg-white/15" : "border border-tal-line bg-white text-tal-plum"}`}>{children}</span>
)
function PShell({ h = 844, children }: { h?: number; children: ReactNode }) {
  return (
    <PPage h={h}>
      {children}
      <StatusBar />
      <PHeader />
    </PPage>
  )
}

// Emergency
const PE_HDR = { x: PX, y: 144, w: PCW, h: 124 }
const eP = eLayout(312, true)
const PE_MISS = { x: PX, y: eP.end + 32, w: PCW, h: 300 }
const PE_H = PE_MISS.y + PE_MISS.h + 40
function PEmergency() {
  return (
    <PShell h={PE_H}>
      <Crumbs x={PX} y={116} w={PCW} items={["Dashboard", "Emergency"]} />
      <Box {...PE_HDR} className="rounded-2xl bg-red-600 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20"><EmergencyGlyph /></span>
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">In case of emergency</span>
          <PIcon><PdfGlyph /></PIcon><PIcon><MailGlyph /></PIcon>
          <span className="flex h-8 items-center rounded-xl bg-white/15 px-2.5 text-xs font-medium">Excel</span>
        </div>
        <p className="mt-2 font-display text-xl leading-tight">Everything a paramedic, hospital or trusted person might need</p>
      </Box>
      <Box x={PX} y={280} w={PCW} h={20} className="text-sm text-tal-plum-soft">{E_COUNT}</Box>
      {E_SECTIONS.map((s, n) => <Box key={s.label} x={PX} y={eP.ys[n]} w={PCW} h={eP.hs[n]}><ESection s={s} phone /></Box>)}
      <Box {...PE_MISS}><EStillMissing /></Box>
    </PShell>
  )
}

// Reminders
const PRM_ADD = { x: PX + 218, y: 132, w: 132, h: 36 }
const PRM_H = [72, 72, 88, 72, 72, 72]
const prmRow = (n: number) => ({ x: PX, y: 298 + PRM_H.slice(0, n).reduce((a, h) => a + h + 8, 0), w: PCW, h: PRM_H[n] })
function PReminders() {
  return (
    <PShell>
      <Box x={PX} y={116} w={PCW} h={132} className="rounded-2xl bg-black text-white shadow-md" />
      <Box x={PX + 24} y={132} w={190} h={36} className="flex items-center gap-3 text-white"><HeadThumb id="expiring-soon" /><HeadPill>Reminders</HeadPill></Box>
      <Box {...PRM_ADD} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium"><PlusIcon />Add reminder</Box>
      <Box x={PX + 24} y={176} w={326} h={32} className="font-display text-2xl leading-tight text-white">What&apos;s coming up</Box>
      <Box x={PX + 24} y={212} w={326} h={20} className="text-sm text-white/80"><span className="mr-2 text-white/40">·</span>{REM_ALL.length} upcoming</Box>
      <Box x={PX} y={264} w={PCW} h={28} className="font-display text-xl">Upcoming</Box>
      {REM_ALL.map((r, n) => <Box key={r.t} {...prmRow(n)}><RemRow r={r} /></Box>)}
    </PShell>
  )
}

// Tasks
const PTK_STEP_H = [64, 84, 48, 48, 48, 48, 48, 48, 48]
const ptkStepY = (n: number) => 312 + PTK_STEP_H.slice(0, n).reduce((a, h) => a + h + 8, 0)
const PTK_SETUP = { x: PX, y: 232, w: PCW, h: ptkStepY(9) - 8 + 20 - 232 }
const PTK_LIST_Y = PTK_SETUP.y + PTK_SETUP.h + 24
const PTK_H = PTK_LIST_Y + 56 + 2 * 72 + 40
function PTasks() {
  return (
    <PShell h={PTK_H}>
      <Box x={PX} y={116} w={PCW} h={100} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex items-center gap-3"><HeadThumb id="tasks" /><HeadPill>Tasks</HeadPill><span className="font-display text-2xl leading-tight">Your list</span></div>
        <div className="mt-2 text-sm text-white/80"><span className="mr-2 text-white/40">·</span>4 things to do</div>
      </Box>
      <Box {...PTK_SETUP} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 20} y={252} w={PCW - 40} h={28} className="flex items-baseline justify-between"><span className="font-display text-lg">Setup steps</span><span className="text-xs text-tal-plum-soft">7 of 9 done · 78%</span></Box>
      {SETUP_STEPS.map(([t, done], n) => <Box key={t} x={PX + 20} y={ptkStepY(n)} w={PCW - 40} h={PTK_STEP_H[n]}><SetupStepRow t={t} done={done} /></Box>)}
      <Box x={PX} y={PTK_LIST_Y} w={PCW} h={40}><TaskFilter /></Box>
      {MY_TASKS.map(([t, sub], n) => <Box key={t} x={PX} y={PTK_LIST_Y + 56 + n * 72} w={PCW} h={64}><TaskRow t={t} sub={sub} /></Box>)}
    </PShell>
  )
}

// The Organiser (also where search lives on a phone)
const PO = {
  hdr: { x: PX, y: 116, w: PCW, h: 188 },
  exp: { x: PX, y: 320, w: PCW, h: 168 },
  expRow: (n: number) => ({ x: PX + 16, y: 368 + n * 54, w: PCW - 32, h: 48 }),
  catsHead: { x: PX, y: 512, w: PCW, h: 28 },
  cat: (n: number) => ({ x: PX, y: 552 + n * 166, w: PCW, h: 150 }),
  stat: (n: number) => ({ x: PX, y: 1390 + n * 84, w: PCW, h: 72 }),
  newTo: { x: PX, y: 1750, w: PCW, h: 116 },
  hidden: { x: PX, y: 1882, w: PCW, h: 98 },
}
const PO_H = 2010
const P_SEARCH_BTN = { x: 102, y: 252, w: 140, h: 36 }
function POrganiser() {
  return (
    <PShell h={PO_H}>
      <Box {...PO.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Img src="/thumbnails/dashboard/records-documents.png" x={PX + 20} y={130} w={36} />
      <Box x={PX + 68} y={128} w={PCW - 88} h={64} className="font-display text-2xl leading-tight">The Adulting Life Organiser</Box>
      <Box x={PX + 20} y={198} w={PCW - 40} h={42} className="text-sm text-tal-plum-soft">All your important information, organised in one place.</Box>
      <Box {...P_SEARCH_BTN} className={`${btnLine} gap-2 px-3 text-tal-plum-soft`}><SearchIcon size={14} />Search records</Box>
      <Box x={250} y={252} w={112} h={36} className="flex items-center justify-center gap-1.5 rounded-lg bg-black text-sm font-medium text-white"><PlusIcon />Add Record</Box>
      <Box {...PO.exp} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
      <Box x={PX + 16} y={336} w={PCW - 32} h={24} className="flex items-center gap-2"><span className="text-amber-700"><WarnBadge /></span><span className="font-display">Expiring or expired ({O_EXPIRING.length})</span></Box>
      {O_EXPIRING.map((r, n) => <Box key={r.t} {...PO.expRow(n)}><OExpRow r={r} /></Box>)}
      <Box {...PO.catsHead} className="font-display text-xl">Choose a category</Box>
      {O_CATS.map((c, n) => <Box key={c.id} {...PO.cat(n)}><OCatCard c={c} /></Box>)}
      {O_STATS.map((s, n) => <Box key={s.v} {...PO.stat(n)}><OStatCard s={s} n={n} /></Box>)}
      <Box {...PO.newTo} className="rounded-2xl border border-tal-line bg-tal-cream-soft" />
      <Box x={PX + 20} y={PO.newTo.y + 16} w={PCW - 40} h={40} className="flex items-center gap-4"><ONewTo /></Box>
      <Box x={PX + 20} y={PO.newTo.y + 64} w={190} h={36} className={`${btnLine} gap-1`}>Getting Started Guide →</Box>
      <Box {...PO.hidden} className="rounded-2xl border border-tal-line bg-white px-5 py-5"><OHiddenHead /></Box>
    </PShell>
  )
}

// Setup guide
const PWZ = {
  explain: { x: 12, y: 132, w: 366, h: 206 },
  dots: { x: 0, y: 354, w: PW, h: 56 },
  card: { x: 12, y: 442, w: 366, h: 1344 },
  head: { x: 28, y: 458, w: 334, h: 210 },
  intro: { x: 28, y: 692, w: 334, h: 340 },
  fhead: { x: 28, y: 1058, w: 334, h: 44 },
  row: (n: number) => ({ x: 28, y: 1142 + n * 78, w: 334, h: 70 }),
  go: { x: 28, y: 1626, w: 334, h: 44 },
}
const PWZ_H = 1864
const pwzCellX = (k: number) => 28 + k * 85
function PWelcome() {
  return (
    <PPage h={PWZ_H}>
      <StatusBar />
      <Box x={0} y={44} w={PW} h={64} className="border-b border-tal-line/60 bg-white/60" />
      <Img src="/icons-pwa/icon-192.png" x={12} y={58} w={36} />
      <Box x={226} y={58} w={152} h={36} className="flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm">Exit to Dashboard</Box>
      <Box {...PWZ.explain}><WzExplainer /></Box>
      <Box {...PWZ.dots}><WzDots phone /></Box>
      <Box {...PWZ.card} className="rounded-3xl bg-white shadow-sm ring-1 ring-tal-line" />
      <Box {...PWZ.head}><WzCardHead /></Box>
      <Box {...PWZ.intro}><WzIntro /></Box>
      <Box {...PWZ.fhead}><WzFoldersHead /></Box>
      <Box x={28} y={1110} w={334} h={22} className="flex text-[11px] font-medium text-tal-plum-soft">{WZ_PEOPLE.map((p) => <span key={p} className="text-center" style={{ width: 85 }}>{p}</span>)}</Box>
      {WZ_ROWS.map((r, n) => (
        <div key={r.n}>
          <Box {...PWZ.row(n)} className="rounded-xl border border-tal-line bg-white" />
          <Box x={36} y={PWZ.row(n).y + 6} w={318} h={24} className="flex items-center gap-2 text-sm font-medium"><Thumb src={T_SUB(r.id)} size={22} className="rounded-md" /><span className="truncate">{r.n}</span></Box>
          {r.c.map((c, k) => <Box key={k} x={pwzCellX(k) + 6} y={PWZ.row(n).y + 34} w={73} h={28} className={`flex items-center justify-center rounded-md ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>)}
        </div>
      ))}
      <Box {...PWZ.go} className="flex items-center justify-center rounded-xl bg-black px-3 text-center text-[13px] font-medium leading-tight text-white">{WZ_GO}</Box>
      <Box x={28} y={1682} w={210} h={44} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">I&apos;ve done enough for now</Box>
      <Box x={28} y={1736} w={160} h={28} className="flex items-center text-sm text-tal-plum-soft">Skip this section</Box>
      <Box x={20} y={1810} w={350} h={20} className="flex justify-between text-sm text-tal-plum-soft"><span>← Back</span><span>Skip this step</span></Box>
    </PPage>
  )
}

// Learn
const PLN = {
  hdr: { x: PX, y: 116, w: PCW, h: 150 },
  resume: { x: PX, y: 282, w: PCW, h: 216 },
  pro: { x: PX, y: 514, w: PCW, h: 156 },
  pathsHead: { x: PX, y: 694, w: PCW, h: 28 },
  path: (n: number) => ({ x: PX + (n % 2) * 193, y: 730 + Math.floor(n / 2) * 162, w: 181, h: 150 }),
  streak: { x: PX, y: 1220, w: PCW, h: 118 },
}
const PLN_H = 1380
function PLearn() {
  return (
    <PShell h={PLN_H}>
      <Box {...PLN.hdr}><LnHeader phone /></Box>
      <Box {...PLN.resume}><LnResume /></Box>
      <Box {...PLN.pro}><LnPro /></Box>
      <Box {...PLN.pathsHead}><LnPathsHead /></Box>
      {LN_PATHS.map((p, n) => <Box key={p.id} {...PLN.path(n)}><LnPath p={p} /></Box>)}
      <Box {...PLN.streak}><LnStreak /></Box>
    </PShell>
  )
}

// Peace of Mind Planner index
const plP = plLayout(512, (r) => (r.hint ? 96 : 56))
const PPL_ALL = { x: PX, y: plP.heads[0], w: PCW, h: plP.end - plP.heads[0] }
function PPlanner() {
  return (
    <PShell h={plP.end + 60}>
      <Box x={PX} y={116} w={PCW} h={20} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box x={PX} y={138} w={PCW} h={40} className="font-display text-3xl">Peace of Mind Planner</Box>
      <Box x={PX} y={184} w={PCW} h={124} className="leading-snug text-tal-plum-soft">{PL_INTRO}</Box>
      <Box x={PX} y={326} w={40} h={36} className={pdfBtn}><PdfGlyph /></Box>
      <Box x={PX + 48} y={326} w={40} h={36} className={pdfBtn}><MailGlyph /></Box>
      <Box x={PX + 98} y={326} w={276} h={36} className="text-xs leading-snug text-tal-plum-soft">One document, in the same order as the printed Planner — to keep somewhere safe.</Box>
      <Img src="/thumbnails/banners/planner.jpg" x={PX} y={386} w={PCW} h={94} className="rounded-2xl border border-tal-line" />
      {PL_GROUPS.map((g, gi) => <Box key={g.g} x={PX} y={plP.heads[gi]} w={PCW} h={28} className="font-display text-lg">{g.g}</Box>)}
      {PL_GROUPS.flatMap((g) => g.rows).map((r, n) => <Box key={r.t} x={PX} y={plP.rows[n].y} w={PCW} h={plP.rows[n].h}><PlRow r={r} /></Box>)}
    </PShell>
  )
}

// Health Insurance Details & Statements (the folder's form, one field per row)
const PHI_QS = HI_QS.flat()
const PHI_H = [144, 68, 68, 88, 100, 88, 100, 104, 88, 68, 100]
const PHI_CARD_Y = 354
const phiY = (n: number) => PHI_CARD_Y + 64 + PHI_H.slice(0, n).reduce((a, h) => a + h + 16, 0)
const PHI_SAVE = { x: PX + 16, y: phiY(PHI_QS.length), w: 72, h: 40 }
const PHI_CARD = { x: PX, y: PHI_CARD_Y, w: PCW, h: PHI_SAVE.y + 56 - PHI_CARD_Y }
const PHI_ADD = { x: PX, y: PHI_CARD.y + PHI_CARD.h + 24, w: 130, h: 40 }
const PHI_PAGE_H = PHI_ADD.y + 40 + 60
function PFolder() {
  return (
    <PShell h={PHI_PAGE_H}>
      <Box x={PX} y={116} w={PCW} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Health</span><span className="opacity-50">·</span></Box>
      <Box x={PX} y={142} w={150} h={34}><HiPicker /></Box>
      <Box x={PX + 160} y={150} w={200} h={18} className="text-xs italic text-tal-plum-soft">{HI_PICK_HINT}</Box>
      <Box x={PX} y={188} w={PCW} h={150} className="rounded-2xl bg-black shadow-md" />
      <Img src={T_SUB("health.health_insurance")} x={PX + 20} y={200} w={48} className="rounded-xl ring-2 ring-white/20" />
      <Box x={PX + 84} y={200} w={270} h={72} className="font-display text-2xl leading-9 text-white">Health Insurance Details &amp; Statements</Box>
      <Box x={PX + 20} y={286} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium">Export to Excel</Box>
      <Box {...PHI_CARD} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={PX + 16} y={PHI_CARD_Y + 16} w={PCW - 32} h={36}><HiEntryHead /></Box>
      {PHI_QS.map((q, n) => <Box key={q.l} x={PX + 16} y={phiY(n)} w={PCW - 32} h={PHI_H[n]}><HiField q={q} phone /></Box>)}
      <Box {...PHI_SAVE} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      <Box {...PHI_ADD} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
    </PShell>
  )
}

// Add a record
const PAR_HDR = { x: PX, y: 144, w: PCW, h: 176 }
const parCard = (g: number, n: number) => ({ x: PX, y: (g === 0 ? 380 : 1098) + n * 74, w: PCW, h: 66 })
function PAddRecord() {
  return (
    <PShell h={1360}>
      <Crumbs x={PX} y={116} w={PCW} items={["Dashboard", "Add a record"]} sep="·" />
      <Box {...PAR_HDR}><ArHeader /></Box>
      {AR_GROUPS.map((g, gi) => (
        <div key={g.g}>
          <Box x={PX} y={gi === 0 ? 344 : 1062} w={PCW} h={28} className="font-display text-lg">{g.g}</Box>
          {g.f.map(([n, id], k) => <Box key={id} {...parCard(gi, k)}><ArFolder name={n} id={id} /></Box>)}
        </div>
      ))}
    </PShell>
  )
}

// Add a reminder
const PAM_ELSE = { x: PX, y: 286, w: PCW, h: 80 }
const pamRow = (n: number) => ({ x: PX, y: 382 + n * 88, w: PCW, h: 76 })
function PAddReminder() {
  return (
    <PShell h={382 + AM_ROWS.length * 88 + 40}>
      <Crumbs x={PX} y={116} w={PCW} items={["Reminders", "Add a reminder"]} />
      <Box x={PX} y={144} w={PCW} h={126} className="rounded-2xl bg-black text-white shadow-md" />
      <Box x={PX + 24} y={160} w={180} h={36} className="flex items-center gap-3 text-white"><HeadThumb id="add-reminder" /><HeadPill>Reminders</HeadPill></Box>
      <Box x={PX + 188} y={160} w={162} h={36} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium"><PlusIcon />Custom reminder</Box>
      <Box x={PX + 24} y={204} w={326} h={32} className="font-display text-2xl leading-tight text-white">Add a reminder</Box>
      <Box x={PX + 24} y={238} w={326} h={20} className="text-sm text-white/80"><span className="mr-2 text-white/40">·</span>Pick something to add an expiry to.</Box>
      <Box {...PAM_ELSE}><AmElse /></Box>
      {AM_ROWS.map((r, n) => <Box key={r[0]} {...pamRow(n)}><AmRow r={r} /></Box>)}
    </PShell>
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
  emergency: <PEmergency />,
  reminders: <PReminders />,
  welcome: <PWelcome />,
  tasks: <PTasks />,
  learn: <PLearn />,
  folder: <PFolder />,
  addrec: <PAddRecord />,
  addrem: <PAddReminder />,
  planner: <PPlanner />,
}

const UO = "app.theadultinglife.com.au/records"
const USE = "app.theadultinglife.com.au/records/search"
const pSpan = (a: { y: number }, b: { y: number; h: number }) => ({ x: PX, y: a.y, w: PCW, h: b.y + b.h - a.y })
const pz = (r: Rect, max = 1.4) => fz(r, max, PW, 844)
const pQuick = (n: number) => ({ x: PX + 20 + (n % 2) * 173, y: P.quick.y + 56 + Math.floor(n / 2) * 116, w: 161, h: 104 })
const P_VIEW_ALL = { x: PX + 24, y: P.reminders.y + 50, w: 220, h: 22 }
const PE_TOP = { x: PX, y: PE_HDR.y, w: PCW, h: eP.ys[0] + eP.hs[0] - PE_HDR.y }
const PE_BOTTOM = { x: PX, y: eP.ys[3], w: PCW, h: PE_MISS.y + PE_MISS.h - eP.ys[3] }
const PRM_LIST = { x: PX, y: 264, w: PCW, h: prmRow(REM_ALL.length - 1).y + 72 - 264 }
const PWZ_TOP = { x: 12, y: PWZ.dots.y - 4, w: 366, h: PWZ.head.y + PWZ.head.h - PWZ.dots.y + 4 }
const PWZ_BOTTOM = { x: 20, y: PWZ.fhead.y - 8, w: 350, h: 1764 - PWZ.fhead.y + 8 }
const PO_TOP = { x: PX, y: PO.hdr.y, w: PCW, h: PO.exp.y + PO.exp.h - PO.hdr.y }
const PO_CATS = { x: PX, y: PO.catsHead.y, w: PCW, h: PO.cat(2).y + 150 - PO.catsHead.y }
const PLN_TOP = { x: PX, y: PLN.resume.y, w: PCW, h: PLN.pro.y + PLN.pro.h - PLN.resume.y }
const PHI_TOP = { x: PX, y: 188, w: PCW, h: phiY(4) - 8 - 188 }
const PHI_DATES = { x: PX, y: phiY(5) - 8, w: PCW, h: PHI_SAVE.y + PHI_SAVE.h - phiY(5) + 16 }
const PAR_TOP = { x: PX, y: PAR_HDR.y, w: PCW, h: parCard(0, 5).y + 66 - PAR_HDR.y }
const PAM_TOP = { x: PX, y: PAM_ELSE.y, w: PCW, h: pamRow(4).y + 76 - PAM_ELSE.y }

const P_STEPS: WalkStep[] = [
  { screen: "dash", url: UD, caption: "Your dashboard - life at a glance", detail: "What's coming up, what's left to do and how far you've got, for the whole family. Tap any card to open it.", duration: 6500 },
  // Header
  { screen: "dash", url: UD, caption: "Ask TAL AI, reminders and your account", detail: "TAL AI is your built-in guide. The bell opens Reminders. Your picture opens the account menu.", focus: { x: 250, y: 160, scale: 1.6 }, ring: { x: P_ASK.x - 4, y: 54, w: P_USER.x + P_USER.w - P_ASK.x + 8, h: 48 }, duration: 6000 },
  { screen: "user", url: UD, caption: "Your account menu", detail: "Who's signed in, your TAL Premium plan, take the tour again, privacy, terms and sign out.", focus: { x: 214, y: 260, scale: 1.3 }, ring: { x: P_USER_MENU.x, y: P_USER.y, w: P_USER_MENU.w, h: P_USER_MENU.y + P_USER_MENU.h - P_USER.y }, click: { x: P_USER.x + 32, y: P_USER.y + 20 }, duration: 6000 },
  { screen: "drawer", url: UD, caption: "Everything else is in the menu", detail: "Tap ☰ for the Organiser, Documents, Receipts, the Planner, Learn, TAL AI, Tasks, Reminders, Emergency, Settings and more. ⓘ explains each one.", focus: { x: 150, y: 460, scale: 1.08 }, ring: { x: 8, y: dNavY(0) - 4, w: DRAWER_W - 16, h: dNavY(13) + 48 - dNavY(0) }, duration: 7500 },
  // Search
  { screen: "drawer", url: UD, caption: "To search, open the Organiser", detail: "On a phone, search lives at the top of The Adulting Life Organiser.", focus: { x: 150, y: 260, scale: 1.4 }, ring: { x: 12, y: dNavY(2), w: DRAWER_W - 24, h: 40 }, click: { x: 120, y: dNavY(2) + 20 }, duration: 5000 },
  { screen: "organiser", url: UO, caption: "Tap Search records", focus: { x: 195, y: 230, scale: 1.4 }, ring: P_SEARCH_BTN, click: { x: P_SEARCH_BTN.x + 70, y: P_SEARCH_BTN.y + 18 }, duration: 4500 },
  { screen: "typing", url: USE, caption: "Type what you're after", detail: "A folder, a record title, a note or a field value.", focus: { x: 195, y: 200, scale: 1.4 }, ring: P_SR.btn, click: { x: P_SR.btn.x + 42, y: P_SR.btn.y + 22 }, duration: 6000 },
  { screen: "found", url: `${USE}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "Plus every passport record in the family, with its expiry. Tap to open it.", focus: { x: 195, y: 380, scale: 1.12 }, ring: P_FOLDER, click: { x: 150, y: P_FOLDER.y + 31 }, duration: 6000 },
  { screen: "none", url: `${USE}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "\"how do i add a will\" isn't the name of anything - so TAL AI offers to point you to the right place.", focus: { x: 195, y: 300, scale: 1.3 }, ring: P_AI.ask, click: { x: P_AI.ask.x + 108, y: P_AI.ask.y + 20 }, duration: 6000 },
  { screen: "consent", url: `${USE}?q=how+do+i+add+a+will`, caption: "Only your search words are sent", detail: "The first time, it asks first. Nothing you've stored in your folders goes to the AI.", focus: { x: 195, y: 420, scale: 1.1 }, ring: P_CONSENT_GO, click: { x: P_CONSENT_GO.x + 48, y: P_CONSENT_GO.y + 18 }, duration: 6000 },
  { screen: "ai", url: `${USE}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner - with a line on what to do there.", focus: { x: 195, y: 440, scale: 1.08 }, ring: { x: PX + 12, y: P_AI.answerY - 8, w: PCW - 24, h: P_AI.noteY + 26 - P_AI.answerY }, duration: 7500 },
  { screen: "ai", url: `${USE}?q=how+do+i+add+a+will`, caption: "Tap a suggestion to go straight there", detail: "Typos work too - \"pasport\" finds nothing, and TAL AI says you meant Passport. It's a guide only.", focus: { x: 195, y: 470, scale: 1.12 }, ring: { x: PX + 20, y: P_AI.matchY, w: PCW - 40, h: P_AI.gap - 8 }, click: { x: 160, y: P_AI.matchY + 34 }, duration: 6500 },
  // Top of the dashboard
  { screen: "dash", url: UD, caption: "Hi Sarah - here's what's waiting", detail: "A one-line summary: reminders coming up (or expired) and tasks still to do.", focus: { x: 195, y: 170, scale: 1.3 }, ring: P.hero, duration: 5000 },
  { screen: "dash", url: UD, caption: "In case of emergency", detail: "Tap the red card to open the family's emergency page.", focus: { x: 195, y: 290, scale: 1.12 }, ring: P.sos, click: { x: 195, y: P.sos.y + 52 }, duration: 5000 },
  { screen: "emergency", url: U_EMERG, caption: "Everything a paramedic might need", detail: "Emergency contacts, doctors, medications and health insurance, gathered from your Organiser folders. Download or share it as a PDF.", focus: pz(PE_TOP), ring: PE_TOP, duration: 8000 },
  { screen: "emergency", url: U_EMERG, scroll: PE_H - 844, caption: "And what's still missing", detail: "Folders with nothing in them yet - an advance health directive, a will, a power of attorney. Tap one to fill it in.", focus: pz(PE_BOTTOM), ring: PE_BOTTOM, duration: 7000 },
  { screen: "dash", url: UD, caption: "Your Setup guide", detail: "Sarah is 5 of 8 steps in. Tap to carry on where she left off.", scroll: 300, focus: { x: 195, y: 560, scale: 1.08 }, ring: pSpan(P.wizard, P.progress), click: { x: 195, y: P.wizard.y + 46 }, duration: 5500 },
  { screen: "welcome", url: U_WELCOME, scroll: 290, caption: "Step 6 of 8: Education", detail: "The Setup guide goes section by section - your family, then Personal, Health, Education, Employment and Admin. Tap a number to jump.", focus: pz(PWZ_TOP), ring: PWZ_TOP, duration: 7500 },
  { screen: "welcome", url: U_WELCOME, scroll: PWZ_H - 844, caption: "What's done, for each person", detail: "✓ complete, ◐ started, ✗ empty, — doesn't apply. Keep going opens the next folder - what you type saves straight into your Organiser.", focus: pz(PWZ_BOTTOM), ring: PWZ_BOTTOM, duration: 8000 },
  // The four stat cards
  { screen: "dash", url: UD, caption: "Records & Documents: 23", detail: "Everything you've stored. Tap to open The Adulting Life Organiser.", scroll: 560, focus: { x: 195, y: 900, scale: 1.08 }, ring: P.stat(0), click: mid(P.stat(0)), duration: 5000 },
  { screen: "organiser", url: UO, caption: "The Adulting Life Organiser", detail: "Every record for the whole family, in five sections. Expiring or expired shows anything due in the next 30 days.", focus: pz(PO_TOP), ring: PO_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Things expiring soon: 5", detail: "Tap to open Reminders.", scroll: 560, focus: { x: 195, y: 900, scale: 1.08 }, ring: P.stat(1), click: mid(P.stat(1)), duration: 4500 },
  { screen: "reminders", url: U_REM, caption: "Every date, in one list", detail: "Renewals and expiry dates from every folder - rego, insurance, licences, passports. Amber is Soon, red is Expired.", focus: pz(PRM_LIST), ring: PRM_LIST, duration: 7000 },
  { screen: "dash", url: UD, caption: "Tasks to complete: 4", detail: "Tap to open Tasks.", scroll: 560, focus: { x: 195, y: 900, scale: 1.08 }, ring: P.stat(2), click: mid(P.stat(2)), duration: 4500 },
  { screen: "tasks", url: U_TASKS, scroll: 140, caption: "Setup steps, then your own list", detail: "Your getting-started checklist - 7 of 9 done. Below it, add your own tasks with a due date and tick them off.", focus: pz(PTK_SETUP), ring: PTK_SETUP, duration: 7000 },
  { screen: "dash", url: UD, caption: "All good: 18", detail: "Records that are up to date, with nothing overdue. Tap to see them in the Organiser.", scroll: 560, focus: { x: 195, y: 900, scale: 1.08 }, ring: P.stat(3), click: mid(P.stat(3)), duration: 5000 },
  { screen: "organiser", url: UO, scroll: 400, caption: "How complete each section is", detail: "Personal, Health, Education, Employment and Admin - folders done across the family. Tap one to see every folder.", focus: pz(PO_CATS), ring: PO_CATS, duration: 7000 },
  // Further down
  { screen: "dash", url: UD, caption: "Organiser Overview", detail: "The same five sections: folders done and still missing.", scroll: 1000, focus: { x: 195, y: 1385, scale: 1.05 }, ring: P.overview, duration: 6000 },
  { screen: "dash", url: UD, caption: "Continue Learning", detail: "Your next lesson: Passport & Travel Documents. Tap to open Learn.", scroll: 1500, focus: pz(P.learn), ring: P.learn, click: mid(P.learn), duration: 5000 },
  { screen: "learn", url: U_LEARN, caption: "Learn: bite-sized lessons", detail: "Resume your lesson and see how far you've got. Learn progress, at the bottom of the dashboard, opens here too.", focus: pz(PLN_TOP), ring: PLN_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Recent activity", detail: "Uploads, updates and lessons from the whole family - and a cheer when you've been busy.", scroll: 2040, focus: { x: 195, y: 2420, scale: 1.05 }, ring: pSpan(P.activity, P.party), duration: 6000 },
  { screen: "dash", url: UD, caption: "Upcoming reminders", detail: "What's due in the next 60 days. Tap View all to see every one.", scroll: 2560, focus: { x: 195, y: 2860, scale: 1.08 }, ring: P.reminders, click: mid(P_VIEW_ALL), duration: 5500 },
  { screen: "reminders", url: U_REM, caption: "Your own reminders too", detail: "Add reminder for anything with a date - like Leo's dentist check-up. Custom ones can repeat yearly; Snooze or mark them Done.", focus: { x: 195, y: 420, scale: 1.2 }, ring: prmRow(REM_CUSTOM), duration: 7000 },
  { screen: "dash", url: UD, caption: "Next things to complete", detail: "Empty or half-done folders, important ones first. Tap Health Insurance Details & Statements.", scroll: 2700, focus: pz(P.missing), ring: P.missing, click: mid(P_MISS0), duration: 6000 },
  { screen: "folder", url: U_FOLDER, caption: "The folder's questions", detail: "Sarah's policy: provider, member number and level of cover. Upload & scan the policy and the details fill in for you.", focus: pz(PHI_TOP), ring: PHI_TOP, duration: 8000 },
  { screen: "folder", url: U_FOLDER, scroll: Math.min(PHI_PAGE_H - 844, PHI_DATES.y - 60), caption: "Dates become reminders", detail: "Renewal and review dates go straight into Reminders. Leave blank what you don't know yet and Save.", focus: pz(PHI_DATES), ring: PHI_DATES, duration: 8000 },
  { screen: "dash", url: UD, caption: "Quick Actions", detail: "Add Record, Upload Document, Scan Document or Add Reminder. Tap Add Record.", scroll: 3020, focus: { x: 195, y: P.quick.y + 150, scale: 1.08 }, ring: P.quick, click: mid(pQuick(0)), duration: 5500 },
  { screen: "addrec", url: U_ADDREC, caption: "Add a record: pick its folder", detail: "Choose where it belongs and the right questions are set up for you - or scan a document and AI fills them in.", focus: pz(PAR_TOP), ring: PAR_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Add Reminder", detail: "Tap Add Reminder.", scroll: 3020, focus: { x: 195, y: P.quick.y + 150, scale: 1.08 }, ring: pQuick(3), click: mid(pQuick(3)), duration: 4500 },
  { screen: "addrem", url: U_ADDREM, caption: "Add a reminder", detail: "Pick a passport, licence, rego or policy to update its expiry date - or Custom reminder for anything else with a date.", focus: pz(PAM_TOP), ring: PAM_TOP, duration: 7000 },
  { screen: "dash", url: UD, caption: "Need a hand? And your Planner", detail: "Ask TAL AI a question. Continue the Peace of Mind Planner, preview it, download or email the PDF, or nominate someone to view it.", scroll: 3380, focus: { x: 195, y: 3790, scale: 1.05 }, ring: pSpan(P.helper, P.pom), click: { x: P_SHIELD.x + 18, y: P_SHIELD.y + 18 }, duration: 7500 },
  { screen: "drawer", url: UD, caption: "The whole Planner is in the menu", detail: "Tap Peace of Mind Planner.", focus: { x: 150, y: 360, scale: 1.3 }, ring: { x: 12, y: dNavY(5), w: DRAWER_W - 24, h: 40 }, click: { x: 120, y: dNavY(5) + 20 }, duration: 4500 },
  { screen: "planner", url: U_PLANNER, scroll: Math.max(0, plP.end + 60 - 844), caption: "The Planner: what your family would need", detail: "Sections marked ↔ share their entries with your Organiser; wishes and letters live only here. Download it all as one PDF.", focus: pz(PPL_ALL), ring: PPL_ALL, duration: 7500 },
  // Round buttons
  { screen: "dash", url: UD, caption: "Two round buttons, on every page", detail: "? opens help for the page you're on. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 300, y: 780, scale: 1.6 }, ring: { x: P_FAB_R - 128, y: P_FAB_Y, w: 128, h: 56 }, click: { x: P_FAB_R - 100, y: P_FAB_Y + 28 }, duration: 7000 },
]

export default function DashboardWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer music="/audio/demo-music-upbeat.mp3" key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Your dashboard (phone)" : "Your dashboard (computer)"} url={UD} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Your dashboard", subtitle: "Everything at a glance - and how to find anything." }} />
  )
}
