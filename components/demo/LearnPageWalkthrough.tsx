"use client"

// "Learn" page walkthrough - the /learn page's walkthrough (tour) button
// (components/demo/PageWalkthroughFab). Hand-built copies of the real screens
// with a made-up family's sample data (the Taylors, Brisbane - Sarah's own
// learning) - no sign-in, no API calls. "Today" is Mon 23 Nov 2026.
// Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (lg: 7/3 columns)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers every control on /learn: the header, the resume card ("Continue
// where you left off"), the Adulting Pro card (Next lesson), Your Learning
// Paths (a category, and a finished one's "Certificate ready"), Browse by
// content type (Articles, Videos, Quizzes, Peace of Mind Planner, Downloads),
// the Learning streak, Recently earned badges (View all), Up next and the Ask
// TAL AI card - and clicks into each: a category (the articles / guides /
// quizzes pills), an article (videos with the Unseen / Watched key and the
// player, reading, Mark as read, the quiz card, Previous / Next, More in ...),
// a quiz (answer, progress, Submit answers, the result, a new badge), the
// Articles list (All / Read only, categories), Videos, Quizzes (Library /
// Taken / Passed) and a certificate.
// Copies: app/(app)/learn/page.tsx (CATEGORY_THEME, BROWSE_TYPES, counterFor,
// ResumePathCard, AdultingProCard), components/StreakCard (StreakCard,
// RecentBadgesCard, BadgeRow, badgeEmoji), lib/services/learnEngagement
// (BADGES, path % = articles read + quizzes passed), content/learning.ts
// (LEARNING_PATHS, GUIDES), content/course-articles.ts (titles, summaries,
// bodies, read times), app/(app)/learn/[category]/page.tsx (CATEGORY_ACCENT,
// SectionCard), .../article/[id]/page.tsx + VideoSection + VideoThumbnail +
// WatchedLegend + MarkContentRead, .../quiz/[id]/page.tsx + QuizRunner,
// components/CelebrationLayer, learn/articles, learn/videos, learn/quizzes,
// learn/certificate/[categoryId], templates/peace-of-mind-planner (top) +
// PdfActions, tal-ai + TalAiChat + AiDisclaimer, app/(app)/layout.tsx header,
// AppSidebar, HelpButton, TourFab.
// Made up (they live in the database): quiz questions, quiz descriptions,
// which articles have videos and the videos' titles.
// The shell and round buttons are copied from RemindersPageWalkthrough.
// If one of those changes, update the matching screen here.

import { type ReactNode } from "react"
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
const Thumb = ({ src, size, className = "rounded-xl ring-1 ring-white" }: { src: string; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`shrink-0 bg-white object-cover ${className}`} style={{ width: size, height: size }} />
)

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) })
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
const NAV_PLANNER = 5
const NAV_LEARN = 6
const NAV_TALAI = 7
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
// Article page's ClockIcon / TickIcon, VideoThumbnail's tick
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const TickIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const SmallTick = ({ size = 10, w = 3 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></svg>
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

const SB = 240
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
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
const Shell = ({ v, h, nav = NAV_LEARN, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>

// ── Content (content/learning.ts + course-articles.ts) ──────────────────────

type Cat = "personal" | "health" | "education" | "employment" | "admin"
const CATS: Cat[] = ["personal", "health", "education", "employment", "admin"]
const CAT_LABEL: Record<Cat, string> = { personal: "Personal", health: "Health", education: "Education", employment: "Employment", admin: "Admin & Bookkeeping" }
const catThumb = (c: Cat) => `/thumbnails/categories/${c}.png`
// learn/page CATEGORY_THEME
const THEME: Record<Cat, { bg: string; text: string; bar: string }> = {
  personal: { bg: "bg-violet-100 ring-violet-200", text: "text-violet-800", bar: "bg-violet-500" },
  health: { bg: "bg-amber-100 ring-amber-200", text: "text-amber-900", bar: "bg-amber-500" },
  education: { bg: "bg-sky-100 ring-sky-200", text: "text-sky-900", bar: "bg-sky-500" },
  employment: { bg: "bg-rose-100 ring-rose-200", text: "text-rose-900", bar: "bg-rose-500" },
  admin: { bg: "bg-emerald-100 ring-emerald-200", text: "text-emerald-900", bar: "bg-emerald-600" },
}
// learn/articles + learn/quizzes CATEGORY_TONE
const CHIP: Record<Cat, string> = {
  personal: "bg-violet-100 text-violet-800", health: "bg-amber-100 text-amber-800", education: "bg-sky-100 text-sky-800",
  employment: "bg-rose-100 text-rose-800", admin: "bg-emerald-100 text-emerald-800",
}

// The first eight Personal articles (title, summary, min read) - the lists
// stop there, before the Tax File Number article.
interface Art { t: string; s: string; m: number; read?: boolean; videos?: number }
const PERSONAL: Art[] = [
  { t: "The Adulting Life Information Form", s: "This is the foundation of your organiser, The first thing I would do is make a copy of this form so that you have a master copy, this information will evolve. I personally would make a copy of ALL the", m: 4, read: true },
  { t: "Birth Certificate", s: "Your birth certificate is a document that proves your name and when & where you were born.", m: 2, read: true },
  { t: "Marriage Certificate", s: "When / If you get married, this document proves it.", m: 1, read: true },
  { t: "Passport & Travel Documents", s: "Your passport is your ticket to travel the world!", m: 3, read: true, videos: 1 },
  { t: "Will & Funeral Instructions", s: "A will is a legal document that says what you want to happen with your money, property, and belongings after you pass away. It also helps decide who will look after things for you. Funeral instruction", m: 2, read: true },
  { t: "Power of Attorney Details", s: "A Power of Attorney (POA) grants someone the legal authority to make decisions on your behalf if you're unable to do so yourself. This could involve managing your finances or making healthcare decisio", m: 1, read: true },
  { t: "Advanced Health Directive", s: "An Advanced Health Directive, also known as an Advance Care Directive or Advance Care Plan, is like a medical will. It communicates your preferences for medical treatments if you’re ever unable to spe", m: 1 },
  { t: "Electoral Roll Number & Registered Address", s: "Once you turn 18, it’s time to enrol to vote.", m: 2 },
]
// Quiz descriptions are made up (quizzes live in the database; one per article, titled after it).
const PERSONAL_QUIZ_DESC = [
  "Why the information form is the foundation of your organiser.",
  "What a birth certificate proves and where to get a copy.",
  "When you'll need your marriage certificate.",
  "Passports, visas and keeping travel documents safe.",
  "What a will covers and why funeral wishes matter.",
  "What a Power of Attorney can and can't do.",
  "How a directive makes your health wishes known.",
  "Enrolling to vote and keeping your address current.",
]
const PERSONAL_GUIDE = { t: "Personal document checklist (PDF)", d: "A one-page list of the personal documents to keep on file." }

// Sarah's progress. Paths % = (articles read + quizzes passed) / (articles + quizzes),
// one quiz per article. Before: 25 of 59 read, 4 quizzes passed (all Health).
// After: Budgets read and its quiz passed.
interface PathRow { id: Cat; read: number; total: number; pct: number }
interface HubData {
  read: number; pct: number; paths: PathRow[]
  resume: { title: string; mins: number; next: string; done: number; pct: number }
  badges: string[] // earned, newest first
}
const TOTAL = 59
const HUB0: HubData = {
  read: 25, pct: 42,
  paths: [
    { id: "personal", read: 7, total: 14, pct: 25 }, { id: "health", read: 12, total: 12, pct: 67 }, { id: "education", read: 1, total: 7, pct: 7 },
    { id: "employment", read: 3, total: 11, pct: 14 }, { id: "admin", read: 2, total: 15, pct: 7 },
  ],
  resume: { title: "Budgets", mins: 1, next: "Investments & Deeds", done: 2, pct: 40 },
  badges: ["cat-health", "streak-3", "quiz-taker", "on-a-roll", "getting-started", "first-lesson"],
}
const HUB1: HubData = {
  ...HUB0, read: 26, pct: 44,
  paths: HUB0.paths.map((p) => (p.id === "admin" ? { ...p, read: 3, pct: 13 } : p)),
  resume: { title: "Investments & Deeds", mins: 1, next: "Superannuation Fund Statements", done: 3, pct: 60 },
  badges: ["quiz-ace", ...HUB0.badges],
}
const UP_NEXT = ["Electoral Roll Number & Registered Address", "TAL — List of Personal Accounts", "TAL — Vehicle Details & Copy of Registration Certificate"]

// lib/services/learnEngagement BADGES + StreakCard badgeEmoji
const BADGES: { id: string; label: string; e: string }[] = [
  { id: "first-lesson", label: "First Lesson", e: "✨" }, { id: "getting-started", label: "Getting Started", e: "🚀" },
  { id: "on-a-roll", label: "On A Roll", e: "📚" }, { id: "halfway", label: "Halfway There", e: "🎯" },
  { id: "graduated", label: "Adulting Graduate", e: "🎓" }, { id: "quiz-taker", label: "Quiz Taker", e: "✅" },
  { id: "quiz-ace", label: "Quiz Ace", e: "🥇" }, { id: "quiz-master", label: "Quiz Master", e: "🏆" },
  { id: "streak-3", label: "3-Day Streak", e: "🔥" }, { id: "streak-7", label: "7-Day Streak", e: "⚡" },
  { id: "streak-14", label: "Fortnight Focus", e: "💪" }, { id: "streak-30", label: "Monthly Habit", e: "🗓️" },
  { id: "cat-personal", label: "Personal Pro", e: "🙋" }, { id: "cat-health", label: "Health Pro", e: "🩺" },
  { id: "cat-education", label: "Education Pro", e: "✏️" }, { id: "cat-employment", label: "Employment Pro", e: "💼" },
  { id: "cat-admin", label: "Admin Pro", e: "📁" },
]
const badge = (id: string) => BADGES.find((b) => b.id === id)!

// ── Learn (learn/page) ───────────────────────────────────────────────────────

const BROWSE = [
  { k: "articles", l: "Articles", c: "59 available" }, { k: "videos", l: "Videos", c: "6 available" },
  { k: "quizzes", l: "Quizzes", c: "59 available" }, { k: "peace-of-mind-planner", l: "Peace of Mind Planner", c: "Explore" },
  { k: "downloads", l: "Downloads", c: "2 available" },
]

function hubLayout(v: V, open = false) {
  const P = v.phone, x = v.x
  const mw = P ? v.w : 620, ax = P ? v.x : v.x + 644, aw = P ? v.w : 252
  const hdr = { x, y: v.top, w: mw, h: P ? 152 : 92 }
  let y = hdr.y + hdr.h + 24
  const resume = { x, y, w: P ? v.w : 302, h: P ? 256 : 290 }
  const pro = P ? { x, y: y + 256 + 16, w: v.w, h: 184 } : { x: x + 318, y, w: 302, h: 290 }
  y = pro.y + pro.h + 24
  const pathsHead = { x, y, w: mw, h: 28 }; y += 28 + 12
  const ph = 196
  const py = y
  const path = (n: number): Rect => (P ? { x: x + (n % 2) * 193, y: py + Math.floor(n / 2) * (ph + 12), w: 181, h: ph } : { x: x + n * 126.5, y: py, w: 114, h: ph })
  y += (P ? 3 * ph + 24 : ph) + 24
  const tw = P ? 161 : 106.4, tH = P ? 140 : 172
  const browse = { x, y, w: mw, h: 60 + (P ? 3 * tH + 24 : tH) + 20 }
  const by = y
  const tile = (n: number): Rect => (P ? { x: x + 20 + (n % 2) * (tw + 12), y: by + 60 + Math.floor(n / 2) * (tH + 12), w: tw, h: tH } : { x: x + 20 + n * (tw + 12), y: by + 60, w: tw, h: tH })
  y = P ? browse.y + browse.h + 24 : v.top
  const streak = { x: ax, y, w: aw, h: 118 }; y += 118 + 16
  const nBadges = open ? 17 : 2
  const badges = { x: ax, y, w: aw, h: 60 + nBadges * 32 + (nBadges - 1) * 6 + 20 }
  const badgeRow = (n: number): Rect => ({ x: ax + 20, y: badges.y + 60 + n * 38, w: aw - 40, h: 32 })
  const viewAll = { x: ax + aw - 20 - 72, y: badges.y + 22, w: 72, h: 18 }
  y += badges.h + 16
  const next = { x: ax, y, w: aw, h: 60 + 3 * 62 + 16 + 20 }
  const nextRow = (n: number): Rect => ({ x: ax + 12, y: next.y + 60 + n * 70, w: aw - 24, h: 62 })
  const nextAll = { x: ax + aw - 20 - 60, y: next.y + 24, w: 60, h: 18 }
  y += next.h + 16
  const talai = { x: ax, y, w: aw, h: P ? 128 : 150 }
  const h = Math.max(v.H, browse.y + browse.h + 40, talai.y + talai.h + 40)
  const resumeBtn = { x: resume.x + 20, y: resume.y + resume.h - 20 - 36, w: 140, h: 36 }
  const proNext = { x: pro.x + pro.w - 20 - 100, y: pro.y + pro.h - 20 - 18, w: 100, h: 18 }
  const main = { x, y: v.top, w: mw, h: browse.y + browse.h - v.top }
  return { hdr, resume, resumeBtn, pro, proNext, pathsHead, path, browse, tile, streak, badges, badgeRow, viewAll, next, nextRow, nextAll, talai, main, h }
}

function Hub({ v, d = HUB0, open, fabs }: { v: V; d?: HubData; open?: boolean; fabs?: boolean }) {
  const L = hubLayout(v, open)
  const P = v.phone
  const earned = d.badges.map(badge)
  const locked = BADGES.filter((b) => !d.badges.includes(b.id))
  const rows = open ? [...earned.map((b) => ({ b, on: true })), ...locked.map((b) => ({ b, on: false }))] : earned.slice(0, 2).map((b) => ({ b, on: true }))
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.hdr} className="rounded-2xl border border-tal-line bg-tal-cream-soft px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Thumb src="/thumbnails/learn/adulting-hub.png" size={40} />
          <h1 className="font-display text-2xl leading-tight">The Adulting Life Unlocked</h1>
          {!P && <span className="text-tal-plum-soft/50">·</span>}
          <p className="text-sm text-tal-plum-soft">{P && <span className="mr-2 text-tal-plum-soft/50">·</span>}Practical lessons to help you navigate life with confidence.</p>
        </div>
      </Box>
      {/* ResumePathCard */}
      <Box {...L.resume} className={`flex flex-col rounded-2xl p-5 ring-1 ${THEME.admin.bg}`}>
        <p className={`mb-1 text-[10px] font-medium uppercase tracking-widest ${THEME.admin.text}`}>Continue where you left off</p>
        <p className="mb-2 text-xs text-tal-plum-soft">Money basics · Admin &amp; Bookkeeping</p>
        <div className="flex items-start gap-3">
          <Thumb src={catThumb("admin")} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight">{d.resume.title}</p>
            <p className="mt-1 text-xs text-tal-plum-soft">{d.resume.mins} min read</p>
            <p className="mt-1 truncate text-xs text-tal-plum-soft">Next up: {d.resume.next}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className={`h-full ${THEME.admin.bar}`} style={{ width: `${d.resume.pct}%` }} /></div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-tal-plum-soft"><span>{d.resume.done} of 5 lessons complete</span><span className="font-medium">{d.resume.pct}%</span></div>
        <span className="mt-auto inline-flex h-9 w-[140px] items-center justify-center gap-2 rounded-lg bg-black text-sm font-medium text-white">Resume lesson →</span>
      </Box>
      {/* AdultingProCard */}
      <Box {...L.pro} className="flex flex-col overflow-hidden rounded-2xl bg-tal-cream p-5 ring-1 ring-tal-cream">
        <span className="absolute right-4 top-4 text-2xl">🏆</span>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-widest">Keep going</p>
        <p className="pr-8 font-display text-xl leading-tight">You&apos;re becoming an Adulting Pro!</p>
        <div className="mt-4 flex items-baseline gap-2"><span className="font-display text-2xl leading-none">{d.pct}%</span><span className="text-sm text-tal-plum-soft">complete</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-gradient-to-r from-violet-500 to-tal-plum" style={{ width: `${d.pct}%` }} /></div>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs"><span className="text-tal-plum-soft">{d.read} of {TOTAL} lessons read</span><span className="shrink-0 font-medium">Next lesson →</span></div>
      </Box>
      <Box {...L.pathsHead} className="flex items-baseline justify-between"><span className="font-display text-xl">Your Learning Paths</span><span className="text-xs text-tal-plum-soft">{d.read} of {TOTAL} lessons complete</span></Box>
      {d.paths.map((p, n) => {
        const done = p.read >= p.total
        return (
          <Box key={p.id} {...L.path(n)} className={`flex flex-col rounded-2xl p-4 ring-1 ${THEME[p.id].bg}`}>
            <Thumb src={catThumb(p.id)} size={48} />
            <p className={`mt-2 text-sm font-medium leading-tight ${THEME[p.id].text}`}>{CAT_LABEL[p.id]}</p>
            <p className="mt-0.5 text-[11px] text-tal-plum-soft">{p.total} lessons</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70"><div className={`h-full ${THEME[p.id].bar}`} style={{ width: `${p.pct}%` }} /></div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-tal-plum-soft"><span>{p.read}/{p.total}</span><span className="font-medium">{p.pct}%</span></div>
            {done && <span className="mt-2 inline-flex items-center gap-1 self-start rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium">🏆 Certificate ready</span>}
          </Box>
        )
      })}
      <Box {...L.browse} className="rounded-2xl border border-tal-line bg-white p-5"><p className="font-display text-xl">Browse by content type</p></Box>
      {BROWSE.map((t, n) => (
        <Box key={t.k} {...L.tile(n)} className="flex flex-col items-center gap-2 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4 text-center">
          <Thumb src={`/thumbnails/learn/${t.k}.png`} size={48} />
          <span className="text-sm font-medium leading-snug">{t.l}</span>
          <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft">{t.c}</span>
        </Box>
      ))}
      {/* StreakCard */}
      <Box {...L.streak} className="rounded-2xl bg-amber-100 p-5 ring-1 ring-amber-200">
        <div className="flex items-start justify-between">
          <div><p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-amber-900">Learning streak</p><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl leading-none text-amber-900">5</span><span className="text-sm text-amber-900/80">days</span></div></div>
          <span className="text-3xl">🔥</span>
        </div>
        <p className="mt-1 text-xs text-amber-900/80">Longest: 12 days</p>
      </Box>
      {/* RecentBadgesCard */}
      <Box {...L.badges} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="flex items-baseline justify-between"><span className="font-display text-lg">Recently earned</span><span className="text-xs text-tal-plum-soft">{open ? "Show less" : "View all 17"}</span></div>
      </Box>
      {rows.map(({ b, on }, n) => (
        <Box key={b.id} {...L.badgeRow(n)} className={`flex items-center gap-2 rounded-lg px-2.5 ${on ? "bg-tal-cream-soft" : "bg-tal-cream-soft/40"}`}>
          <span className="text-sm">{b.e}</span><span className={`truncate text-xs font-medium ${on ? "" : "text-tal-plum-soft/60"}`}>{b.label}</span>
        </Box>
      ))}
      {/* Up next */}
      <Box {...L.next} className="rounded-2xl border border-tal-line bg-white p-5">
        <div className="flex items-center justify-between"><span className="font-display text-lg">Up next</span><span className="text-xs text-tal-plum-soft">View all →</span></div>
      </Box>
      {UP_NEXT.map((t, n) => (
        <Box key={t} {...L.nextRow(n)} className="flex items-center gap-3 rounded-xl px-2">
          <Thumb src={catThumb("personal")} size={40} className="rounded-lg ring-1 ring-white" />
          <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium leading-snug">{t}</p><p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Personal</p></div>
          <span className="text-tal-plum-soft">→</span>
        </Box>
      ))}
      <Box {...L.talai} className="rounded-2xl border border-tal-line bg-tal-cream-soft p-5">
        <div className="flex items-start gap-3">
          <Thumb src="/thumbnails/learn/tal-ai.png" size={44} />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">Ask TAL AI</p>
            <p className="font-medium leading-snug">Stuck on something?</p>
            <p className="mt-1 text-xs text-tal-plum-soft">Ask about anything you&apos;ve just read — TAL AI can explain, summarise or dig deeper.</p>
          </div>
        </div>
      </Box>
      {fabs && <Fabs {...FAB(v)} />}
    </Shell>
  )
}

// ── A category (learn/[category]) - Personal ────────────────────────────────

type Sec = "articles" | "guides" | "quizzes"
function catLayout(v: V, open: Sec) {
  const P = v.phone, x = v.x
  const back = { x, y: v.top, w: 64, h: 20 }
  const bar = { x, y: v.top + 36, w: v.w, h: P ? 108 : 72 }
  const pw = [88, 64, 86]
  const pills = pw.map((w, i) => {
    const px = (P ? x + 24 : x + 296) + pw.slice(0, i).reduce((a, b) => a + b + 8, 0)
    return { x: px, y: P ? bar.y + 68 : bar.y + 24, w, h: 24 }
  })
  const cw = P ? v.w - 48 : (v.w - 48 - 12) / 2
  const tLines = (t: string) => wrapLines(t, cw - 36 - (t.length > 20 ? 70 : 0), 7.6)
  const cardH = (t: string, s: string) => 16 + tLines(t) * 22 + 8 + wrapLines(s, cw - 36, 7) * 20 + 12 + 20 + 16 + 4
  const grid = (hs: number[]) => {
    const out: Rect[] = []
    let y = 0
    if (P) hs.forEach((h) => { out.push({ x: x + 24, y, w: cw, h }); y += h + 12 })
    else for (let i = 0; i < hs.length; i += 2) {
      const rh = Math.max(hs[i], hs[i + 1] ?? 0)
      out.push({ x: x + 24, y, w: cw, h: rh })
      if (i + 1 < hs.length) out.push({ x: x + 24 + cw + 12, y, w: cw, h: rh })
      y += rh + 12
    }
    return { cells: out, h: y - 12 }
  }
  const arts = grid(PERSONAL.map((a) => cardH(a.t, a.s)))
  const guides = grid([cardH(PERSONAL_GUIDE.t, PERSONAL_GUIDE.d)])
  const quizzes = grid(PERSONAL.map((a, i) => cardH(a.t, PERSONAL_QUIZ_DESC[i])))
  let y = bar.y + bar.h + 24
  const secs: Record<Sec, { r: Rect; body: Rect[] }> = {} as Record<Sec, { r: Rect; body: Rect[] }>
  for (const [k, g] of [["articles", arts], ["guides", guides], ["quizzes", quizzes]] as const) {
    const isOpen = k === open
    const h = 72 + (isOpen ? 4 + g.h + 24 : 0)
    secs[k] = { r: { x, y, w: v.w, h }, body: isOpen ? g.cells.map((c) => ({ ...c, y: c.y + y + 76 })) : [] }
    y += h + 16
  }
  return { back, bar, pills, secs, h: Math.max(v.H, y + 40) }
}
function CatPage({ v, open }: { v: V; open: Sec }) {
  const L = catLayout(v, open)
  const P = v.phone
  const labels = ["14 articles", "1 guide", "14 quizzes"]
  const keys: Sec[] = ["articles", "guides", "quizzes"]
  const card = "flex flex-col rounded-2xl border-2 border-tal-line bg-white p-4"
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.back} className="text-sm text-tal-plum-soft">← Learn</Box>
      <Box {...L.bar} className="rounded-2xl bg-violet-700 shadow-md" />
      <Box x={L.bar.x + 24} y={L.bar.y + 16} w={300} h={40} className="flex items-center gap-3 text-white">
        <Thumb src={catThumb("personal")} size={40} />
        <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tal-plum">Learn</span>
        <span className="font-display text-2xl leading-tight">Personal</span>
        {!P && <span className="mx-1 text-white/40">·</span>}
      </Box>
      {L.pills.map((p, i) => (
        <Box key={i} {...p} className={`flex items-center justify-center rounded-full text-xs font-medium ${keys[i] === open ? "bg-white text-violet-800" : "bg-violet-50 text-violet-800"}`}>{labels[i]}</Box>
      ))}
      {keys.map((k) => {
        const s = L.secs[k]
        const title = k === "articles" ? "Articles" : k === "guides" ? "Guides & forms" : "Quizzes"
        const count = k === "guides" ? 1 : 14
        return (
          <Box key={k} {...s.r} className="overflow-hidden rounded-3xl border border-tal-line bg-white">
            <div className="flex h-[72px] items-center justify-between px-6">
              <div className="flex items-center gap-3"><span className="font-display text-2xl">{title}</span><span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">{count}</span></div>
              <span className={`text-sm text-tal-plum-soft ${k === open ? "rotate-180" : ""}`}>▾</span>
            </div>
          </Box>
        )
      })}
      {open === "articles" && L.secs.articles.body.map((r, i) => {
        const a = PERSONAL[i]
        return (
          <Box key={a.t} {...r} className={card}>
            <div className="mb-2 flex items-start gap-3"><span className="min-w-0 flex-1 font-medium leading-snug">{a.t}</span>{a.videos && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">{a.videos} video</span>}</div>
            <p className="flex-1 text-sm text-tal-plum-soft">{a.s}</p>
            <div className="mt-3 flex items-center justify-between"><span className="text-[11px] font-medium text-tal-plum-soft">{a.m} min read</span><span className="text-sm font-medium text-violet-700">Read →</span></div>
          </Box>
        )
      })}
      {open === "guides" && L.secs.guides.body.map((r) => (
        <Box key="g" {...r} className={card}>
          <p className="mb-2 font-medium leading-snug">{PERSONAL_GUIDE.t}</p>
          <p className="flex-1 text-sm text-tal-plum-soft">{PERSONAL_GUIDE.d}</p>
          <p className="mt-3 text-sm font-medium text-violet-700">Download</p>
        </Box>
      ))}
      {open === "quizzes" && L.secs.quizzes.body.map((r, i) => (
        <Box key={i} {...r} className={card}>
          <p className="mb-2 font-medium leading-snug">{PERSONAL[i].t}</p>
          <p className="flex-1 text-sm text-tal-plum-soft">{PERSONAL_QUIZ_DESC[i]}</p>
          <p className="mt-3 text-sm font-medium text-violet-700">Start quiz →</p>
        </Box>
      ))}
    </Shell>
  )
}

// ── An article (learn/[category]/article/[id]) ───────────────────────────────

interface Video { t: string; d: string; art: string; cat: Cat; watched?: boolean }
const V_BUDGET1: Video = { t: "Building your first budget", d: "Income, needs, wants and savings — step by step.", art: "Budgets", cat: "admin" }
const V_BUDGET2: Video = { t: "Tracking your spending", d: "A five-minute weekly check-in to stay on plan.", art: "Budgets", cat: "admin" }
const VIDEOS: Video[] = [
  { t: "Applying for your first passport", d: "Forms, photos and how long it takes.", art: "Passport & Travel Documents", cat: "personal", watched: true },
  { t: "Understanding your health cover", d: "Hospital vs extras, waiting periods and the gap.", art: "Health Insurance Details", cat: "health", watched: true },
  { t: "Reading your blood test results", d: "What the common markers mean and what to ask your GP.", art: "Blood Test Results", cat: "health" },
  { t: "Writing a resume that gets read", d: "Layout, length and what to leave off.", art: "Resume", cat: "employment" },
  V_BUDGET1, V_BUDGET2,
]
interface ArtSpec {
  cat: Cat; title: string; summary: string; mins: number; thumb: string
  videos: Video[]; body: string[]; quiz: string; prev: string; next: string; more: string[]; current: number
}
const A_BUDGETS: ArtSpec = {
  cat: "admin", title: "Budgets", mins: 1, thumb: "/thumbnails/subcategories/admin.budgets.png",
  summary: "A budget is a plan that outlines how you intend to spend and save your money each month, acting as a roadmap to help you manage your cash flow. It provides a clear picture of your income and expenses,",
  videos: [V_BUDGET1, V_BUDGET2],
  body: [
    "A budget is a plan that outlines how you intend to spend and save your money each month, acting as a roadmap to help you manage your cash flow. It provides a clear picture of your income and expenses, making it easier to allocate funds toward the things that matter most, whether that’s covering essential bills or putting money aside for future goals.",
    "This section was included in your organiser to help you stay in control of your finances and avoid running out of money before the end of the month.",
    "A budget helps you find the right balance between spending on fun things, like social events and online shopping, and meeting financial responsibilities, such as rent, bills, and savings. It ensures that you don’t have to sacrifice the things you enjoy while still making progress toward long-term goals, like saving for a holiday or building an emergency fund.",
    "Using this section allows you to track your income and expenses, giving you a better understanding of where your money is going. This insight helps you make smarter financial decisions, such as identifying areas where you can cut back or finding opportunities to save more.",
    "By regularly reviewing and adjusting your budget, you can stay on top of any changes in your financial situation, such as a pay rise or unexpected expenses, without stress.",
    "To use this section effectively, update your budget each month by listing your income and setting limits for different expense categories, like groceries, entertainment, and savings.",
    "Tracking your spending throughout the month will keep you accountable and help you stick to your plan.",
    "With a well-maintained budget, you can enjoy your money confidently, knowing that you’re covering your essentials and still leaving room for the things that make life fun.",
  ],
  quiz: "Budgets", prev: "Loan Statements", next: "Investments & Deeds",
  more: ["Bank Statements", "Loan Statements", "Budgets", "Investments & Deeds", "Superannuation Fund Statements", "Property Records"], current: 2,
}
const A_AHD: ArtSpec = {
  cat: "personal", title: "Advanced Health Directive", mins: 1, thumb: "/thumbnails/subcategories/personal.advanced_health_directive.png",
  summary: PERSONAL[6].s, videos: [],
  body: [
    "An Advanced Health Directive, also known as an Advance Care Directive or Advance Care Plan, is like a medical will. It communicates your preferences for medical treatments if you’re ever unable to speak for yourself, such as after a serious accident. This ensures that your health wishes are respected, even when you can’t express them.",
    "In Australia, each state and territory has specific laws and forms for creating an Advanced Health Directive. You can find these resources on government websites, such as the NT Government’s site for Advance Care Directives.",
    "It's important to understand what an Advanced Health Directive entails, including the types of medical treatments and interventions you may want to accept or refuse. Once you’ve created your directive, share it with family members, your healthcare provider, and anyone else involved in your care to ensure everyone is aware of your wishes.",
    "By taking these steps, you ensure that your healthcare choices are clear and respected, giving you and your loved ones peace of mind.",
  ],
  quiz: "Advanced Health Directive", prev: "Power of Attorney Details", next: "Electoral Roll Number & Registered Address",
  more: PERSONAL.slice(0, 6).map((a) => a.t), current: -1,
}
const ACCENT: Record<Cat, { pill: string; bar: string }> = {
  personal: { pill: "bg-violet-100 text-violet-800", bar: "bg-violet-500" }, health: { pill: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  education: { pill: "bg-sky-100 text-sky-800", bar: "bg-sky-500" }, employment: { pill: "bg-rose-100 text-rose-800", bar: "bg-rose-500" },
  admin: { pill: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-600" },
}

function artLayout(v: V, sp: ArtSpec) {
  const P = v.phone, x = v.x
  const crumbs = { x, y: v.top, w: v.w, h: 20 }
  const hdr = { x, y: v.top + 32, w: v.w, h: P ? 104 : 112 }
  const lw = P ? v.w : 589
  let y = hdr.y + hdr.h + 24
  // VideoSection: mt-10 heading, the key, then the videos
  let videos: Rect | null = null
  const vids: { thumb: Rect; mark: Rect; item: Rect }[] = []
  let legend: Rect | null = null
  if (sp.videos.length) {
    const inner = lw - 34
    const legendH = P ? 120 : 84
    legend = { x: x + 17, y: y + 16 + 40 + 36, w: inner, h: legendH }
    const vw = P ? inner : (inner - 24) / 2
    const th = Math.round((vw * 9) / 16)
    let vy = legend.y + legendH + 16
    sp.videos.forEach((vd, i) => {
      const vx = P ? x + 17 : x + 17 + (i % 2) * (vw + 24)
      if (!P && i % 2 === 1) vy -= th + 20 + 32 + 44 + 24
      const ih = th + 20 + 32 + wrapLines(vd.d, vw, 7) * 20 + 4
      vids.push({ thumb: { x: vx, y: vy, w: vw, h: th }, mark: { x: vx, y: vy + th + 4, w: 110, h: 16 }, item: { x: vx, y: vy, w: vw, h: ih } })
      vy += th + 20 + 32 + 44 + 24
    })
    videos = { x, y, w: lw, h: vy - 24 - y + 16 }
    y += videos.h + 24
  }
  const tw = lw - (P ? 48 : 64) - 2
  const paras = sp.body.map((p) => wrapLines(p, tw, 7.3) * 26)
  const body = { x, y, w: lw, h: (P ? 48 : 64) + paras.reduce((a, b) => a + b, 0) + (paras.length - 1) * 16 + 2 }
  y += body.h + 24
  const descLines = wrapLines("Test your knowledge with a quick quiz, or move on to the next article.", lw - 48 - 64, 7)
  const titleLines = wrapLines("Nice one — you've finished this article.", lw - 48 - 64, 9)
  const textH = titleLines * 28 + 2 + descLines * 20 + 16 + 40
  const finish = { x, y, w: lw, h: 24 + textH + 16 + 88 + 24 }
  const markBtn = { x: x + 24 + 64, y: y + 24 + titleLines * 28 + 2 + descLines * 20 + 16, w: 124, h: 40 }
  const quizCard = { x: x + 24, y: y + 24 + textH + 16, w: P ? lw - 48 : (lw - 48 - 16) / 3, h: 88 }
  y += finish.h + 24
  const navW = P ? lw : (lw - 12) / 2
  const prev = { x, y, w: navW, h: 76 }
  const next = P ? { x, y: y + 88, w: lw, h: 76 } : { x: x + navW + 12, y, w: navW, h: 76 }
  y = next.y + next.h + 24
  const ax = P ? x : x + lw + 24, aw = P ? v.w : v.w - lw - 24
  const itemH = sp.more.map((t) => wrapLines(t, aw - 64, 6.4) * 20 + 16)
  const aside = { x: ax, y: P ? y : hdr.y + hdr.h + 24, w: aw, h: 20 + 24 + itemH.reduce((a, b) => a + b, 0) + 5 * 8 + 12 + 16 + 20 }
  const moreRow = (n: number): Rect => ({ x: ax + 20, y: aside.y + 44 + itemH.slice(0, n).reduce((a, b) => a + b + 8, 0), w: aw - 40, h: itemH[n] })
  const h = Math.max(v.H, (P ? aside.y + aside.h : next.y + next.h) + 40, aside.y + aside.h + 40)
  return { crumbs, hdr, videos, legend, vids, body, finish, markBtn, quizCard, prev, next, aside, moreRow, h }
}
function VideoThumb({ r, vd, watched, playable = true }: { r: Rect; vd: Video; watched: boolean; playable?: boolean }) {
  return (
    <Box {...r} className="overflow-hidden rounded-xl border border-tal-line bg-black">
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-tal-plum to-black"><span className="text-xs uppercase tracking-widest text-white/50">Video</span></div>
      {playable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/90 shadow-lg"><svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 text-white" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg></div>
        </div>
      )}
      <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ${watched ? "bg-green-600" : "bg-red-600"}`}>
        {watched ? <SmallTick /> : <span className="inline-block h-2 w-2 rounded-full bg-white" />}{watched ? "Watched" : "Unseen"}
      </span>
      <span className="sr-only">{vd.t}</span>
    </Box>
  )
}
function Legend({ r }: { r: Rect }) {
  return (
    <Box {...r} className="flex flex-wrap content-start items-center gap-4 rounded-xl border border-tal-line bg-white px-4 py-3 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-tal-plum-soft">Key</span>
      <span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"><span className="inline-block h-2 w-2 rounded-full bg-white" />Unseen</span><span className="text-tal-plum-soft">You haven&apos;t watched this yet</span></span>
      <span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"><SmallTick />Watched</span><span className="text-tal-plum-soft">Played to the end, or you&apos;ve marked it watched</span></span>
    </Box>
  )
}
function ArticlePage({ v, sp, watched = false, read = false, player, playerY = 0 }: { v: V; sp: ArtSpec; watched?: boolean; read?: boolean; player?: boolean; playerY?: number }) {
  const L = artLayout(v, sp)
  const P = v.phone
  const quizzes = sp.quiz ? "Test your knowledge with a quick quiz, or move on to the next article." : "Ready for the next one?"
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.crumbs} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Learn</span><span className="text-tal-plum-soft/50">/</span><span>{CAT_LABEL[sp.cat]}</span></Box>
      <Box {...L.hdr} className="flex items-center gap-4 rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <Thumb src={sp.thumb} size={P ? 64 : 80} className="rounded-xl bg-white ring-2 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl leading-tight">{sp.title}</p>
          <p className="mt-1 truncate text-sm text-white/70">{sp.summary}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90"><ClockIcon />{sp.mins} min read</span>
        </div>
      </Box>
      {L.videos && L.legend && (
        <>
          <Box {...L.videos} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={L.videos.x + 17} y={L.videos.y + 56} w={200} h={24} className="font-display">Videos</Box>
          <Legend r={L.legend} />
          {sp.videos.map((vd, i) => {
            const it = L.vids[i]
            const w = i === 0 ? watched : false
            return (
              <div key={vd.t}>
                <VideoThumb r={it.thumb} vd={vd} watched={w} />
                <Box {...it.mark} className="text-xs text-tal-plum-soft underline">{w ? "Mark as unwatched" : "Mark as watched"}</Box>
                <Box x={it.item.x} y={it.thumb.y + it.thumb.h + 28} w={it.item.w} h={80}>
                  <p className="font-medium">{vd.t}</p>
                  <p className="mt-0.5 text-sm text-tal-plum-soft">{vd.d}</p>
                </Box>
              </div>
            )
          })}
        </>
      )}
      <Box {...L.body} className={`space-y-4 rounded-2xl border border-tal-line bg-white leading-relaxed shadow-sm ${P ? "p-6" : "p-8"}`}>
        {sp.body.map((p, i) => <p key={i}>{p}</p>)}
      </Box>
      <Box {...L.finish} className="rounded-2xl border border-tal-line bg-gradient-to-br from-white to-tal-cream-soft p-6">
        <div className="flex items-start gap-4">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ACCENT[sp.cat].pill}`}><TickIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-7">Nice one — you&apos;ve finished this article.</p>
            <p className="mt-0.5 text-sm text-tal-plum-soft">{quizzes}</p>
          </div>
        </div>
      </Box>
      {read
        ? <Box x={L.markBtn.x} y={L.markBtn.y} w={160} h={40} className="flex items-center gap-2 text-sm font-medium text-emerald-700"><SmallTick size={16} w={2.5} />Marked as read</Box>
        : <Box {...L.markBtn} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Mark as read</Box>}
      <Box {...L.quizCard} className="flex flex-col rounded-xl border border-tal-line bg-white p-3">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">Quiz 1</p>
        <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug">{sp.quiz}</p>
        <p className="mt-2 text-xs font-medium">Take it →</p>
      </Box>
      <Box {...L.prev} className="rounded-2xl border border-tal-line bg-white p-4"><p className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">← Previous</p><p className="font-medium leading-snug">{sp.prev}</p></Box>
      <Box {...L.next} className="rounded-2xl border border-tal-line bg-white p-4 text-right"><p className="mb-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">Next →</p><p className="truncate font-medium leading-snug">{sp.next}</p></Box>
      <Box {...L.aside} className="rounded-2xl bg-black p-5 text-white shadow-md">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/60">More in {CAT_LABEL[sp.cat]}</p>
      </Box>
      {sp.more.map((t, n) => (
        <Box key={t} {...L.moreRow(n)} className={`rounded-lg px-3 py-2 text-sm leading-5 ${n === sp.current ? "bg-white/10 font-medium text-white" : "text-white/80"}`}>{t}</Box>
      ))}
      <Box x={L.aside.x + 20} y={L.aside.y + L.aside.h - 36} w={80} h={16} className="text-xs text-white/70">View all →</Box>
      {player && <Player v={v} y={playerY} title={sp.videos[0]?.t ?? ""} />}
    </Shell>
  )
}
// VideoThumbnail's Lightbox, playing.
const playerRect = (v: V, y: number): Rect => {
  const w = v.phone ? v.W - 32 : v.W - 64 - 200
  const h = Math.round((w * 9) / 16)
  return { x: (v.W - w) / 2, y: y + Math.round((v.H - h) / 2), w, h }
}
function Player({ v, y, title }: { v: V; y: number; title: string }) {
  const r = playerRect(v, y)
  return (
    <>
      <Box x={0} y={y} w={v.W} h={v.H} className="bg-black/85" />
      <Box x={r.x + r.w - 80} y={r.y - 32} w={80} h={20} className="flex items-center justify-end gap-2 text-sm text-white/80">Close <span>✕</span></Box>
      <Box {...r} className="overflow-hidden rounded-xl bg-gradient-to-br from-tal-plum to-black shadow-2xl">
        <div className="absolute inset-0 flex items-center justify-center"><Thumb src="/thumbnails/subcategories/admin.budgets.png" size={v.phone ? 72 : 140} className="rounded-2xl opacity-90" /></div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-xs text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          <span>1:42</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><div className="h-full w-[35%] bg-white" /></div>
          <span>4:50</span>
        </div>
      </Box>
      <Box x={r.x} y={r.y + r.h + 12} w={r.w} h={20} className="text-sm text-white/90">{title}</Box>
    </>
  )
}

// ── A quiz (learn/[category]/quiz/[id] + QuizRunner) ─────────────────────────

// Made up: the real questions are generated per article and stored in the database.
const QUESTIONS: { q: string; o: string[] }[] = [
  { q: "What is a budget?", o: ["A plan for how you'll spend and save your money each month", "A list of everything you bought last year", "A loan from your bank", "A savings account with a higher interest rate"] },
  { q: "How often should you update your budget?", o: ["Once a year, at tax time", "Each month", "Only when you get a pay rise", "Never — set it once and leave it"] },
  { q: "Which of these is an essential expense?", o: ["Concert tickets", "Online shopping", "Rent", "A new phone case"] },
  { q: "Why track your spending during the month?", o: ["It keeps you accountable and helps you stick to your plan", "Your bank needs a copy", "So you can spend more on fun things", "It isn't needed if you have a budget"] },
]
const QUIZ_DESC = "Check you know how a monthly budget keeps your money on track."
// Sarah's answers (index per question) - she gets Q2 wrong: 3 / 4.
const PICKS = [0, 2, 2, 0]

function quizLayout(v: V) {
  const P = v.phone, x = v.x, w = P ? v.w : 672
  const back = { x, y: v.top, w: 180, h: 20 }
  const hdr = { x, y: v.top + 36, w, h: P ? 140 : 92 }
  const y0 = hdr.y + hdr.h + 24
  const bar = P ? { x: 0, y: y0, w: v.W, h: 64 } : { x: x - 16, y: y0, w: w + 32, h: 64 }
  let y = y0 + 64 + 20
  const inner = w - 44
  const qs = QUESTIONS.map((q) => {
    const promptH = wrapLines(q.q, inner, 9.4) * 28
    const optTop = y + 10 + 20 + 12 + promptH + 16
    let oy = optTop
    const opts = q.o.map((o) => {
      const lines = wrapLines(o, inner - 24 - 32 - 12, 7.8)
      const h = Math.max(32, lines * 24) + 24 + 4
      const r = { x: x + 22, y: oy, w: inner, h }
      oy += h + 8
      return r
    })
    const box = { x, y: y + 10, w, h: oy - 8 + 22 - (y + 10) }
    const legend = { x: x + 16, y, w: 104, h: 22 }
    const r = { box, legend, opts, top: y }
    y = box.y + box.h + 20
    return r
  })
  const submit = { x, y, w, h: 48 }
  const result = { x, y: y0, w, h: P ? 330 : 304 }
  const tryAgain = { x: x + w / 2 - 58, y: y0 + result.h - 32 - 40, w: 116, h: 40 }
  return { back, hdr, bar, qs, submit, result, tryAgain, h: Math.max(v.H, submit.y + 48 + 60), y0 }
}
function QuizPage({ v, answered = 0, result, badgeModal }: { v: V; answered?: number; result?: boolean; badgeModal?: boolean }) {
  const L = quizLayout(v)
  const P = v.phone
  const pct = Math.round((answered / 4) * 100)
  const h = result ? v.H : L.h
  return (
    <Shell v={v} h={h}>
      <Box {...L.back} className="text-sm text-tal-plum-soft">← Admin &amp; Bookkeeping</Box>
      <Box {...L.hdr} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Quiz</span>
          <span className="font-display text-2xl leading-tight">Budgets</span>
          <span className="text-white/40">·</span>
          <span className="text-sm text-white/80">{QUIZ_DESC}</span>
          <span className="text-white/40">·</span>
          <span className="text-sm text-white/70">4 questions</span>
        </div>
      </Box>
      {result ? (
        <>
          <Box {...L.result} className="rounded-3xl border-2 border-tal-cream bg-gradient-to-br from-tal-cream-soft to-tal-cream p-8 text-center shadow-lg">
            <div className="mb-3 text-6xl">📚</div>
            <p className="mb-2 font-display text-3xl">3 / 4</p>
            <p className="mb-3 text-lg font-medium">75%</p>
            <p className="text-sm text-tal-plum-soft">Not bad. Have another read of the article and try again.</p>
          </Box>
          <Box {...L.tryAgain} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 12a8 8 0 1 1 2.34 5.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M4 20v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Try again
          </Box>
          {badgeModal && <BadgeModal v={v} />}
        </>
      ) : (
        <>
          <Box {...L.bar} className={`border border-tal-line bg-white/90 px-4 py-3 shadow-sm ${P ? "" : "rounded-2xl"}`}>
            <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-medium">{answered} of 4 answered</span><span className="text-sm text-tal-plum-soft">{pct}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-gradient-to-r from-tal-forest to-tal-plum" style={{ width: `${pct}%` }} /></div>
          </Box>
          {L.qs.map((q, i) => {
            const done = i < answered
            return (
              <div key={i}>
                <Box {...q.box} className={`rounded-2xl border-2 bg-white ${done ? "border-tal-forest/40" : "border-tal-line"}`} />
                <Box {...q.legend} className="flex items-center justify-center rounded-full bg-black text-xs font-medium uppercase tracking-wider text-white">Question {i + 1}</Box>
                <Box x={q.box.x + 22} y={q.box.y + 32} w={q.box.w - 44} h={q.opts[0].y - q.box.y - 48} className="text-lg font-medium leading-7">{QUESTIONS[i].q}</Box>
                {q.opts.map((r, k) => {
                  const sel = done && PICKS[i] === k
                  return (
                    <Box key={k} {...r} className={`flex items-center gap-3 rounded-xl border-2 p-3 ${sel ? "border-tal-forest bg-tal-forest/5" : "border-tal-line bg-white"}`}>
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${sel ? "bg-tal-forest text-white" : "bg-tal-cream-soft text-black"}`}>{String.fromCharCode(65 + k)}</span>
                      <span className={`text-black ${sel ? "font-medium" : ""}`}>{QUESTIONS[i].o[k]}</span>
                    </Box>
                  )
                })}
              </div>
            )
          })}
          <Box {...L.submit} className={`flex items-center justify-center rounded-xl bg-gradient-to-r from-tal-plum to-tal-plum-dark px-3 text-center font-medium text-white ${answered < 4 ? "opacity-60" : ""}`}>
            {answered < 4 ? `Answer all questions to submit (${4 - answered} left)` : "Submit answers"}
          </Box>
        </>
      )}
    </Shell>
  )
}
// CelebrationLayer: "New badge earned" with falling confetti (positions fixed so they're the same each play).
const CONFETTI = ["#a78bfa", "#fbbf24", "#38bdf8", "#fb7185", "#34d399", "#f9a8d4"]
const badgeModalRect = (v: V): Rect => (v.phone ? { x: 16, y: 270, w: 358, h: 290 } : { x: 408, y: 230, w: 384, h: 290 })
const niceOneRect = (v: V): Rect => { const r = badgeModalRect(v); return { x: r.x + r.w / 2 - 54, y: r.y + r.h - 32 - 40, w: 108, h: 40 } }
function BadgeModal({ v }: { v: V }) {
  const r = badgeModalRect(v)
  return (
    <>
      <Box x={0} y={0} w={v.W} h={v.H} className="bg-black/50 backdrop-blur-sm" />
      <Box x={0} y={0} w={v.W} h={v.H} className="pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className="lw-confetti absolute top-0 rounded-[2px]"
            style={{ left: `${(i * 37) % 100}%`, width: 8 + (i % 4) * 2, height: 8 + (i % 4) * 2, backgroundColor: CONFETTI[i % 6], animationDelay: `${(i % 5) * 0.1}s`, animationDuration: `${2 + (i % 7) * 0.3}s` }} />
        ))}
        <style>{`@keyframes lwConfetti{0%{transform:translateY(-10%) rotate(0deg);opacity:1}80%{opacity:1}100%{transform:translateY(${v.H + 40}px) rotate(720deg);opacity:0}}.lw-confetti{animation:lwConfetti linear 1 forwards}`}</style>
      </Box>
      <Box {...r} className="rounded-3xl bg-white p-8 text-center shadow-2xl">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">New badge earned</p>
        <div className="mb-3 text-6xl">🥇</div>
        <p className="font-display text-2xl leading-tight">Quiz Ace</p>
        <p className="mt-2 text-sm leading-relaxed text-tal-plum-soft">Passed 5 quizzes</p>
      </Box>
      <Box {...niceOneRect(v)} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Nice one</Box>
    </>
  )
}

// ── Certificate (learn/certificate/[categoryId]) - Health ────────────────────

function certLayout(v: V) {
  const P = v.phone
  const w = P ? v.w : 768, x = P ? v.x : v.x + 64
  const back = { x, y: v.top + 10, w: 110, h: 20 }
  const lessons = { x: x + 126, y: v.top + 10, w: 92, h: 20 }
  const print = P ? { x, y: v.top + 44, w: 170, h: 40 } : { x: x + w - 170, y: v.top, w: 170, h: 40 }
  const card = { x, y: v.top + (P ? 100 : 56), w, h: P ? 760 : 700 }
  return { back, lessons, print, card, h: Math.max(v.H, card.y + card.h + 70) }
}
function Certificate({ v }: { v: V }) {
  const L = certLayout(v)
  const P = v.phone
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.back} className="text-sm text-tal-plum-soft">← Back to Learn</Box>
      <Box {...L.lessons} className="text-sm text-tal-plum-soft underline">View lessons</Box>
      <Box {...L.print} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Print / save as PDF</Box>
      <Box {...L.card} className={`rounded-3xl border-4 border-amber-400 bg-white text-center shadow-lg ${P ? "p-8" : "p-14"}`}>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-700">Certificate of completion</span>
        <p className={`mt-6 font-display ${P ? "text-4xl" : "text-5xl"}`}>The Adulting Life</p>
        <p className="mt-1 text-sm italic text-tal-plum-soft">Your life. Organised.</p>
        <div className={P ? "my-10" : "my-12"}>
          <p className="mb-2 text-sm uppercase tracking-widest text-tal-plum-soft">This certifies that</p>
          <p className={`mx-auto max-w-xl border-b border-tal-line pb-3 font-display ${P ? "text-3xl" : "text-4xl"}`}>Sarah Taylor</p>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-tal-plum-dark">has completed every lesson in the <strong className="text-amber-700">Health</strong> learning path, earning the <strong>Health Pro</strong> badge and demonstrating a solid handle on this part of adulting life.</p>
        </div>
        <div className={`mt-10 flex items-end gap-6 ${P ? "flex-wrap justify-between" : "justify-between"}`}>
          <div className="text-left"><p className="min-w-[10rem] border-b border-tal-line pb-1 font-display text-lg">23 November 2026</p><p className="mt-1 text-[11px] uppercase tracking-widest text-tal-plum-soft">Date awarded</p></div>
          <Thumb src="/thumbnails/badges/cat-health.png" size={P ? 112 : 128} className="rounded-full" />
          <div className="text-right"><p className="min-w-[10rem] border-b border-tal-line pb-1 font-display text-lg italic">Donna</p><p className="mt-1 text-[11px] uppercase tracking-widest text-tal-plum-soft">The Adulting Life</p></div>
        </div>
      </Box>
      <Box x={L.card.x} y={L.card.y + L.card.h + 16} w={L.card.w} h={20} className="text-center text-xs text-tal-plum-soft">Tip: use your browser&apos;s print dialog to save as PDF.</Box>
    </Shell>
  )
}

// ── Articles (learn/articles) ────────────────────────────────────────────────

const READ_LIST: { t: string; c: Cat; d: string; m: number }[] = [
  { t: "Budgets", c: "admin", d: "23 Nov 2026", m: 1 }, { t: "Loan Statements", c: "admin", d: "22 Nov 2026", m: 2 },
  { t: "Bank Statements", c: "admin", d: "21 Nov 2026", m: 2 }, { t: "Resume", c: "employment", d: "20 Nov 2026", m: 3 },
  { t: "Cover Letter", c: "employment", d: "19 Nov 2026", m: 2 }, { t: "TAL — Employee Information Form", c: "employment", d: "18 Nov 2026", m: 5 },
  { t: "Power of Attorney Details", c: "personal", d: "12 Nov 2026", m: 1 }, { t: "Will & Funeral Instructions", c: "personal", d: "10 Nov 2026", m: 2 },
  { t: "Passport & Travel Documents", c: "personal", d: "7 Nov 2026", m: 3 }, { t: "Medical Bills", c: "health", d: "3 Nov 2026", m: 1 },
]
const ART_CATS = ["All categories", ...CATS.map((c) => CAT_LABEL[c])]
function pillRow(x: number, y: number, maxW: number, labels: string[]) {
  const out: Rect[] = []
  let cx = x, cy = y
  for (const l of labels) {
    const w = Math.round(l.length * 6.6 + 26)
    if (cx + w > x + maxW) { cx = x; cy += 40 }
    out.push({ x: cx, y: cy, w, h: 32 }); cx += w + 8
  }
  return { pills: out, h: cy + 32 - y }
}
function alLayout(v: V, readOnly: boolean) {
  const P = v.phone, x = v.x
  const crumbs = { x, y: v.top, w: v.w, h: 20 }
  const hdr = { x, y: v.top + 32, w: v.w, h: P ? 132 : 64 }
  let y = hdr.y + hdr.h + 24
  const filters = pillRow(x, y, v.w, ["All articles", "Read only"]); y += filters.h + 12
  const cats = pillRow(x, y, v.w, ART_CATS); y += cats.h + 24
  const list = { x, y, w: v.w, h: 0 }
  const rows: Rect[] = []
  if (readOnly) {
    let ry = y
    for (const r of READ_LIST) { const h = 16 + wrapLines(r.t, v.w - 90, 7.8) * 22 + 4 + 22 + 16 + (P ? 20 : 0); rows.push({ x, y: ry, w: v.w, h }); ry += h + 1 }
    list.h = ry - y
  } else {
    let ry = y + 52
    for (const a of PERSONAL) {
      const tw = v.w - 32 - 24 - 12 - 12 - 16
      const h = 16 + wrapLines(a.t, tw, 7.8) * 22 + 2 + Math.min(2, wrapLines(a.s, tw, 7)) * 20 + 4 + 16 + 16
      rows.push({ x, y: ry, w: v.w, h }); ry += h + 1
    }
    list.h = ry - y
  }
  return { crumbs, hdr, filters: filters.pills, cats: cats.pills, list, rows, h: Math.max(v.H, list.y + list.h) }
}
const Tick14 = () => <SmallTick size={14} w={2.5} />
function ArticlesPage({ v, readOnly = false }: { v: V; readOnly?: boolean }) {
  const L = alLayout(v, readOnly)
  const pill = (on: boolean) => `flex items-center justify-center rounded-full border text-xs font-medium ${on ? "border-tal-plum bg-black text-white" : "border-tal-line bg-white text-tal-plum-soft"}`
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.crumbs} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Learn</span><span className="text-tal-plum-soft/50">/</span><span>Articles</span></Box>
      <Box {...L.hdr} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Articles</span>
          <span className="font-display text-2xl leading-tight">Every Adulting Life article</span>
          <span className="mx-1 text-white/40">·</span>
          <span className="text-sm text-white/80">26 of 59 read</span>
        </div>
      </Box>
      {L.filters.map((r, i) => <Box key={i} {...r} className={pill(readOnly ? i === 1 : i === 0)}>{["All articles", "Read only"][i]}</Box>)}
      {L.cats.map((r, i) => <Box key={i} {...r} className={pill(i === 0)}>{ART_CATS[i]}</Box>)}
      <Box {...L.list} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      {!readOnly && (
        <Box x={L.list.x} y={L.list.y} w={L.list.w} h={52} className="flex items-center gap-3 border-b border-tal-line bg-tal-cream-soft/50 px-5">
          <span className="font-display text-lg">Personal</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${CHIP.personal}`}>7/14</span>
          <span className="ml-auto text-xs text-tal-plum-soft">Open path →</span>
        </Box>
      )}
      {L.rows.map((r, i) => {
        if (readOnly) {
          const a = READ_LIST[i]
          return (
            <Box key={i} {...r} className="flex items-start gap-3 border-b border-tal-line p-4">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Tick14 /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{a.t}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]"><span className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-widest ${CHIP[a.c]}`}>{CAT_LABEL[a.c]}</span><span className="text-tal-plum-soft">Read {a.d}</span><span className="text-tal-plum-soft">·</span><span className="text-tal-plum-soft">{a.m} min read</span></div>
              </div>
              <span className="self-center text-tal-plum-soft">→</span>
            </Box>
          )
        }
        const a = PERSONAL[i]
        return (
          <Box key={i} {...r} className="flex items-start gap-3 border-b border-tal-line p-4">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${a.read ? "bg-emerald-600 text-white" : "bg-tal-cream-soft text-tal-plum-soft"}`}>
              {a.read ? <Tick14 /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /></svg>}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-medium leading-snug ${a.read ? "text-tal-plum-soft" : ""}`}>{a.t}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-tal-plum-soft">{a.s}</p>
              <p className="mt-1 text-[11px] text-tal-plum-soft">{a.m} min read</p>
            </div>
            <span className="self-center text-tal-plum-soft">→</span>
          </Box>
        )
      })}
    </Shell>
  )
}

// ── Videos (learn/videos) ────────────────────────────────────────────────────

function vidLayout(v: V) {
  const P = v.phone, x = v.x
  const back = { x, y: v.top, w: 60, h: 20 }
  const title = { x, y: v.top + 24, w: v.w, h: 36 }
  const intro = { x, y: v.top + 68, w: v.w, h: P ? 48 : 24 }
  const legend = { x, y: intro.y + intro.h + 16, w: v.w, h: P ? 140 : 48 }
  let y = legend.y + legend.h + 24
  const cols = P ? 1 : 3
  const vw = P ? v.w : (v.w - 48) / 3
  const th = Math.round((vw * 9) / 16)
  const heads: { c: Cat; y: number }[] = []
  const items: { vd: Video; thumb: Rect; item: Rect }[] = []
  for (const c of CATS) {
    const list = VIDEOS.filter((vd) => vd.cat === c)
    if (!list.length) continue
    heads.push({ c, y }); y += 40
    const ih = th + 20 + 32 + 40 + 20
    list.forEach((vd, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const r = { x: x + col * (vw + 24), y: y + row * (ih + 24), w: vw, h: th }
      items.push({ vd, thumb: r, item: { ...r, h: ih } })
    })
    y += Math.ceil(list.length / cols) * (ih + 24) - 24 + 40
  }
  return { back, title, intro, legend, heads, items, h: Math.max(v.H, y + 20) }
}
function VideosPage({ v }: { v: V }) {
  const L = vidLayout(v)
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.back} className="text-sm text-tal-plum-soft">← Learn</Box>
      <Box {...L.title} className="font-display text-3xl">Videos</Box>
      <Box {...L.intro} className="text-tal-plum-soft">Every video across every category. Click a thumbnail to watch.</Box>
      <Legend r={L.legend} />
      {L.heads.map((hd) => <Box key={hd.c} x={v.x} y={hd.y} w={300} h={28} className="font-display text-xl">{CAT_LABEL[hd.c]}</Box>)}
      {L.items.map(({ vd, thumb, item }) => (
        <div key={vd.t}>
          <VideoThumb r={thumb} vd={vd} watched={!!vd.watched} />
          <Box x={item.x} y={thumb.y + thumb.h + 4} w={item.w} h={item.h - thumb.h - 4}>
            <p className="text-xs text-tal-plum-soft underline">{vd.watched ? "Mark as unwatched" : "Mark as watched"}</p>
            <p className="mt-2 font-medium">{vd.t}</p>
            <p className="mt-0.5 text-sm text-tal-plum-soft">{vd.d}</p>
            <p className="mt-1 text-xs text-tal-plum-soft underline">{vd.art} ↗</p>
          </Box>
        </div>
      ))}
    </Shell>
  )
}

// ── Quizzes (learn/quizzes) ──────────────────────────────────────────────────

const PASSED: { t: string; c: Cat; pct: number; s: string; d: string }[] = [
  { t: "Budgets", c: "admin", pct: 75, s: "3/4", d: "23 Nov 2026" },
  { t: "Scripts", c: "health", pct: 75, s: "3/4", d: "2 Nov 2026" },
  { t: "Dental Records", c: "health", pct: 100, s: "3/3", d: "28 Oct 2026" },
  { t: "My Health Plan", c: "health", pct: 80, s: "4/5", d: "25 Oct 2026" },
  { t: "Health Insurance Details", c: "health", pct: 100, s: "4/4", d: "22 Oct 2026" },
]
function qzLayout(v: V, passed: boolean) {
  const x = v.x
  const back = { x, y: v.top, w: 60, h: 20 }
  const title = { x, y: v.top + 24, w: v.w, h: 36 }
  const sub = { x, y: v.top + 68, w: v.w, h: 24 }
  const bar = pillRow(x, v.top + 116, v.w, ["Library", "Taken", "Passed"])
  let y = v.top + 116 + 32 + 24
  const head = { x, y, w: v.w, h: 28 }
  const rows: Rect[] = []
  if (passed) {
    const rh = v.phone ? 98 : 80
    for (let i = 0; i < PASSED.length; i++) { rows.push({ x, y, w: v.w, h: rh }); y += rh + 1 }
  } else {
    y += 40
    PERSONAL.forEach((a, i) => { const h = 32 + 24 + wrapLines(PERSONAL_QUIZ_DESC[i], v.w - 34, 7) * 20 + 2; rows.push({ x, y, w: v.w, h }); y += h + 8 })
  }
  return { back, title, sub, bar: bar.pills, head, rows, h: Math.max(v.H, y + 40) }
}
function QuizzesPage({ v, passed = false }: { v: V; passed?: boolean }) {
  const L = qzLayout(v, passed)
  const pill = (on: boolean) => `flex items-center justify-center rounded-full border text-xs font-medium ${on ? "border-tal-plum bg-black text-white" : "border-tal-line bg-white text-tal-plum-soft"}`
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.back} className="text-sm text-tal-plum-soft">← Learn</Box>
      <Box {...L.title} className="font-display text-3xl">{passed ? "Quizzes you've passed" : "Quizzes"}</Box>
      <Box {...L.sub} className="text-tal-plum-soft">{passed ? "5 quizzes at 70% or higher." : "59 quizzes across 5 areas."}</Box>
      {L.bar.map((r, i) => <Box key={i} {...r} className={pill(passed ? i === 2 : i === 0)}>{["Library", "Taken", "Passed"][i]}</Box>)}
      {passed ? (
        <>
          <Box x={v.x} y={L.rows[0].y} w={v.w} h={L.rows[L.rows.length - 1].y + L.rows[L.rows.length - 1].h - L.rows[0].y} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
          {L.rows.map((r, i) => {
            const a = PASSED[i]
            return (
              <Box key={i} {...r} className={`flex items-start gap-3 p-4 ${i < PASSED.length - 1 ? "border-b border-tal-line" : ""}`}>
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">{a.pct}%</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{a.t}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]"><span className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-widest ${CHIP[a.c]}`}>{CAT_LABEL[a.c]}</span><span className="text-tal-plum-soft">{a.s} · Passed</span><span className="text-tal-plum-soft">{a.d}</span></div>
                </div>
                <span className="self-center text-tal-plum-soft">→</span>
              </Box>
            )
          })}
        </>
      ) : (
        <>
          <Box {...L.head} className="flex items-baseline justify-between"><span className="font-display text-xl">Personal</span><span className="text-sm text-tal-plum-soft">View all →</span></Box>
          {L.rows.map((r, i) => (
            <Box key={i} {...r} className="rounded-xl border border-tal-line bg-white p-4"><p className="font-medium">{PERSONAL[i].t}</p><p className="text-sm text-tal-plum-soft">{PERSONAL_QUIZ_DESC[i]}</p></Box>
          ))}
        </>
      )}
    </Shell>
  )
}

// ── Peace of Mind Planner (top of templates/peace-of-mind-planner) ───────────

function plannerLayout(v: V) {
  const x = v.x, P = v.phone
  const introH = wrapLines("The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view.", Math.min(v.w, 672), 7.8) * 24
  const pdf = { x, y: v.top + 20 + 44 + introH + 24, w: v.w, h: P ? 56 : 36 }
  const banner = { x, y: pdf.y + pdf.h + 24, w: Math.min(v.w, 768), h: Math.round(Math.min(v.w, 768) / 4) }
  return { introH, pdf, banner }
}
function PlannerPage({ v }: { v: V }) {
  const L = plannerLayout(v)
  const P = v.phone
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"
  return (
    <Shell v={v} h={v.H} nav={NAV_PLANNER}>
      <Box x={v.x} y={v.top} w={200} h={20} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box x={v.x} y={v.top + 24} w={v.w} h={40} className="font-display text-3xl">Peace of Mind Planner</Box>
      <Box x={v.x} y={v.top + 72} w={Math.min(v.w, 672)} h={L.introH} className="text-tal-plum-soft">The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view.</Box>
      <Box {...L.pdf} className="flex flex-wrap items-center gap-2">
        <span className={btn}><PdfIcon />{!P && "Download PDF"}</span><span className={btn}><MailIcon />{!P && "Share PDF"}</span>
        <span className="text-xs text-tal-plum-soft">One document, in the same order as the printed Planner — to keep somewhere safe.</span>
      </Box>
      <Img src="/thumbnails/banners/planner.jpg" {...L.banner} className="rounded-2xl border border-tal-line" />
    </Shell>
  )
}

// PdfActions' icons
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

// ── TAL AI (tal-ai + TalAiChat) ──────────────────────────────────────────────

const STARTERS = ["Help me write an email to my landlord", "What information belongs in an emergency contact record?", "Explain how the Australian financial year works", "How should I organise my tax paperwork?"]
function TalAiPage({ v }: { v: V }) {
  const P = v.phone, w = P ? v.w : 768
  const hdr = { x: v.x, y: v.top, w, h: P ? 104 : 64 }
  const chat = { x: v.x, y: hdr.y + hdr.h + 24, w, h: Math.round(v.H * 0.7) - (P ? 120 : 40) }
  return (
    <Shell v={v} h={v.H} nav={NAV_TALAI}>
      <Box {...hdr} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">TAL AI</span>
          <span className="font-display text-2xl leading-tight">Ask anything</span>
          <span className="mx-1 text-white/40">·</span>
          <span className="text-sm text-white/80">Powered by ChatGPT</span>
        </div>
      </Box>
      <Box {...chat} className="flex flex-col overflow-hidden rounded-2xl border border-tal-line bg-white">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <div className="max-w-md">
            <p className="mb-1 font-medium">Ask TAL AI for a hand with life admin.</p>
            <p className="text-sm text-tal-plum-soft">TAL AI gives general guidance and wording help — not legal, financial, tax or medical advice. Always check important decisions with the right professional.</p>
          </div>
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            {STARTERS.map((s) => <span key={s} className="rounded-full border border-tal-line bg-tal-cream-soft/60 px-3 py-1.5 text-left text-xs">{s}</span>)}
          </div>
        </div>
        <div className="flex items-end gap-2 border-t border-tal-line p-3">
          <div className="h-10 flex-1 rounded-xl border border-tal-line px-3 py-2 text-sm text-tal-plum-soft/60">Ask something…</div>
          <span className="flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white opacity-60">Send</span>
        </div>
        <p className="border-t border-tal-line px-5 py-2 text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</p>
      </Box>
    </Shell>
  )
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

function buildScreens(v: V): Record<string, ReactNode> {
  const al = artLayout(v, A_BUDGETS)
  const playerY = Math.max(0, Math.min(al.h - v.H, Math.round((al.vids[0]?.thumb.y ?? 0) - v.H * 0.4)))
  return {
    hub: <Hub v={v} />,
    hub1: <Hub v={v} d={HUB1} />,
    hubBadges: <Hub v={v} d={HUB1} open />,
    hubFabs: <Hub v={v} d={HUB1} fabs />,
    ahd: <ArticlePage v={v} sp={A_AHD} />,
    catA: <CatPage v={v} open="articles" />,
    catG: <CatPage v={v} open="guides" />,
    catQ: <CatPage v={v} open="quizzes" />,
    cert: <Certificate v={v} />,
    art: <ArticlePage v={v} sp={A_BUDGETS} />,
    artPlay: <ArticlePage v={v} sp={A_BUDGETS} player playerY={playerY} />,
    artWatched: <ArticlePage v={v} sp={A_BUDGETS} watched />,
    artRead: <ArticlePage v={v} sp={A_BUDGETS} watched read />,
    quiz0: <QuizPage v={v} />,
    quiz1: <QuizPage v={v} answered={1} />,
    quiz4: <QuizPage v={v} answered={4} />,
    quizBadge: <QuizPage v={v} answered={4} result badgeModal />,
    quizResult: <QuizPage v={v} answered={4} result />,
    articles: <ArticlesPage v={v} />,
    articlesRead: <ArticlesPage v={v} readOnly />,
    videos: <VideosPage v={v} />,
    quizzes: <QuizzesPage v={v} />,
    quizzesPassed: <QuizzesPage v={v} passed />,
    planner: <PlannerPage v={v} />,
    talai: <TalAiPage v={v} />,
  }
}

const BASE = "app.theadultinglife.com.au"
const U = {
  hub: `${BASE}/learn`,
  personal: `${BASE}/learn/personal`,
  guides: `${BASE}/learn/personal?expand=guides`,
  quizzesOpen: `${BASE}/learn/personal?expand=quizzes`,
  cert: `${BASE}/learn/certificate/health`,
  budgets: `${BASE}/learn/admin/article/course-admin-budgets`,
  ahd: `${BASE}/learn/personal/article/course-personal-advanced-health-directive`,
  quiz: `${BASE}/learn/admin/quiz/8c41f2a7`,
  articles: `${BASE}/learn/articles`,
  articlesRead: `${BASE}/learn/articles?filter=read`,
  videos: `${BASE}/learn/videos`,
  quizzes: `${BASE}/learn/quizzes`,
  quizzesPassed: `${BASE}/learn/quizzes?filter=passed`,
  planner: `${BASE}/templates/peace-of-mind-planner`,
  talai: `${BASE}/tal-ai`,
}

function buildSteps(v: V): WalkStep[] {
  const P = v.phone
  // Scroll a tall screen so `y` sits about 40% of the way down the view.
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  // Zoom on a rect - centred and kept modest on a phone so full-width cards aren't clipped.
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.06) : s })
  // Zoom on a small target (a button) - fine at a higher scale on both.
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })

  const H0 = hubLayout(v), HB = hubLayout(v, true)
  const C = catLayout(v, "articles"), CG = catLayout(v, "guides"), CQ = catLayout(v, "quizzes")
  const A = artLayout(v, A_BUDGETS), AH = artLayout(v, A_AHD)
  const Q = quizLayout(v)
  const CE = certLayout(v)
  const AL = alLayout(v, false), ALR = alLayout(v, true)
  const VL = vidLayout(v)
  const QZ = qzLayout(v, false), QP = qzLayout(v, true)
  const PL = plannerLayout(v)
  const fab = FAB(v)

  const sH = (r: Rect) => sc(H0.h, r.y + r.h / 2)
  const sB = (r: Rect) => sc(HB.h, r.y + r.h / 2)
  const sA = (r: Rect) => sc(A.h, r.y + r.h / 2)
  const sQ = (r: Rect) => sc(Q.h, r.y + r.h / 2)
  const vid0 = A.vids[0]
  const playerY = Math.max(0, Math.min(A.h - v.H, Math.round(vid0.thumb.y - v.H * 0.4)))
  const pr = playerRect(v, playerY)
  const health = H0.path(1), personal = H0.path(0)
  const pathsAll = span(H0.pathsHead, H0.path(4))
  const q0 = Q.qs[0], q3 = Q.qs[3]
  const bodyTop = { ...A.body, h: Math.min(A.body.h, 420) }

  return [
    // The page
    { screen: "hub", url: U.hub, caption: "Learn: The Adulting Life Unlocked", detail: P ? "Short, practical lessons on the adulting stuff nobody teaches you. Open it from the ☰ menu." : "Short, practical lessons on the adulting stuff nobody teaches you. Open it from Learn in the sidebar.", focus: fz(H0.hdr, 1.35), ring: H0.hdr, duration: 6500 },
    { screen: "hub", url: U.hub, scroll: sH(H0.resume), caption: "Continue where you left off", detail: "The lesson Sarah's up to in the path she's working through - Money basics: Budgets, a 1 minute read, then Investments & Deeds. 2 of 5 lessons done.", focus: fz(H0.resume, 1.5), ring: H0.resume, duration: 7500 },
    { screen: "hub", url: U.hub, scroll: sH(H0.pro), caption: "You're becoming an Adulting Pro!", detail: "How much of the whole course you've read: 42% - 25 of 59 lessons. Next lesson opens the first one you haven't read yet.", focus: fz(H0.pro, 1.5), ring: H0.pro, click: mid(H0.proNext), duration: 7000 },
    { screen: "ahd", url: U.ahd, caption: "Advanced Health Directive", detail: "Next in Personal. Every lesson opens like this - the section, a summary and how long it takes to read.", focus: fz(span(AH.crumbs, AH.hdr), 1.3), ring: AH.hdr, duration: 6000 },
    // Paths + a category
    { screen: "hub", url: U.hub, scroll: P ? sH(H0.path(2)) : sH(pathsAll), caption: "Your Learning Paths", detail: "One for each part of the Organiser: Personal, Health, Education, Employment and Admin & Bookkeeping. Each shows lessons read and a % that counts quizzes passed too.", focus: P ? undefined : fz(pathsAll, 1.3), ring: P ? span(H0.path(1), H0.path(4)) : pathsAll, duration: 8000 },
    { screen: "hub", url: U.hub, scroll: sH(personal), caption: "Open a path", detail: "Personal: 7 of 14 lessons read.", focus: fzs(personal, P ? 1.5 : 1.8), ring: pad(personal, 3), click: mid(personal), duration: 5500 },
    { screen: "catA", url: U.personal, caption: "Personal", detail: "Everything in this section: articles, guides and quizzes. Tap a pill to open that list.", focus: fz(C.bar, 1.3), ring: C.bar, duration: 6000 },
    { screen: "catA", url: U.personal, scroll: P ? sc(C.h, C.secs.articles.body[1].y) : 0, caption: "Articles", detail: "Each card has a short summary and the reading time. A red tag shows it has a video - Passport & Travel Documents has one.", focus: P ? fz(C.secs.articles.body[1], 1.05) : { x: 720, y: 460, scale: 1.1 }, ring: P ? span(C.secs.articles.body[0], C.secs.articles.body[1]) : span(C.secs.articles.body[0], C.secs.articles.body[3]), duration: 7500 },
    { screen: "catA", url: U.personal, caption: "1 guide", detail: "The printable downloads for this section.", focus: fzs(C.pills[1], P ? 1.6 : 1.8), ring: pad(C.pills[1], 3), click: mid(C.pills[1]), duration: 5000 },
    { screen: "catG", url: U.guides, caption: "Guides & forms", detail: "Personal document checklist (PDF) - a one-page list of the personal documents to keep on file. Download it to print.", focus: fz(CG.secs.guides.r, 1.3), ring: CG.secs.guides.r, duration: 6500 },
    { screen: "catG", url: U.guides, caption: "14 quizzes", detail: "One quick quiz for every article.", focus: fzs(CG.pills[2], P ? 1.6 : 1.8), ring: pad(CG.pills[2], 3), click: mid(CG.pills[2]), duration: 5000 },
    { screen: "catQ", url: U.quizzesOpen, scroll: P ? sc(CQ.h, CQ.secs.quizzes.body[0].y + 100) : 0, caption: "Quizzes", detail: "Each one says what it covers. Start quiz opens it.", focus: P ? fz(CQ.secs.quizzes.body[0], 1.05) : fz(CQ.secs.quizzes.r, 1.1), ring: P ? CQ.secs.quizzes.body[0] : { ...CQ.secs.quizzes.r, h: Math.min(CQ.secs.quizzes.r.h, 760 - CQ.secs.quizzes.r.y - 10) }, duration: 6000 },
    { screen: "catQ", url: U.quizzesOpen, caption: "← Learn goes back", focus: fzs(CQ.back, 1.8), ring: pad(CQ.back, 4), click: mid(CQ.back), duration: 4500 },
    // Certificate
    { screen: "hub", url: U.hub, scroll: sH(health), caption: "🏆 Certificate ready", detail: "Read every lesson in a path and it says so. Sarah has finished Health - 12 of 12.", focus: fzs(health, P ? 1.5 : 1.8), ring: pad(health, 3), click: mid(health), duration: 6500 },
    { screen: "cert", url: U.cert, scroll: P ? sc(CE.h, CE.card.y + 300) : 0, caption: "Certificate of completion", detail: "With her name, the date and the Health Pro badge, signed by Donna.", focus: P ? fz(CE.card, 1.0) : { x: 720, y: 420, scale: 1.05 }, ring: P ? undefined : CE.card, duration: 7000 },
    { screen: "cert", url: U.cert, caption: "Print / save as PDF", detail: "Print it, or save it as a PDF from the print box. View lessons goes back to Health; ← Back to Learn to Learn.", focus: fzs(span(CE.back, CE.print), P ? 1.2 : 1.4), ring: pad(CE.print, 3), click: mid(CE.back), duration: 6500 },
    // An article
    { screen: "hub", url: U.hub, scroll: sH(H0.resume), caption: "Resume lesson", detail: "Back to Budgets.", focus: fzs(H0.resumeBtn, P ? 1.6 : 1.8), ring: pad(H0.resumeBtn, 3), click: mid(H0.resumeBtn), duration: 5000 },
    { screen: "art", url: U.budgets, caption: "Budgets", detail: "Learn / Admin & Bookkeeping at the top goes back. Under the title: what it's about and a 1 min read.", focus: fz(span(A.crumbs, A.hdr), 1.3), ring: A.hdr, duration: 6000 },
    { screen: "art", url: U.budgets, scroll: A.legend ? sA(A.legend) : 0, caption: "Videos", detail: "Some lessons have videos. The key: red Unseen - you haven't watched it yet; green Watched - played to the end, or you marked it.", focus: A.legend ? fz(A.legend, 1.4) : undefined, ring: A.legend ?? undefined, duration: 7000 },
    { screen: "art", url: U.budgets, scroll: playerY, caption: "Click a video to play it", detail: "Building your first budget.", focus: fz(vid0.thumb, 1.3), ring: vid0.thumb, click: mid(vid0.thumb), duration: 5500 },
    { screen: "artPlay", url: U.budgets, scroll: playerY, caption: "It plays on top of the page", detail: "Watch it to the end and it's marked Watched. Close (or Esc) goes back to the article.", focus: { x: 195 + (P ? 0 : 405), y: pr.y + pr.h / 2, scale: 1.05 }, ring: pad(pr, 4), click: { x: pr.x + pr.w - 30, y: pr.y - 22 }, duration: 7000 },
    { screen: "artWatched", url: U.budgets, scroll: playerY, caption: "Watched", detail: "Green now. Mark as watched / unwatched under each video changes it by hand.", focus: fz(span(vid0.thumb, vid0.mark), 1.3), ring: pad(span(vid0.thumb, vid0.mark), 3), duration: 6000 },
    { screen: "artWatched", url: U.budgets, scroll: sA(bodyTop), caption: "Read the lesson", detail: "Written by Donna - what it is, why it's in your Organiser and how to use it.", focus: fz(bodyTop, 1.1), ring: bodyTop, duration: 7000 },
    { screen: "artWatched", url: U.budgets, scroll: P ? sA(A.aside) : 0, caption: `More in ${CAT_LABEL.admin}`, detail: "The section's other lessons, this one highlighted. View all opens the section.", focus: P ? fz(A.aside, 1.05) : fz(A.aside, 1.5), ring: A.aside, duration: 6000 },
    { screen: "artWatched", url: U.budgets, scroll: sA(A.finish), caption: "Finished? Mark as read", detail: "It counts towards your path and Adulting Pro %, keeps your streak going and can earn badges.", focus: fz(A.finish, 1.3), ring: pad(A.markBtn, 3), click: mid(A.markBtn), duration: 6500 },
    { screen: "artRead", url: U.budgets, scroll: sA(A.finish), caption: "Marked as read", focus: fz(A.finish, 1.3), ring: pad({ ...A.markBtn, w: 150 }, 3), duration: 4500 },
    { screen: "artRead", url: U.budgets, scroll: sA(span(A.prev, A.next)), caption: "Previous and Next", detail: "Loan Statements before it, Investments & Deeds after - in the section's order.", focus: fz(span(A.prev, A.next), 1.25), ring: pad(span(A.prev, A.next), 3), duration: 5500 },
    { screen: "artRead", url: U.budgets, scroll: sA(A.quizCard), caption: "Then take its quiz", detail: "Quiz 1 - Budgets. Take it →", focus: fz(A.quizCard, 1.4), ring: pad(A.quizCard, 3), click: mid(A.quizCard), duration: 5500 },
    // A quiz
    { screen: "quiz0", url: U.quiz, caption: "Quiz · Budgets", detail: "What it checks and how many questions. ← Admin & Bookkeeping goes back to the section's quizzes.", focus: fz(span(Q.back, Q.hdr), 1.3), ring: Q.hdr, duration: 6000 },
    { screen: "quiz0", url: U.quiz, scroll: sQ(q0.box), caption: "Pick an answer", detail: "Four choices, A to D. Click one.", focus: fz(q0.box, 1.2), ring: pad(q0.opts[0], 2), click: mid(q0.opts[0]), duration: 5500 },
    { screen: "quiz1", url: U.quiz, scroll: sQ(q0.box), caption: "1 of 4 answered", detail: "The bar at the top fills as you go.", focus: fz(span(Q.bar, q0.opts[0]), 1.15), ring: Q.bar, duration: 5000 },
    { screen: "quiz4", url: U.quiz, scroll: sQ(span(q3.box, Q.submit)), caption: "Submit answers", detail: "It only unlocks once every question has an answer - until then it says how many are left.", focus: fz(Q.submit, 1.3), ring: pad(Q.submit, 3), click: mid(Q.submit), duration: 6000 },
    { screen: "quizBadge", url: U.quiz, caption: "New badge earned: Quiz Ace", detail: "That's Sarah's fifth quiz passed (70% or more). New badges pop up like this.", focus: fz(badgeModalRect(v), 1.25), ring: pad(niceOneRect(v), 3), click: mid(niceOneRect(v)), duration: 7000 },
    { screen: "quizResult", url: U.quiz, caption: "3 / 4 - 75%", detail: "\"Not bad. Have another read of the article and try again.\" Try again clears it to have another go. Get them all right and it's \"Perfect — nice work.\"", focus: fz(Q.result, 1.3), ring: pad(Q.tryAgain, 3), duration: 7500 },
    // Browse by content type
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Browse by content type", detail: "Everything in one place, whatever the section.", focus: fz(H0.browse, 1.3), ring: H0.browse, duration: 5500 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Articles", detail: "All 59.", focus: fzs(H0.tile(0), P ? 1.5 : 1.8), ring: pad(H0.tile(0), 3), click: mid(H0.tile(0)), duration: 4500 },
    { screen: "articles", url: U.articles, scroll: P ? sc(AL.h, AL.rows[1].y) : 0, caption: "Every Adulting Life article", detail: "26 of 59 read, grouped by section - a green tick on the ones you've read. Pick a section to see only that one; Open path → opens it.", focus: P ? undefined : { x: 720, y: 400, scale: 1.05 }, ring: P ? span(AL.cats[0], AL.rows[1]) : span(AL.filters[0], AL.rows[1]), duration: 7500 },
    { screen: "articles", url: U.articles, caption: "Read only", focus: fzs(AL.filters[1], P ? 1.6 : 1.8), ring: pad(AL.filters[1], 3), click: mid(AL.filters[1]), duration: 4500 },
    { screen: "articlesRead", url: U.articlesRead, scroll: P ? sc(ALR.h, ALR.rows[2].y) : 0, caption: "What you've read, newest first", detail: "With the date you read it - Budgets today.", focus: P ? fz(ALR.rows[1], 1.05) : fz(span(ALR.rows[0], ALR.rows[3]), 1.2), ring: span(ALR.rows[0], ALR.rows[3]), duration: 6000 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Videos", detail: "6 videos.", focus: fzs(H0.tile(1), P ? 1.5 : 1.8), ring: pad(H0.tile(1), 3), click: mid(H0.tile(1)), duration: 4500 },
    { screen: "videos", url: U.videos, scroll: P ? sc(VL.h, VL.items[1].thumb.y) : 0, caption: "Every video", detail: "By section, each with the key, Mark as watched and a link to its article ↗. Click a thumbnail to watch.", focus: P ? undefined : { x: 720, y: 440, scale: 1.05 }, ring: P ? VL.items[1].item : span(VL.items[0].item, VL.items[1].item), duration: 7000 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Quizzes", detail: "59 quizzes.", focus: fzs(H0.tile(2), P ? 1.5 : 1.8), ring: pad(H0.tile(2), 3), click: mid(H0.tile(2)), duration: 4500 },
    { screen: "quizzes", url: U.quizzes, caption: "The quiz library", detail: "By section. Taken lists every one you've done with your score; Passed only the ones at 70% or more.", focus: fz(span(QZ.title, QZ.bar[2]), 1.3), ring: pad(QZ.bar[2], 3), click: mid(QZ.bar[2]), duration: 6500 },
    { screen: "quizzesPassed", url: U.quizzesPassed, caption: "Quizzes you've passed", detail: "Your score, the section and the date. Click one to take it again.", focus: P ? fz(QP.rows[1], 1.05) : fz(span(QP.rows[0], QP.rows[4]), 1.15), ring: span(QP.rows[0], QP.rows[4]), duration: 6000 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Peace of Mind Planner", focus: fzs(H0.tile(3), P ? 1.5 : 1.8), ring: pad(H0.tile(3), 3), click: mid(H0.tile(3)), duration: 4500 },
    { screen: "planner", url: U.planner, caption: "Peace of Mind Planner", detail: "The things your family would need to know if something happened to you - the planner sections and your PDF.", focus: fz(span({ x: v.x, y: v.top, w: v.w, h: 20 }, PL.banner), 1.1), ring: pad(span({ x: v.x, y: v.top + 24, w: Math.min(v.w, 672), h: 40 }, PL.pdf), 4), duration: 6500 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.browse), caption: "Downloads", detail: "The printable checklists (PDF) - 2 so far. They're under guides in each section too.", focus: fzs(H0.tile(4), P ? 1.5 : 1.8), ring: pad(H0.tile(4), 3), duration: 5500 },
    // Streak, badges, up next, TAL AI
    { screen: "hub1", url: U.hub, scroll: sH(H0.streak), caption: "Learning streak", detail: "Days in a row you've learned something - Sarah's on 5, her longest is 12. Read a lesson today to keep it going.", focus: fz(H0.streak, 1.6), ring: H0.streak, duration: 6500 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.badges), caption: "Recently earned", detail: "Your two newest badges. View all shows every one.", focus: fz(H0.badges, 1.6), ring: pad(H0.viewAll, 3), click: mid(H0.viewAll), duration: 5500 },
    { screen: "hubBadges", url: U.hub, scroll: sB(HB.badgeRow(7)), caption: "All 17 badges", detail: "The 7 Sarah has earned, then the ones still to get, faded - Halfway There, 7-Day Streak, Personal Pro and more. Click an earned one to see it: Health Pro opens her certificate.", focus: fz(HB.badges, P ? 1.05 : 1.3), ring: HB.badges, duration: 8000 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.next), caption: "Up next", detail: "The next three lessons you haven't read. Click one to open it; View all opens Personal.", focus: fz(H0.next, 1.5), ring: H0.next, duration: 6000 },
    { screen: "hub1", url: U.hub, scroll: sH(H0.talai), caption: "Stuck on something?", detail: "Ask TAL AI about anything you've just read.", focus: fz(H0.talai, 1.5), ring: H0.talai, click: mid(H0.talai), duration: 5500 },
    { screen: "talai", url: U.talai, caption: "TAL AI: Ask anything", detail: "Explain, summarise or dig deeper - or pick a starter. General guidance, not legal, financial, tax or medical advice.", focus: P ? undefined : { x: 656, y: 400, scale: 1.1 }, ring: { x: v.x, y: v.top, w: P ? v.w : 768, h: (P ? 104 : 64) + 24 + Math.round(v.H * 0.7) - (P ? 120 : 40) }, duration: 7000 },
    // Round buttons
    { screen: "hubFabs", url: U.hub, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
}

const D_SCREENS = buildScreens(DV)
const P_SCREENS = buildScreens(PV)
const D_STEPS = buildSteps(DV)
const P_STEPS = buildSteps(PV)

export default function LearnPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Learn (phone)" : "Learn (computer)"} url={U.hub} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Learn", subtitle: "Bite-sized lessons, quizzes and badges for the adulting stuff nobody teaches you" }} />
  )
}
