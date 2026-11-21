"use client"

// "Peace of Mind Planner" page walkthrough - /templates/peace-of-mind-planner's
// walkthrough button (components/demo/PageWalkthroughFab) and /demo#planner-page.
// Hand-built copies of the real screens with a made-up family's sample data
// (the Taylors, Brisbane) - no sign-in, no API calls. Two versions
// (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column; icon-only PDF / Excel buttons)
// Covers every section on the page, in the page's order, and what opens when
// each row is clicked.
// Copies: app/(app)/templates/peace-of-mind-planner/page.tsx (index) and
// [section]/page.tsx (PlannerShell, Breadcrumbs, privacy banner, group banners),
// lib/templates/peace-of-mind-v2.ts (every section's title, hint, group and
// kind), components/PdfActions + EmailFileDialog, PrintSectionButton,
// ExportExcelButton, PageForm (summary table, entry cards, + Add another, single
// form toolbar), the folder questions in supabase/migrations + page_questions
// (labels), PlannerPeopleView + lib/services/planner-people.ts,
// PlannerSingleTextEditor, PlannerLettersEditor, PlannerApologiesEditor,
// ShareButton + ShareDialog, ShareAllPlannerButton (Settings), SharedItemsView,
// lib/services/item-access-email.ts, lib/services/planner-document.ts (PDF),
// app/(app)/layout.tsx header, components/AppSidebar, HelpButton, TourFab,
// PageWalkthroughFab. The shell and round buttons are copied from
// OrganiserWalkthrough; the letters / nominate / share-all / Emma screens are
// adapted from PlannerWalkthrough.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const span = (a: Rect, b: Rect): Rect => ({ x: Math.min(a.x, b.x), y: a.y, w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: b.y + b.h - a.y })
/** Rough line count for wrapped text (px per character for the font size). */
const lines = (text: string, width: number, pxPerChar: number) => Math.max(1, Math.ceil((text.length * pxPerChar) / width))

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 60 }: { text: string; delay?: number; speed?: number }) {
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

// ── Icons (copied from nav-items.tsx, layout.tsx, PdfActions, ShareButton) ───

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
const NAV_SETTINGS = 11
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
const TalAiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
type Who = "Sarah" | "Emma"
const Avatar = ({ who = "Sarah", size = 36 }: { who?: Who; size?: number }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${who === "Sarah" ? "bg-black" : "bg-[#2f5c5c]"}`} style={{ width: size, height: size }}>{who[0]}</span>
)
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ExcelGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#217346" aria-hidden><path d="M23.181 1.5H8.818A.818.818 0 0 0 8 2.318v3.273h15.181c.452 0 .819-.366.819-.819V2.318a.818.818 0 0 0-.819-.818zM8 22.5h15.181c.453 0 .819-.366.819-.818v-2.454a.818.818 0 0 0-.819-.819H8V22.5zM24 6.409H8v3.273h16V6.41zM8 14.591h16V11.318H8v3.273zM8 18.409h16v-3.273H8v3.273zM7.023 4.91L0 3.638v16.723l7.023-1.272V4.909z" /></svg>
)
// ShareButton: person + plus ("add a trusted person"), green dot once nominated.
const PersonPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const LockGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 10V8a6 6 0 1 1 12 0v2M5 10h14v10H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
)
const ShareBtn = ({ r, shared }: { r: Rect; shared?: boolean }) => (
  <Box {...r} className={`flex items-center justify-center rounded-lg border text-tal-plum ${shared ? "border-emerald-500 bg-emerald-50" : "border-tal-line bg-white"}`}>
    <PersonPlus />
    {shared && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
  </Box>
)
const btnLine = "flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm text-tal-plum"

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

// ── The two layouts ──────────────────────────────────────────────────────────

/** Where the page content sits for each device. */
interface V { phone: boolean; x: number; w: number; W: number; H: number; top: number }
const DV: V = { phone: false, x: 272, w: 896, W: 1200, H: 760, top: 80 }
const PV: V = { phone: true, x: 8, w: 374, W: 390, H: 844, top: 116 }

// Computer header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SB = 240
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const FAB_Y = 680
const FAB_R = 1176
// Phone header
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const P_FAB_Y = 764
const P_FAB_R = 366

function DShell({ h, who, active, fabs, children }: { h: number; who: Who; active: number; fabs?: boolean; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={168 + k * 41} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === active ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === active ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
      </Box>
      <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar who={who} />Hi {who}<span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
      {fabs && <Fabs y={FAB_Y} right={FAB_R} />}
    </div>
  )
}

const StatusBar = () => (
  <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark">
    <span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
function PShell({ h, who, fabs, children }: { h: number; who: Who; fabs?: boolean; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <StatusBar />
      <Box x={0} y={44} w={390} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar who={who} /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
      {children}
      {fabs && <Fabs y={P_FAB_Y} right={P_FAB_R} />}
    </div>
  )
}
function Frame({ v, h, who = "Sarah", active = NAV_PLANNER, fabs, children }: { v: V; h: number; who?: Who; active?: number; fabs?: boolean; children: ReactNode }) {
  return v.phone
    ? <PShell h={h} who={who} fabs={fabs}>{children}</PShell>
    : <DShell h={h} who={who} active={active} fabs={fabs}>{children}</DShell>
}

/** [Download PDF] [Share PDF] - icon-only on a phone (PdfActions). */
function PdfPair({ v, dl, share }: { v: V; dl: Rect; share: Rect }) {
  return (
    <>
      <Box {...dl} className={btnLine}><PdfGlyph />{!v.phone && "Download PDF"}</Box>
      <Box {...share} className={btnLine}><MailGlyph />{!v.phone && "Share PDF"}</Box>
    </>
  )
}
const pdfW = (v: V) => (v.phone ? [34, 34] : [128, 108])

// ── The sections (lib/templates/peace-of-mind-v2.ts) ─────────────────────────

type Kind = "organiser" | "planner-only"
interface Sec { slug: string; title: string; hint?: string; kind: Kind; group: string }
const SECTIONS: Sec[] = [
  { slug: "my-personal-information", title: "My Personal Information", hint: "Your name, date of birth, contact details and addresses — from Family Members.", kind: "planner-only", group: "My Personal Information" },
  { slug: "attorneys", title: "Attorney(s)", hint: "The people you've appointed as your attorney(s) under a Power of Attorney — shared with the Organiser's Power of Attorney folder.", kind: "organiser", group: "Important Consultants & Contacts" },
  { slug: "accountants", title: "Accountant(s)", hint: "Your accountant(s) and tax advisers — shared with the Organiser's List of Accountants folder.", kind: "organiser", group: "Important Consultants & Contacts" },
  { slug: "doctors", title: "Doctors", hint: "GP and any specialists — shared with the Organiser's Medical Advisers folder.", kind: "organiser", group: "Important Consultants & Contacts" },
  { slug: "family-members", title: "Family Members", hint: "Contact details for your family — from the Organiser's Family Members folder.", kind: "planner-only", group: "Important Consultants & Contacts" },
  { slug: "friends", title: "Friends", hint: "Shared with the Organiser's Friends folder.", kind: "organiser", group: "Important Consultants & Contacts" },
  { slug: "others", title: "Others", hint: "Shared with the Organiser's Other Important Contacts folder.", kind: "organiser", group: "Important Consultants & Contacts" },
  { slug: "device-access", title: "Device Access Details", hint: "Phones, tablets, computers — shared with the Organiser's Device Access folder.", kind: "organiser", group: "Device Access Details" },
  { slug: "online-access", title: "Online & Social Media Access Details", hint: "Email, social, other accounts — shared with the Organiser's Personal Accounts list.", kind: "organiser", group: "Online & Social Media Access" },
  { slug: "important-documents", title: "Important Documents", hint: "Shared with the Organiser's Important Documents Register.", kind: "organiser", group: "Important Documents" },
  { slug: "advance-health-directive", title: "Advance Health Directive", hint: "Your signed Advance Health Directive, kept in your Peace of Mind Planner. You can also nominate a trusted person to receive or access it.", kind: "organiser", group: "Important Documents" },
  { slug: "life-insurance", title: "Life Insurance", kind: "organiser", group: "Insurances" },
  { slug: "health-insurance", title: "Health Insurance", kind: "organiser", group: "Insurances" },
  { slug: "vehicle-insurance", title: "Vehicle Insurance", kind: "organiser", group: "Insurances" },
  { slug: "other-insurance", title: "Other Insurance", hint: "Home and other business insurance.", kind: "organiser", group: "Insurances" },
  { slug: "will", title: "Information Regarding My Will", hint: "Shared with the Organiser's Will & Funeral Instructions folder.", kind: "organiser", group: "Will" },
  { slug: "bank-accounts", title: "Bank Accounts / Credit Cards", kind: "organiser", group: "Financial Information" },
  { slug: "investment-accounts", title: "Investment Accounts", kind: "organiser", group: "Financial Information" },
  { slug: "superannuation", title: "Superannuation Retirement Accounts", kind: "organiser", group: "Financial Information" },
  { slug: "open-loans", title: "Open Loans", kind: "organiser", group: "Financial Information" },
  { slug: "other-financial", title: "Other Financial Information", kind: "organiser", group: "Financial Information" },
  { slug: "my-property", title: "My Property", kind: "organiser", group: "Property Information" },
  { slug: "vehicle-information", title: "Vehicle Information", kind: "organiser", group: "Property Information" },
  { slug: "wishes-general", title: "Wishes (general)", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-spouse", title: "Wishes for my spouse / partner", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-children", title: "Wishes for my children", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-relatives", title: "Wishes for my relatives", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-friends", title: "Wishes for my friends", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-pets", title: "Wishes for my pets", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "wishes-other", title: "Other requests", kind: "planner-only", group: "My End-of-Life Plan" },
  { slug: "letters", title: "Letters", kind: "planner-only", group: "Letters" },
  { slug: "apologies", title: "Apologies", kind: "planner-only", group: "Apologies" },
  { slug: "last-words", title: "My Last Words", kind: "planner-only", group: "My Last Words" },
]
const SEC = (slug: string) => SECTIONS.find((s) => s.slug === slug)!
const GROUPS = Array.from(new Set(SECTIONS.map((s) => s.group)))
// [section]/page.tsx PLANNER_GROUP_BANNERS
const GROUP_BANNER: Record<string, string> = {
  "My End-of-Life Plan": "/thumbnails/banners/planner-wishes.jpg",
  Letters: "/thumbnails/banners/planner-letters.jpg",
  Apologies: "/thumbnails/banners/planner-apologies.jpg",
  "My Last Words": "/thumbnails/banners/planner-last-words.jpg",
}
type Editor = "org" | "people" | "wish" | "last" | "letters" | "apologies"
const editorOf = (s: Sec): Editor =>
  s.kind === "organiser" ? "org"
    : s.slug === "my-personal-information" || s.slug === "family-members" ? "people"
    : s.slug.startsWith("wishes-") ? "wish"
    : s.slug === "last-words" ? "last"
    : s.slug === "letters" ? "letters" : "apologies"

// ── Sample data (the Taylors of Brisbane) ────────────────────────────────────

type FT = "text" | "area" | "select" | "date" | "num" | "file" | "addr"
interface Fld { l: string; t: FT; s: number }
const F = (l: string, t: FT = "text", s: number = t === "area" || t === "file" || t === "addr" ? 12 : 6): Fld => ({ l, t, s })
interface Entry { name?: string; v: Record<string, string> }
interface Org { fields: Fld[]; entries: Entry[]; single?: boolean; summary?: string[] }

// Field labels from each folder's page_questions (supabase/migrations).
const ORG: Record<string, Org> = {
  attorneys: {
    fields: [F("Power of Attorney document", "file"), F("Business Name", "text", 12), F("Contact Name", "text", 12), F("Relationship to you"), F("Type of Power of Attorney", "select"), F("Phone Number"), F("Email Address"), F("Address", "addr"), F("Mailing Address", "addr"), F("Where the original is kept", "area")],
    summary: ["Contact Name", "Relationship to you", "Type of Power of Attorney"],
    entries: [
      { v: { "Power of Attorney document": "Enduring-Power-of-Attorney-2024.pdf", "Contact Name": "Emma Clarke", "Relationship to you": "Sister", "Type of Power of Attorney": "Enduring Power of Attorney", "Phone Number": "0412 555 018", "Email Address": "emma.clarke@example.com", Address: "14 Banksia St, Wilston QLD 4051", "Where the original is kept": "Fire safe, home office (blue folder). Copy with Harbourside Legal." } },
      { v: { "Contact Name": "James Taylor", "Relationship to you": "Partner", "Type of Power of Attorney": "Enduring Power of Attorney", "Phone Number": "0413 555 774", "Email Address": "james.taylor@example.com", Address: "27 Jacaranda St, Ashgrove QLD 4060" } },
    ],
  },
  accountants: {
    fields: [F("Business Name", "text", 12), F("Contact Name", "text", 12), F("Phone Number"), F("Email Address"), F("Address", "addr"), F("Mailing Address", "addr"), F("Notes", "area")],
    entries: [{ v: { "Business Name": "Northside Tax & Accounting", "Contact Name": "Raj Patel", "Phone Number": "07 3555 0190", "Email Address": "raj@northsidetax.example.com", Address: "Level 2, 88 Gympie Rd, Kedron QLD 4031", "Mailing Address": "PO Box 412, Kedron QLD 4031", Notes: "Does both our tax returns each August. Has copies of the last 5 years." } }],
  },
  doctors: {
    fields: [F("Speciality", "text", 12), F("Practice / Clinic", "text", 12), F("Doctor Name", "text", 12), F("Phone Number"), F("Email Address"), F("Address", "addr"), F("Notes", "area")],
    summary: ["Doctor Name", "Speciality", "Practice / Clinic"],
    entries: [
      { v: { Speciality: "GP", "Practice / Clinic": "Northside Family Practice", "Doctor Name": "Dr Priya Nair", "Phone Number": "07 3555 0142", "Email Address": "reception@northsidefp.example.com", Address: "21 Hamilton Rd, Chermside QLD 4032", Notes: "Has a copy of my Advance Health Directive." } },
      { v: { Speciality: "Dermatologist", "Practice / Clinic": "Kedron Skin Clinic", "Doctor Name": "Dr Tom Becker", "Phone Number": "07 3555 0187" } },
    ],
  },
  friends: {
    fields: [F("Name", "text", 12), F("Phone Number"), F("Email Address"), F("Address", "addr"), F("Mailing Address", "addr"), F("Notes", "area")],
    summary: ["Name", "Phone Number", "Email Address"],
    entries: [
      { v: { Name: "Kate Morrison", "Phone Number": "0421 555 630", "Email Address": "kate.morrison@example.com", Address: "8 Ferny Way, Ferny Grove QLD 4055", Notes: "Oldest friend. Has a spare key. Please ask her to tell the book club." } },
      { v: { Name: "Dan & Priya Hughes", "Phone Number": "0422 555 118", "Email Address": "hughesfamily@example.com" } },
    ],
  },
  others: {
    fields: [F("Role / Relationship", "text", 12), F("Name", "text", 12), F("Phone Number"), F("Email Address"), F("Address", "addr"), F("Notes", "area")],
    entries: [{ v: { "Role / Relationship": "Neighbours", Name: "Bill & Anne Walsh", "Phone Number": "07 3555 0263", "Email Address": "walshes@example.com", Address: "29 Jacaranda St, Ashgrove QLD 4060", Notes: "Will feed Biscuit and collect the mail if we're away." } }],
  },
  "device-access": {
    fields: [F("Device Type", "select"), F("Device Name / Label"), F("Make & Model", "text", 12), F("Passcode / Password"), F("Recovery Info", "area", 6), F("Notes", "area")],
    summary: ["Device Name / Label", "Device Type", "Make & Model"],
    entries: [
      { v: { "Device Type": "Phone", "Device Name / Label": "Sarah's iPhone", "Make & Model": "iPhone 15", "Passcode / Password": "••••••", "Recovery Info": "Apple ID recovery key is in the sealed envelope in the fire safe.", Notes: "Photos back up to iCloud - please download them for the kids." } },
      { v: { "Device Type": "Computer", "Device Name / Label": "Home laptop", "Make & Model": "MacBook Air" } },
    ],
  },
  "online-access": {
    fields: [F("Service Type", "select"), F("Service Name"), F("Username / Login"), F("Password"), F("2FA / Recovery", "area"), F("Notes", "area")],
    summary: ["Service Name", "Service Type", "Username / Login"],
    entries: [
      { v: { "Service Type": "Email", "Service Name": "Gmail", "Username / Login": "sarah.taylor@example.com", Password: "••••••••••", "2FA / Recovery": "Backup codes printed and kept in the fire safe.", Notes: "Keep it open for a year so bills and messages can be found, then close." } },
      { v: { "Service Type": "Social Media", "Service Name": "Facebook", "Username / Login": "sarah.taylor@example.com" } },
      { v: { "Service Type": "Shopping", "Service Name": "Woolworths online", "Username / Login": "sarah.taylor@example.com" } },
    ],
  },
  "important-documents": {
    fields: [F("Document Title / Type", "text", 12), F("Location", "area"), F("Instructions", "area")],
    summary: ["Document Title / Type", "Location"],
    entries: [
      { v: { "Document Title / Type": "Birth certificates (all four of us)", Location: "Fire safe, home office - blue folder.", Instructions: "Needed for the estate and for the kids' passports." } },
      { v: { "Document Title / Type": "Marriage certificate", Location: "Fire safe, home office - blue folder." } },
      { v: { "Document Title / Type": "House title & mortgage papers", Location: "With Coastal Bank and a copy in the fire safe." } },
    ],
  },
  "advance-health-directive": {
    fields: [F("Directive document", "file"), F("Title", "text", 12), F("Date signed", "date"), F("Archived on", "date"), F("Notes", "area")],
    entries: [{ name: "Advance Health Directive — Queensland, 2025", v: { "Directive document": "Advance-Health-Directive-signed.pdf", Title: "Advance Health Directive — Queensland, 2025", "Date signed": "03/05/2025", Notes: "Copies given to Dr Nair and to Emma. No resuscitation if there's no chance of recovery." } }],
  },
  "life-insurance": {
    fields: [F("Insurance Provider", "text", 12), F("Policy Number"), F("Cover Amount", "num"), F("Beneficiary", "text", 12), F("Provider Contact", "area"), F("Premium ($)", "num"), F("Renewal Date", "date"), F("Notes", "area")],
    entries: [{ v: { "Insurance Provider": "Harbour Life", "Policy Number": "HL-448210", "Cover Amount": "750,000", Beneficiary: "James Taylor", "Provider Contact": "Claims 1300 555 214 · claims@harbourlife.example.com", "Premium ($)": "1,240", "Renewal Date": "01/03/2027", Notes: "Policy schedule is in the Organiser's Life Insurance folder." } }],
  },
  "health-insurance": {
    fields: [F("Insurance Provider", "text", 12), F("Member Number"), F("Level of Cover"), F("Provider Contact", "area"), F("Premium ($)", "num"), F("Renewal Date", "date"), F("Notes", "area")],
    entries: [{ v: { "Insurance Provider": "Bayside Health Fund", "Member Number": "BH 7721 0034", "Level of Cover": "Gold hospital + extras (family)", "Provider Contact": "13 55 77 · bayside.example.com", "Premium ($)": "4,380", "Renewal Date": "01/07/2027", Notes: "Covers all four of us." } }],
  },
  "vehicle-insurance": {
    fields: [F("Vehicle", "text", 12), F("Provider", "text", 12), F("Policy Number"), F("Cover Type", "select"), F("Premium ($)", "num"), F("Renewal Date", "date"), F("Notes", "area")],
    entries: [{ v: { Vehicle: "2019 Toyota RAV4 GX", Provider: "Sunstate Insurance", "Policy Number": "SI-MV-220981", "Cover Type": "Comprehensive", "Premium ($)": "1,065", "Renewal Date": "14/02/2027", Notes: "Agreed value $28,000." } }],
  },
  "other-insurance": {
    fields: [F("Policy document", "file"), F("Insurer"), F("Policy number"), F("Cover type", "select"), F("Insured property address", "addr"), F("Building sum insured ($)", "num", 4), F("Contents sum insured ($)", "num", 4), F("Excess ($)", "num", 4), F("Annual premium ($)", "num", 4), F("Policy start", "date", 4), F("Renewal date", "date", 4), F("Claims phone")],
    entries: [{ v: { "Policy document": "Home-policy-schedule-2026.pdf", Insurer: "Sunstate Insurance", "Policy number": "SI-HC-551203", "Cover type": "Building & contents", "Insured property address": "27 Jacaranda St, Ashgrove QLD 4060", "Building sum insured ($)": "820,000", "Contents sum insured ($)": "150,000", "Excess ($)": "500", "Annual premium ($)": "2,940", "Policy start": "20/09/2026", "Renewal date": "20/09/2027", "Claims phone": "13 55 90" } }],
  },
  will: {
    single: true,
    fields: [F("Will document", "file"), F("Do you have a Will?", "select"), F("Date Will Signed", "date"), F("Location of Original Will", "area"), F("Executor 1 — Name", "text", 12), F("Executor 1 — Contact notes", "area"), F("Solicitor / Firm", "text", 12), F("Funeral Wishes", "area"), F("Prepaid Funeral?", "select"), F("Prepaid Funeral Provider"), F("Executor 1 — Phone"), F("Executor 1 — Email"), F("Executor 1 — Relationship", "text", 12), F("Executor 2 — Name", "text", 12), F("Executor 2 — Phone"), F("Executor 2 — Email"), F("Executor 2 — Relationship", "text", 12), F("Executor 3 — Name", "text", 12), F("Executor 3 — Phone"), F("Executor 3 — Email"), F("Executor 3 — Relationship", "text", 12)],
    entries: [{ v: { "Will document": "Will-Sarah-Taylor-2024.pdf", "Do you have a Will?": "Yes", "Date Will Signed": "12/03/2024", "Location of Original Will": "Held by Harbourside Legal, 40 Adelaide St, Brisbane. A copy is in the fire safe.", "Executor 1 — Name": "Emma Clarke", "Executor 1 — Contact notes": "My sister. Knows where everything is.", "Solicitor / Firm": "Harbourside Legal - Michael Chen", "Funeral Wishes": "A small, relaxed farewell by the water at Sandgate. Cremation. See my Wishes in the Planner.", "Prepaid Funeral?": "No", "Executor 1 — Phone": "0412 555 018", "Executor 1 — Email": "emma.clarke@example.com", "Executor 1 — Relationship": "Sister", "Executor 2 — Name": "James Taylor", "Executor 2 — Phone": "0413 555 774", "Executor 2 — Email": "james.taylor@example.com", "Executor 2 — Relationship": "Partner" } }],
  },
  "bank-accounts": {
    fields: [F("Institution"), F("Account Type", "select"), F("Account Name", "text", 12), F("BSB", "text", 4), F("Account Number", "text", 4), F("Card Last 4", "text", 4), F("Branch / Contact", "area"), F("Notes", "area")],
    summary: ["Institution", "Account Type", "Account Name"],
    entries: [
      { v: { Institution: "Coastal Bank", "Account Type": "Transaction / Everyday", "Account Name": "S & J Taylor Everyday", BSB: "123-456", "Account Number": "1234 5678", "Card Last 4": "4821", "Branch / Contact": "Ashgrove branch · 13 22 99", Notes: "Joint with James. Bills come out of this one." } },
      { v: { Institution: "Coastal Bank", "Account Type": "Savings", "Account Name": "Taylor Family Saver" } },
      { v: { Institution: "Southern Cross Card", "Account Type": "Credit Card", "Account Name": "Sarah Taylor Platinum" } },
    ],
  },
  "investment-accounts": {
    fields: [F("Investment Type", "select"), F("Institution / Broker"), F("Account / HIN", "text", 12), F("Approx. Value ($)", "num"), F("Last Reviewed", "date"), F("Contact / Adviser", "area"), F("Notes", "area")],
    entries: [{ v: { "Investment Type": "ETF", "Institution / Broker": "Southbank Brokers", "Account / HIN": "X0012345678", "Approx. Value ($)": "42,000", "Last Reviewed": "30/06/2026", "Contact / Adviser": "Online account - statements by email.", Notes: "Kids' education fund." } }],
  },
  superannuation: {
    fields: [F("Fund Name", "text", 12), F("Member Number"), F("Approx. Balance", "num"), F("Beneficiary", "text", 12), F("Fund Contact", "area"), F("Insurance in Superannuation", "area"), F("Notes", "area")],
    entries: [{ v: { "Fund Name": "Riverbend Super", "Member Number": "RB 3301 7752", "Approx. Balance": "186,000", Beneficiary: "James Taylor (binding nomination)", "Fund Contact": "1300 555 787 · riverbend.example.com", "Insurance in Superannuation": "Death & TPD cover $500,000.", Notes: "Nomination renewed March 2026." } }],
  },
  "open-loans": {
    fields: [F("Statement document", "file"), F("Loan", "select"), F("Statement date", "date")],
    entries: [{ v: { "Statement document": "Home-loan-statement-Oct-2026.pdf", Loan: "Home loan — Coastal Bank", "Statement date": "31/10/2026" } }],
  },
  "other-financial": {
    fields: [F("Budget document", "file"), F("Title", "text", 12), F("Date", "date"), F("Archived on", "date"), F("Notes", "area")],
    entries: [{ name: "Family budget 2026–2027", v: { "Budget document": "Taylor-budget-2026-27.xlsx", Title: "Family budget 2026–2027", Date: "01/07/2026", Notes: "Shows every regular bill and when it's due." } }],
  },
  "my-property": {
    fields: [F("Property address", "addr"), F("Ownership", "select"), F("Local council"), F("Annual rates ($)", "num", 4), F("Annual water ($)", "num", 4), F("Rent per week ($)", "num", 4), F("Bond amount ($)", "num"), F("Date of occupancy", "date"), F("Renewal / review date", "date"), F("Notes", "area")],
    entries: [{ v: { "Property address": "27 Jacaranda St, Ashgrove QLD 4060", Ownership: "Owner-occupied", "Local council": "Brisbane City Council", "Annual rates ($)": "2,480", "Annual water ($)": "1,320", "Date of occupancy": "15/01/2016", Notes: "Mortgage with Coastal Bank - see Open Loans." } }],
  },
  "vehicle-information": {
    fields: [F("Make & Model"), F("Year", "num", 3), F("Colour", "text", 3), F("Registration No."), F("Registration Expiry", "date"), F("VIN / Chassis No.", "text", 12), F("Finance / Loan Details", "area"), F("Notes", "area")],
    entries: [{ v: { "Make & Model": "Toyota RAV4 GX", Year: "2019", Colour: "Silver", "Registration No.": "123 ABC", "Registration Expiry": "03/12/2026", "VIN / Chassis No.": "JTMRWRFV00D012345", "Finance / Loan Details": "Paid off.", Notes: "Spare key in the kitchen drawer." } }],
  },
}

// Family Members roster (users table) - the fields PlannerPeopleView shows.
const PEOPLE: Record<string, { name: string; fields: [string, string][] }[]> = {
  "my-personal-information": [
    { name: "Sarah Taylor", fields: [["Date of birth", "14 Jun 1984"], ["Mobile", "0412 555 301"], ["Email", "sarah.taylor@example.com"], ["Home address", "27 Jacaranda St, Ashgrove QLD 4060"], ["Mailing address", "PO Box 88, Ashgrove QLD 4060"]] },
  ],
  "family-members": [
    { name: "James Taylor", fields: [["Date of birth", "2 Sep 1982"], ["Mobile", "0413 555 774"], ["Email", "james.taylor@example.com"], ["Home address", "27 Jacaranda St, Ashgrove QLD 4060"]] },
    { name: "Mia Taylor", fields: [["Date of birth", "9 Mar 2011"], ["Mobile", "0414 555 902"], ["Home address", "27 Jacaranda St, Ashgrove QLD 4060"]] },
    { name: "Leo Taylor", fields: [["Date of birth", "21 Jul 2015"], ["Home address", "27 Jacaranda St, Ashgrove QLD 4060"]] },
  ],
}

const TEXTS: Record<string, string> = {
  "wishes-general": `I'd like a small, relaxed farewell — no black, please. Somewhere by the water at Sandgate, with the kids' favourite songs and a sausage sizzle afterwards.

I'd like to be cremated and my ashes scattered at Shorncliffe Pier, where James and I had our first date.

Please donate my clothes to the op shop on Gympie Road, and give my books to Mia — she'll know which ones to keep.

Most of all: keep Saturday pancakes going for Mia and Leo.`,
  "wishes-spouse": `James — please don't do this alone. Let Emma and your mum help with school pick-ups for a while.

Keep the house if you can; the kids love it. My jewellery box is for Mia, except Nan's ring, which is for Leo to give to someone one day.

And yes, you can finally paint the lounge room that green.`,
  "wishes-children": `Mia and Leo — I want you to finish school, but more than that I want you to be kind and to look after each other.

Mia: my books and my camera are yours. Leo: Grandad's fishing gear and the telescope.

Please keep going to Auntie Emma's for Christmas.`,
  "wishes-relatives": `Mum and Dad — thank you for everything. Please keep having the kids for a week every school holidays.

Emma — thank you for being my executor. Take my good kitchen knives; you always wanted them.`,
  "wishes-friends": `Kate and the book club — have a long lunch on me (there's money set aside for it).

Please check in on James now and then, especially around the kids' birthdays.`,
  "wishes-pets": `Biscuit (our kelpie) stays with James and the kids. If that isn't possible, Emma has said she'll take him.

Vet: Ashgrove Vet Clinic. He's on joint tablets each morning - they're in the laundry cupboard.`,
  "wishes-other": `Please plant a jacaranda in the backyard for me.

Donate to the Queensland Cancer Council in lieu of flowers.`,
  "last-words": `To everyone I love — thank you for a wonderful, ordinary, happy life.

Don't be sad for too long. Go to the beach, eat the pancakes, laugh loudly. I'll be there in all of it.

Sarah x`,
}

const LETTER = `If you're reading this, thank you for saying yes to being my executor. You've always been the one I ring first.

Please help James keep things as normal as possible for Mia and Leo — pancakes on Saturdays, footy on Sundays and the beach at Christmas. Everything you'll need is in my Planner.

Love you heaps, Em.
Sarah x`
const LETTERS = [
  { to: "Mia", p: "My darling girl, I am so proud of the kind, brave young woman you're becoming…" },
  { to: "Leo", p: "Hey buddy, remember our camping trip to Noosa when the tent blew away?…" },
  { to: "Emma", p: "If you're reading this, thank you for saying yes to being my executor. You've always been the one I ring first." },
]
const APOLOGIES = [
  { to: "Kate", p: "I'm sorry I missed your 40th. I should have been there, and I've thought about it every year since." },
  { to: "Dad", p: "I'm sorry for the years I didn't call enough. You were always right about the car." },
]

const INTRO = "The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view."
const NOTE = "One document, in the same order as the printed Planner — to keep somewhere safe."
const PRIVACY = "Only you can see what you write here. Use the Share button on each entry to send a copy to a specific person — they get an email invite and can only see what you pick."
const SHARED_WITH_YOU = "Other Adulting Life users have shared items with you. Open any section below marked Shared to see what they shared."
const SEC_INTRO: Partial<Record<Editor, string>> = {
  letters: "Write letters to the people who matter to you. Each one starts with \"Dear\" and can be as long or short as you like.",
  apologies: "Things you'd want to say to someone, from the heart. Each apology starts with a name.",
  last: "The last thing you'd want to say to the people you leave behind.",
}

// ── 1. The Planner index (page.tsx) ──────────────────────────────────────────

type Viewer = "sarah" | "emma"
// What Emma (Sarah's sister) sees once Sarah has shared with her: her own rows
// plus the shared ones ("N shared").
const EMMA_ROWS: Record<string, { own: number; shared: number }> = {
  attorneys: { own: 0, shared: 1 }, doctors: { own: 1, shared: 2 }, will: { own: 0, shared: 1 },
  "wishes-general": { own: 0, shared: 0 }, "wishes-children": { own: 0, shared: 0 }, letters: { own: 0, shared: 0 },
}
function rowInfo(viewer: Viewer, s: Sec): { own: number; shared: number } | null {
  if (viewer === "emma") return EMMA_ROWS[s.slug] ?? null
  return { own: s.kind === "organiser" ? (ORG[s.slug]?.entries.length ?? 0) : 0, shared: 0 }
}
// Room left for the title + hint beside the right-hand count (wider with a "N shared" badge).
function rowTextW(v: V, badge: boolean) { return v.w - 32 - 36 - (badge ? (v.phone ? 176 : 220) : v.phone ? 96 : 130) }
function rowH(v: V, s: Sec, badge: boolean) {
  const tw = rowTextW(v, badge)
  const tl = v.phone ? lines(s.title, tw, 8.6) : 1
  return 24 + tl * 24 + (s.hint ? 2 + lines(s.hint, tw, 6.5) * 16 : 0)
}

interface IndexBuild { h: number; r: Record<string, Rect>; row: Record<string, Rect>; group: Record<string, Rect>; node: (extra?: ReactNode, fabs?: boolean) => ReactNode }

function buildIndex(v: V, viewer: Viewer): IndexBuild {
  const { x, w, phone } = v
  const r: Record<string, Rect> = {}
  const sharedLines = lines(SHARED_WITH_YOU, w - 40, 6.3)
  let y = v.top
  r.crumb = { x, y, w: 90, h: 20 }; y += 22
  r.title = { x, y, w: phone ? w : 600, h: 40 }; y += 46
  const introW = phone ? w : 672
  r.intro = { x, y, w: introW, h: lines(INTRO, introW, 7.6) * 24 }; y += r.intro.h + 24
  const [dw, sw] = pdfW(v)
  r.dl = { x, y, w: dw, h: 36 }
  r.share = { x: x + dw + 8, y, w: sw, h: 36 }
  if (phone) { r.note = { x, y: y + 44, w, h: 32 }; y += 44 + 32 + 24 } else { r.note = { x: x + dw + sw + 24, y: y + 8, w: 560, h: 20 }; y += 36 + 24 }
  const bw = phone ? w : 768
  r.banner = { x, y, w: bw, h: bw / 4 }; y += bw / 4 + 24
  if (viewer === "emma") {
    // On a phone the PDF buttons wrap under the "Everything … shared" label.
    const bh = 16 + 20 + 4 + sharedLines * 16 + 12 + (phone ? 28 : 0) + 36 + 16
    r.sharedBox = { x, y, w, h: bh }
    const by = y + 16 + 24 + sharedLines * 16 + 12 + (phone ? 28 : 0)
    r.sharedDl = { x: x + 20 + (phone ? 0 : 296), y: by, w: dw, h: 36 }
    r.sharedShare = { x: r.sharedDl.x + dw + 8, y: by, w: sw, h: 36 }
    y += bh + 24
  }
  const row: Record<string, Rect> = {}
  const group: Record<string, Rect> = {}
  for (const g of GROUPS) {
    const secs = SECTIONS.filter((s) => s.group === g && rowInfo(viewer, s))
    if (!secs.length) continue
    const gy = y
    y += 36
    for (const s of secs) { const h = rowH(v, s, (rowInfo(viewer, s)?.shared ?? 0) > 0); row[s.slug] = { x, y, w, h }; y += h + 8 }
    y -= 8
    group[g] = { x, y: gy, w, h: y - gy }
    y += 24
  }
  const h = Math.max(v.H, y + 40)
  // The round buttons are fixed to the window: on the tall, scrolling index they're
  // drawn in the player's fixed layer instead (see FIXED), except on the step that
  // zooms in on them (fabs = true, page at the top).
  const node = (extra?: ReactNode, fabs = false) => (
    <Frame v={v} h={h} who={viewer === "sarah" ? "Sarah" : "Emma"} fabs={fabs}>
      <Box {...r.crumb} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box {...r.title} className="font-display text-3xl leading-10">Peace of Mind Planner</Box>
      <Box {...r.intro} className={`leading-6 text-tal-plum-soft ${phone ? "text-[15px]" : ""}`}>{INTRO}</Box>
      <PdfPair v={v} dl={r.dl} share={r.share} />
      <Box {...r.note} className="text-xs text-tal-plum-soft">{NOTE}</Box>
      <Img src="/thumbnails/banners/planner.jpg" {...r.banner} className="rounded-2xl border border-tal-line" />
      {viewer === "emma" && (
        <>
          <Box {...r.sharedBox} className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
            <div className="mb-1 text-sm font-medium text-violet-900">Shared with you</div>
            <div className="text-xs leading-4 text-violet-900/80" style={{ height: sharedLines * 16 }}>Other Adulting Life users have shared items with you. Open any section below marked <span className="font-semibold">Shared</span> to see what they shared.</div>
          </Box>
          <Box x={x + 20} y={phone ? r.sharedDl.y - 28 : r.sharedDl.y} w={phone ? w - 40 : 290} h={phone ? 20 : 36} className="flex items-center text-xs font-medium text-violet-900">Everything Sarah Taylor has shared with you:</Box>
          <PdfPair v={v} dl={r.sharedDl} share={r.sharedShare} />
        </>
      )}
      {Object.entries(group).map(([g, gr]) => <Box key={g} x={gr.x} y={gr.y} w={gr.w} h={28} className="font-display text-lg leading-7">{g}</Box>)}
      {SECTIONS.filter((s) => row[s.slug]).map((s) => {
        const info = rowInfo(viewer, s)!
        const org = s.kind === "organiser"
        return (
          <Box key={s.slug} {...row[s.slug]} className="flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-tal-line bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${org ? "bg-tal-cream-soft text-tal-plum ring-1 ring-tal-line" : "bg-white text-tal-plum-soft ring-1 ring-dashed ring-tal-line"}`}>{org ? "↔" : "◇"}</span>
              <div className="min-w-0">
                <div className="font-medium leading-6 text-tal-plum">{s.title}</div>
                {s.hint && <div className="mt-0.5 text-xs leading-4 text-tal-plum-soft">{s.hint}</div>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {org ? (
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${info.own > 0 ? "text-green-700" : "text-tal-plum-soft"}`}>{info.own > 0 ? `${info.own} ${info.own === 1 ? "entry" : "entries"}` : "No entries yet"}</span>
                  {info.shared > 0 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-800">{info.shared} shared</span>}
                </div>
              ) : <span className="text-xs text-tal-plum-soft">Planner-only</span>}
              <span className="text-sm text-tal-plum-soft">→</span>
            </div>
          </Box>
        )
      })}
      {extra}
    </Frame>
  )
  return { h, r, row, group, node }
}

// ── 2. A section page ([section]/page.tsx) ───────────────────────────────────

interface SecBuild { h: number; r: Record<string, Rect>; items: Rect[]; itemShare: Rect[]; node: (extra?: ReactNode) => ReactNode }

const fieldCtrlH = (f: Fld) => (f.t === "area" ? 64 : f.t === "file" ? 44 : 40)

/** One field (label + control), like PageForm's inputs. */
function FieldBox({ r, f, value }: { r: Rect; f: Fld; value?: string }) {
  const ctrl = "rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
  return (
    <Box {...r}>
      <div className="mb-1 truncate text-xs uppercase tracking-wider text-tal-plum-soft">{f.l}</div>
      {f.t === "file" ? (
        value ? (
          <div className="flex h-11 items-center gap-2">
            <span className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-tal-line bg-tal-cream-soft/50 px-3 text-sm"><PdfGlyph /><span className="truncate">{value}</span></span>
            <span className="flex h-11 shrink-0 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">View</span>
          </div>
        ) : <div className="flex h-11 w-48 items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Upload &amp; scan a file</div>
      ) : f.t === "area" ? (
        <div className={`${ctrl} h-16 overflow-hidden whitespace-pre-wrap py-2 leading-5`}>{value}</div>
      ) : (
        <div className={`${ctrl} flex h-10 items-center justify-between gap-2`}>
          <span className="truncate">{value}</span>
          {f.t === "select" && <span className="text-xs text-tal-plum-soft">▾</span>}
          {f.t === "date" && <span className="text-xs text-tal-plum-soft">📅</span>}
        </div>
      )}
    </Box>
  )
}

/** Fields laid out on PageForm's 12-column grid (one column on a phone). */
function layoutFields(v: V, x: number, y: number, w: number, fields: Fld[]) {
  const out: { f: Fld; r: Rect }[] = []
  const gap = 16
  let i = 0
  while (i < fields.length) {
    const rowF: Fld[] = []
    let sum = 0
    while (i < fields.length && (rowF.length === 0 || (!v.phone && sum + fields[i].s <= 12))) { rowF.push(fields[i]); sum += fields[i].s; i++ }
    const rh = Math.max(...rowF.map((f) => 22 + fieldCtrlH(f)))
    let fx = x
    for (const f of rowF) {
      const fw = v.phone ? w : Math.round(((w + gap) * f.s) / 12 - gap)
      out.push({ f, r: { x: fx, y, w: fw, h: rh } })
      fx += fw + gap
    }
    y += rh + 12
  }
  return { out, y }
}

/** An entry card (PageForm renderInstance), or the single form's card. */
function buildCard(v: V, x: number, y: number, w: number, d: Org, e: Entry, i: number) {
  const nodes: ReactNode[] = []
  const r: Record<string, Rect> = {}
  let py = y + 16
  const ix = x + 16
  const iw = w - 32
  if (!d.single) {
    const [dw, sw] = pdfW(v)
    const right = x + w - 16
    r.pdfShare = { x: right - sw, y: py, w: sw, h: 36 }
    r.pdfDl = { x: r.pdfShare.x - 8 - dw, y: py, w: dw, h: 36 }
    r.share = { x: r.pdfDl.x - 8 - 36, y: py, w: 36, h: 36 }
    nodes.push(
      <Box key={`h${i}`} x={ix} y={py} w={r.share.x - ix - 8} h={36} className="flex items-center truncate text-xs uppercase tracking-wider text-tal-plum-soft">
        {e.name ? <span className="truncate text-sm font-medium normal-case tracking-normal text-tal-plum">{e.name}</span> : <>Entry {i + 1}</>}
      </Box>,
      <ShareBtn key={`s${i}`} r={r.share} />,
      <PdfPair key={`p${i}`} v={v} dl={r.pdfDl} share={r.pdfShare} />,
    )
    py += 36 + 12
  }
  const lf = layoutFields(v, ix, py, iw, d.fields)
  lf.out.forEach(({ f, r: fr }) => nodes.push(<FieldBox key={`${i}-${f.l}`} r={fr} f={f} value={e.v[f.l]} />))
  r.fields = { x: ix, y: py, w: iw, h: lf.y - py }
  py = lf.y + 4
  r.save = { x: ix, y: py, w: 76, h: 40 }
  nodes.push(<Box key={`sv${i}`} {...r.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>)
  py += 40 + 16
  r.card = { x, y, w, h: py - y }
  return { nodes: [<Box key={`c${i}`} {...r.card} className="rounded-2xl border border-tal-line bg-white" />, ...nodes], r, h: py - y }
}

function buildSection(v: V, s: Sec, opts: { viewer?: Viewer; form?: boolean; dotEmma?: boolean } = {}): SecBuild {
  const { x, w, phone } = v
  const ed = editorOf(s)
  const grantee = opts.viewer === "emma"
  const r: Record<string, Rect> = {}
  const nodes: ReactNode[] = []
  const items: Rect[] = []
  const itemShare: Rect[] = []
  let y = v.top

  // Breadcrumbs - the "Back to Planner" button and the trail.
  r.back = { x, y, w: 146, h: 36 }; y += 44
  const crumb = `Dashboard · Peace of Mind Planner · ${s.title}`
  r.crumb = { x, y, w, h: lines(crumb, w, 7.1) * 20 }; y += r.crumb.h + 12
  nodes.push(
    <Box key="back" {...r.back} className="flex items-center gap-1.5 rounded-lg border border-tal-line bg-white px-3 text-sm text-tal-plum">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Back to Planner
    </Box>,
    <Box key="crumb" {...r.crumb} className="text-sm leading-5 text-tal-plum-soft">Dashboard · Peace of Mind Planner · <span className="text-tal-plum">{s.title}</span></Box>,
  )

  // Title row + its buttons (share for wishes / last words, PDF pair, Excel).
  const btns: { k: string; w: number }[] = []
  if ((ed === "wish" || ed === "last") && !grantee) btns.push({ k: "share", w: 36 })
  const [dw, sw] = pdfW(v)
  btns.push({ k: "dl", w: dw }, { k: "pdfshare", w: sw })
  if (!grantee) btns.push({ k: "excel", w: phone ? 34 : 140 })
  const bw = btns.reduce((a, b) => a + b.w, 0) + (btns.length - 1) * 8
  let bx = x + w - bw
  for (const b of btns) { r[b.k] = { x: bx, y, w: b.w, h: 36 }; bx += b.w + 8 }
  const titleW = w - bw - 12
  r.title = { x, y, w: titleW, h: lines(s.title, titleW, 15.5) * 38 }
  nodes.push(<Box key="title" {...r.title} className="font-display text-3xl leading-[38px]">{s.title}</Box>)
  if (r.share) nodes.push(<ShareBtn key="shareH" r={r.share} />)
  nodes.push(<PdfPair key="pdfH" v={v} dl={r.dl} share={r.pdfshare} />)
  if (r.excel) nodes.push(<Box key="excel" {...r.excel} className={btnLine}><ExcelGlyph />{!phone && "Export to Excel"}</Box>)
  y += Math.max(r.title.h, 36) + 4

  if (s.hint) {
    r.hint = { x, y, w, h: lines(s.hint, w, 7) * 20 }
    nodes.push(<Box key="hint" {...r.hint} className="text-sm italic leading-5 text-tal-plum-soft">{s.hint}</Box>)
    y += r.hint.h + 16
  } else y += 12
  if (GROUP_BANNER[s.group]) {
    const bwid = phone ? w : 768
    r.banner = { x, y, w: bwid, h: bwid / 4 }
    nodes.push(<Img key="banner" src={GROUP_BANNER[s.group]} {...r.banner} className="rounded-2xl border border-tal-line" />)
    y += bwid / 4 + 16
  }
  const introText = ed === "org" ? `Same ${s.title.toLowerCase()} as your Organiser. Add, edit or delete from either view — both stay in sync.` : SEC_INTRO[ed]
  if (introText && !grantee) {
    const iw = phone ? w : 672
    r.intro = { x, y, w: iw, h: lines(introText, iw, 7) * 20 }
    nodes.push(<Box key="intro" {...r.intro} className="text-sm leading-5 text-tal-plum-soft">{introText}</Box>)
    y += r.intro.h + 24
  }
  if (ed === "people") {
    const t = "These details come from Family Members in your Organiser. Edit in Family Members"
    const iw = phone ? w : 672
    r.intro = { x, y, w: iw, h: lines(t, iw, 7) * 20 }
    nodes.push(<Box key="pintro" {...r.intro} className="text-sm leading-5 text-tal-plum-soft">These details come from Family Members in your Organiser. <span className="text-tal-plum underline">Edit in Family Members</span></Box>)
    y += r.intro.h + 24
  }
  if ((ed === "wish" || ed === "last" || ed === "letters" || ed === "apologies") && !grantee) {
    const nl = lines(PRIVACY, w - 32 - 40, 6.3)
    r.privacy = { x, y, w, h: 24 + 20 + 2 + nl * 16 }
    nodes.push(
      <Box key="priv" {...r.privacy} className="flex items-start gap-3 rounded-xl border border-tal-line bg-tal-cream-soft px-4 py-3 text-sm">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-tal-line"><LockGlyph /></span>
        <div className="min-w-0">
          <div className="font-medium">Private until you share</div>
          <div className="mt-0.5 text-xs leading-4 text-tal-plum-soft">Only you can see what you write here. Use the <span className="font-medium text-tal-plum">Share</span> button on each entry to send a copy to a specific person — they get an email invite and can only see what you pick.</div>
        </div>
      </Box>,
    )
    y += r.privacy.h + 20
  }
  r.content = { x, y, w, h: 0 }

  // ── The section's editor ──
  if (ed === "org") {
    const d = ORG[s.slug]
    if (d.single) {
      // Single form: toolbar (share + PDF) then the form.
      r.pdfShareT = { x: x + w - sw, y, w: sw, h: 36 }
      r.pdfDlT = { x: r.pdfShareT.x - 8 - dw, y, w: dw, h: 36 }
      r.shareT = { x: r.pdfDlT.x - 8 - 36, y, w: 36, h: 36 }
      nodes.push(<ShareBtn key="shT" r={r.shareT} />, <PdfPair key="pdT" v={v} dl={r.pdfDlT} share={r.pdfShareT} />)
      y += 52
      const c = buildCard(v, x, y, w, d, d.entries[0], 0)
      nodes.push(...c.nodes)
      r.card = c.r.card; r.fields = c.r.fields; r.save = c.r.save
      y += c.h + 24
    } else {
      // Repeatable: whole-list PDF, summary table, entry cards, + Add another.
      r.listShare = { x: x + w - sw, y, w: sw, h: 36 }
      r.listDl = { x: r.listShare.x - 8 - dw, y, w: dw, h: 36 }
      nodes.push(<PdfPair key="pdL" v={v} dl={r.listDl} share={r.listShare} />)
      y += 36 + 24
      if (d.entries.length > 1) {
        const cols = d.summary ?? d.fields.filter((f) => f.t !== "file").slice(0, 3).map((f) => f.l)
        r.table = { x, y, w, h: 32 + d.entries.length * 37 }
        nodes.push(
          <Box key="table" {...r.table} className="overflow-hidden rounded-2xl border border-tal-line bg-white text-sm">
            <div className="flex h-8 items-center bg-tal-cream-soft text-xs uppercase tracking-wider text-tal-plum-soft">
              <span className="w-8 shrink-0 px-3">#</span>
              {cols.map((c) => <span key={c} className={`${phone ? "w-40" : "flex-1"} shrink-0 truncate px-3`}>{c}</span>)}
            </div>
            {d.entries.map((e, n) => (
              <div key={n} className="flex h-[37px] items-center border-t border-tal-line">
                <span className="w-8 shrink-0 px-3 text-tal-plum-soft">{n + 1}</span>
                {cols.map((c) => <span key={c} className={`${phone ? "w-40" : "flex-1"} shrink-0 truncate whitespace-nowrap px-3`}>{e.v[c] || <span className="text-tal-plum-soft">—</span>}</span>)}
              </div>
            ))}
          </Box>,
        )
        y += r.table.h + 24
      }
      d.entries.forEach((e, n) => {
        const c = buildCard(v, x, y, w, d, e, n)
        nodes.push(...c.nodes)
        if (n === 0) { r.card = c.r.card; r.fields = c.r.fields; r.save = c.r.save; r.entryShare = c.r.share }
        y += c.h + 24
      })
      r.addAnother = { x, y, w: 140, h: 40 }
      nodes.push(<Box key="add" {...r.addAnother} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>)
      y += 40 + 24
    }
  } else if (ed === "people") {
    const ppl = PEOPLE[s.slug]
    ppl.forEach((p, n) => {
      const rowsH = p.fields.reduce((a, [, val]) => a + (phone ? 28 + lines(val, w - 40, 7) * 20 : lines(val, w - 40 - 184, 7) * 20) + 8, 0) - 8
      const cr = { x, y, w, h: 20 + 28 + 8 + rowsH + 20 }
      if (n === 0) r.card = cr
      nodes.push(
        <Box key={p.name} {...cr} className="rounded-2xl border border-tal-line bg-white p-5">
          <h2 className="mb-2 font-display text-lg leading-7">{p.name}</h2>
          <dl className={`grid gap-x-6 gap-y-2 text-sm leading-5 ${phone ? "" : "grid-cols-[10rem_1fr]"}`}>
            {p.fields.map(([l, val]) => (
              <div key={l} className="contents">
                <dt className="text-tal-plum-soft">{l}</dt>
                <dd className="whitespace-pre-wrap text-tal-plum">{val}</dd>
              </div>
            ))}
          </dl>
        </Box>,
      )
      y += cr.h + 16
    })
  } else if (ed === "wish" || ed === "last") {
    if (grantee) {
      y = sharedHeader(v, y, nodes)
    } else {
      const rows = ed === "last" ? 24 : 20
      const taH = rows * 20 + 16
      const cr = { x, y, w, h: 20 + taH + 16 + 36 + 20 }
      r.card = cr
      r.editor = { x: x + 20, y: y + 20, w: w - 40, h: taH }
      r.save = { x: x + w - 20 - 68, y: y + 20 + taH + 16, w: 68, h: 36 }
      nodes.push(
        <Box key="ed" {...cr} className="rounded-2xl border border-tal-line bg-white" />,
        <Box key="ta" {...r.editor} className="overflow-hidden whitespace-pre-wrap rounded-xl border border-tal-line px-3 py-2 font-serif text-sm leading-5 ring-2 ring-tal-plum/30">
          {TEXTS[s.slug]}<motion.span className="ml-0.5 inline-block h-4 w-px bg-black align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
        </Box>,
        <Box key="st" x={x + 20} y={r.save.y} w={200} h={36} className="flex items-center text-xs text-tal-plum-soft">Saved</Box>,
        <Box key="sv" {...r.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>,
      )
      y += cr.h + 24
    }
  } else if (grantee) {
    // Emma's Letters: SharedItemsView only (read-only).
    y = sharedHeader(v, y, nodes)
    const lh = lines(LETTER, w - 32, 7.6) * 20 + 7 * 20
    r.card = { x, y, w, h: 24 + lh }
    nodes.push(
      <Box key="shL" {...r.card} className="rounded-xl border border-tal-line bg-tal-cream-soft/40 px-4 py-3">
        <div className="mb-1 font-medium">Dear Emma</div>
        <div className="whitespace-pre-wrap font-serif text-sm leading-5">{LETTER}</div>
      </Box>,
    )
    y += r.card.h + 24
  } else if (opts.form) {
    // PlannerLettersEditor - the new-letter form.
    r.backTo = { x, y, w: 150, h: 20 }
    nodes.push(<Box key="bk" {...r.backTo} className="text-sm text-tal-plum-soft">← Back to letters</Box>)
    y += 32
    const taH = 16 * 20 + 16
    const cr = { x, y, w, h: 20 + 26 + 24 + 44 + 16 + 24 + taH + 20 + 40 + 20 }
    r.card = cr
    let cy = y + 20
    nodes.push(<Box key="fc" {...cr} className="rounded-2xl border border-tal-line bg-white" />,
      <Box key="nl" x={x + 20} y={cy} w={200} h={14} className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">New letter</Box>)
    cy += 26
    nodes.push(<Box key="dl" x={x + 20} y={cy} w={200} h={20} className="text-sm text-tal-plum-soft">Dear</Box>)
    cy += 24
    r.dear = { x: x + 20, y: cy, w: w - 40, h: 44 }
    nodes.push(<Box key="di" {...r.dear} className="flex items-center rounded-xl border border-tal-line px-3 text-sm">Emma</Box>)
    cy += 44 + 16
    nodes.push(<Box key="yl" x={x + 20} y={cy} w={200} h={20} className="text-sm text-tal-plum-soft">Your letter</Box>)
    cy += 24
    r.editor = { x: x + 20, y: cy, w: w - 40, h: taH }
    nodes.push(<Box key="lt" {...r.editor} className="overflow-hidden whitespace-pre-wrap rounded-xl border border-tal-line px-3 py-2 font-serif text-sm leading-5 ring-2 ring-tal-plum/30"><Typed text={LETTER} delay={900} speed={18} /></Box>)
    cy += taH + 20
    r.save = { x: x + w - 20 - 76, y: cy, w: 76, h: 40 }
    nodes.push(<Box key="cn" x={r.save.x - 92} y={cy} w={84} h={40} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>,
      <Box key="sv" {...r.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>)
    y += cr.h + 24
  } else {
    // Letters / Apologies list.
    const list = ed === "letters" ? LETTERS : APOLOGIES
    const noun = ed === "letters" ? ["letter", "letters"] : ["apology", "apologies"]
    r.count = { x, y, w: 200, h: 36 }
    r.add = { x: x + w - 128, y, w: 128, h: 36 }
    nodes.push(<Box key="cnt" {...r.count} className="flex items-center text-sm text-tal-plum-soft">{list.length} {noun[1]}</Box>,
      <Box key="add" {...r.add} className="flex items-center justify-center gap-1.5 rounded-xl bg-black text-sm font-medium text-white"><PlusIcon />Add {noun[0]}</Box>)
    y += 36 + 12
    const top = y
    list.forEach((l) => {
      const ir = { x, y, w, h: 64 }
      items.push(ir)
      const sh = { x: x + w - 16 - 36, y: y + 14, w: 36, h: 36 }
      itemShare.push(sh)
      nodes.push(
        <Box key={l.to} {...ir} className="flex items-center gap-2 rounded-xl border border-tal-line bg-white px-4">
          <div className="min-w-0 flex-1">
            <div className="font-medium leading-6">{ed === "letters" ? "Dear" : "To"} {l.to}</div>
            <div className="truncate text-xs text-tal-plum-soft">{l.p}</div>
          </div>
          <span className="mr-11 text-tal-plum-soft">›</span>
        </Box>,
        <ShareBtn key={`sh-${l.to}`} r={sh} shared={opts.dotEmma && l.to === "Emma"} />,
      )
      y += 64 + 8
    })
    r.list = { x, y: top, w, h: y - 8 - top }
    y += 16
  }

  const h = Math.max(v.H, y + 40)
  r.content.h = y - r.content.y
  const node = (extra?: ReactNode) => <Frame v={v} h={h} who={grantee ? "Emma" : "Sarah"}>{nodes}{extra}</Frame>
  return { h, r, items, itemShare, node }
}

/** SharedItemsView's heading (mt-10, border-top). */
function sharedHeader(v: V, y: number, nodes: ReactNode[]) {
  const { x, w } = v
  y += 16
  nodes.push(
    <Box key="shl" x={x} y={y} w={w} h={1} className="bg-tal-line" />,
    <Box key="sht" x={x} y={y + 20} w={w} h={28} className="font-display text-xl leading-7">Shared with you</Box>,
    <Box key="shs" x={x} y={y + 52} w={w} h={v.phone ? 32 : 16} className="text-xs leading-4 text-tal-plum-soft">These items belong to other Adulting Life users who have chosen to share them with you. Read-only.</Box>,
    <Box key="shb" x={x} y={y + (v.phone ? 108 : 92)} w={w} h={16} className="text-xs uppercase tracking-widest text-tal-plum-soft">Shared by Sarah Taylor</Box>,
  )
  return y + (v.phone ? 136 : 120)
}

// ── 3. Pop-ups and other screens ─────────────────────────────────────────────

const Dim = ({ h }: { h: number }) => <Box x={0} y={0} w={1200} h={h} className="bg-black/40" />

/** EmailFileDialog - what Share PDF opens. */
function emailDialog(v: V, top: number) {
  const dw = v.phone ? v.W - 32 : 448
  const dh = 392
  const d = { x: (v.W - dw) / 2, y: top + (v.H - dh) / 2, w: dw, h: dh }
  const send = { x: d.x + dw - 20 - 70, y: d.y + dh - 20 - 40, w: 70, h: 40 }
  const node = (h: number) => (
    <>
      <Box x={0} y={0} w={v.W} h={h} className="bg-black/50" />
      <Box {...d} className="rounded-2xl bg-white p-5 text-left text-tal-plum shadow-xl">
        <div className="font-display text-lg">Share by email</div>
        <p className="mt-1 truncate text-xs text-tal-plum-soft">Your Peace of Mind Planner (PDF), made by The Adulting Life</p>
        <div className="mb-1 mt-4 text-sm">Recipient&apos;s email</div>
        <div className="flex h-11 items-center rounded-xl border border-tal-line px-3 text-sm ring-2 ring-tal-plum/30"><Typed text="emma.clarke@example.com" /></div>
        <div className="mb-1 mt-3 text-sm">Message <span className="text-tal-plum-soft">(optional)</span></div>
        <div className="h-[76px] rounded-xl border border-tal-line px-3 py-2 text-sm">A copy of my Planner, Em - just in case. x</div>
        <p className="mt-2 text-xs text-tal-plum-soft">Sent from The Adulting Life with your name on it. Replies come to your email address.</p>
      </Box>
      <Box x={send.x - 8 - 84} y={send.y} w={84} h={40} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Cancel</Box>
      <Box {...send} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Send</Box>
    </>
  )
  return { d, send, node }
}

/** ShareDialog - "Nominate a trusted person", for one letter. */
function nominateDialog(v: V, top: number, done: boolean) {
  const dw = v.phone ? v.W - 32 : 448
  const dh = v.phone ? 362 : 330
  const head = v.phone ? 120 : 104
  const d = { x: (v.W - dw) / 2, y: top + (v.H - dh) / 2, w: dw, h: dh }
  const input = { x: d.x + 20, y: d.y + head + 100, w: dw - 40 - 112, h: 40 }
  const nominate = { x: input.x + input.w + 8, y: input.y, w: 104, h: 40 }
  const grantee = { x: d.x + 20, y: d.y + head + 12, w: dw - 40, h: 44 }
  const node = (h: number) => (
    <>
      <Dim h={h} />
      <Box {...d} className="overflow-hidden rounded-2xl bg-white text-tal-plum shadow-lg">
        <div className="border-b border-tal-line px-5 py-4" style={{ height: head }}>
          <div className="font-display text-lg">Nominate a trusted person</div>
          <p className="mt-1 text-xs text-tal-plum-soft">Nominate someone you trust to receive <span className="font-medium">Letter to Emma</span>. It will appear in their Peace of Mind Planner and they&apos;ll get an email letting them know.</p>
        </div>
      </Box>
      {done ? (
        <Box {...grantee} className="flex items-center justify-between rounded-lg border border-tal-line bg-tal-cream-soft/40 px-3 text-sm">
          <span><span className="block leading-tight">Emma Clarke</span><span className="block text-xs text-tal-plum-soft">emma.clarke@example.com</span></span><span className="text-xs text-red-700">Remove</span>
        </Box>
      ) : (
        <Box x={d.x + 20} y={d.y + head + 24} w={dw - 40} h={20} className="text-sm italic text-tal-plum-soft">You haven&apos;t nominated anyone yet.</Box>
      )}
      <Box x={d.x + 20} y={d.y + head + 68} w={dw - 40} h={1} className="bg-tal-line" />
      <Box x={d.x + 20} y={d.y + head + 78} w={300} h={16} className="text-xs uppercase tracking-widest text-tal-plum-soft">Nominate by email</Box>
      <Box {...input} className={`flex items-center overflow-hidden whitespace-nowrap rounded-xl border px-3 text-sm ${done ? "border-tal-line text-tal-plum-soft" : "border-tal-plum ring-2 ring-tal-plum/30"}`}>{done ? "name@example.com" : <Typed text="emma.clarke@example.com" />}</Box>
      <Box {...nominate} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${done ? "opacity-60" : ""}`}>Nominate</Box>
      <Box x={d.x} y={d.y + dh - 62} w={dw} h={1} className="bg-tal-line" />
      <Box x={d.x + 12} y={d.y + dh - 48} w={190} h={36} className="flex items-center gap-1.5 px-3 text-sm">☰ View all nominations</Box>
      <Box x={d.x + dw - 84} y={d.y + dh - 48} w={64} h={36} className="flex items-center justify-center rounded-xl text-sm">Done</Box>
    </>
  )
  return { d, input, nominate, grantee, node }
}

// Settings → What you've shared → ShareAllPlannerButton's dialog.
const SHAREABLE: { g: string; items: { t: string; on?: boolean }[] }[] = [
  { g: "Apologies", items: [{ t: "Apology to Dad" }, { t: "Apology to Kate" }] },
  { g: "Letters", items: [{ t: "Letter to Emma", on: true }, { t: "Letter to Leo" }, { t: "Letter to Mia" }] },
  { g: "List of Medical Advisers", items: [{ t: "List of Medical Advisers — entry 1", on: true }, { t: "List of Medical Advisers — entry 2", on: true }] },
  { g: "Power of Attorney Details", items: [{ t: "Power of Attorney Details — entry 1", on: true }] },
  { g: "Will & Funeral Instructions", items: [{ t: "Will & Funeral Instructions — details", on: true }] },
  { g: "Wishes", items: [{ t: "Wishes — children", on: true }, { t: "Wishes — general", on: true }] },
]
function buildShareAll(v: V) {
  const { phone } = v
  const sx = phone ? 16 : 264
  const sy = phone ? 60 : 40
  const sw = phone ? v.W - 32 : 672
  const sh = phone ? v.H - 92 : 680
  const shareBtn = { x: sx + sw - 24 - 96, y: sy + sh - 16 - 40, w: 96, h: 40 }
  const listTop = sy + (phone ? 196 : 160)
  const listBottom = sy + sh - 72 - 16
  const list = { x: sx + 16, y: listTop - 6, w: sw - 32, h: listBottom - listTop }
  let y = listTop
  const rows: ReactNode[] = []
  for (const grp of SHAREABLE) {
    if (y + 18 > listBottom) break
    rows.push(<Box key={grp.g} x={sx + 24} y={y} w={sw - 48} h={18} className="text-[10px] font-semibold uppercase tracking-widest text-tal-plum-soft">{grp.g}</Box>)
    y += 22
    for (const it of grp.items) {
      if (y + 26 > listBottom) break
      rows.push(
        <Box key={it.t} x={sx + 24} y={y} w={sw - 48} h={26} className="flex items-center gap-2 rounded-lg px-2">
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] text-white ${it.on ? "border-blue-600 bg-blue-600" : "border-gray-400 bg-white"}`}>{it.on ? "✓" : ""}</span>
          <span className="flex-1 truncate text-sm">{it.t}</span>
        </Box>,
      )
      y += 28
    }
    y += 12
  }
  const settingsH = v.H
  const node = (
    <Frame v={v} h={settingsH} active={NAV_SETTINGS}>
      <Box x={v.x} y={v.top} w={v.w} h={60} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Settings</span>
        <span className="font-display text-2xl">Your account</span>
      </Box>
      <Box x={v.x} y={v.top + 76} w={v.w} h={200} className="rounded-2xl border border-tal-line bg-white p-6">
        <div className="font-display text-xl">What you&apos;ve shared</div>
        <p className="mt-2 text-sm text-tal-plum-soft">Every item you&apos;ve shared, and who can see it.</p>
      </Box>
      <Dim h={settingsH} />
      <Box x={sx} y={sy} w={sw} h={sh} className="rounded-2xl bg-white text-tal-plum shadow-lg" />
      <Box x={sx} y={sy} w={sw} h={phone ? 136 : 96} className="border-b border-tal-line px-6 pt-6">
        <div className="font-display text-lg">Share Planner items with someone</div>
        <p className="mt-1 text-sm text-tal-plum-soft">Pick the items to share. The recipient must already have an Adulting Life account (their email).</p>
      </Box>
      <Box x={sx + 24} y={sy + (phone ? 148 : 112)} w={sw - 48} h={32} className="flex items-center gap-2 text-sm">
        <span className="flex h-8 items-center rounded-lg border border-tal-line px-3">Check all</span>
        <span className="flex h-8 items-center rounded-lg border border-tal-line px-3">Uncheck all</span>
        <span className="ml-auto text-xs text-tal-plum-soft">7 of 31 selected</span>
      </Box>
      {rows}
      <Box x={sx} y={sy + sh - 72} w={sw} h={1} className="bg-tal-line" />
      <Box x={sx + 24} y={shareBtn.y} w={sw - 48 - 96 - 8 - (phone ? 0 : 76)} h={40} className="flex items-center truncate rounded-xl border border-tal-line px-3 text-sm">emma.clarke@example.com</Box>
      {!phone && <Box x={shareBtn.x - 8 - 76} y={shareBtn.y} w={76} h={40} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>}
      <Box {...shareBtn} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Share 7</Box>
    </Frame>
  )
  return { node, shareBtn, list }
}

const MAIL_BODY = (
  <>
    <p>Hi Emma,</p>
    <p>Sarah Taylor has shared Letter to Emma with you in their Peace of Mind Planner.</p>
    <p>You can view it any time by signing in:<br /><span className="break-all text-sky-700 underline">https://app.theadultinglife.com.au/templates/peace-of-mind-planner</span></p>
    <p>They can remove your access at any time. This message is a notification only — reply to Sarah Taylor directly if you have questions.</p>
    <p>— The Adulting Life</p>
  </>
)
const SUBJECT = "Sarah Taylor has shared something with you in The Adulting Life"
const MAIL_ITEMS = ["Letter to Emma", "Wishes — general", "Wishes — children", "Will & Funeral Instructions — details", "Power of Attorney Details — entry 1"]
function DInbox() {
  return (
    <div className="absolute inset-0 bg-white font-sans text-gray-900" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={56} className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-5">
        <span className="flex items-center gap-2 text-lg font-semibold text-sky-700"><MailGlyph />Mail</span>
        <span className="flex h-9 w-96 items-center gap-2 rounded-lg bg-white px-3 text-sm text-gray-400 ring-1 ring-gray-200"><SearchIcon />Search mail</span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5c5c] text-sm font-semibold text-white">E</span>
      </Box>
      <Box x={0} y={56} w={190} h={704} className="space-y-1 border-r border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-2 font-semibold text-sky-800">Inbox <span className="ml-auto">5</span></div>
        <div className="px-3 py-2 text-gray-600">Starred</div><div className="px-3 py-2 text-gray-600">Sent</div><div className="px-3 py-2 text-gray-600">Bin</div>
      </Box>
      <Box x={190} y={56} w={380} h={704} className="border-r border-gray-200">
        {MAIL_ITEMS.map((it, n) => (
          <div key={it} className={`border-b border-gray-100 px-4 py-3 ${n === 0 ? "bg-sky-50" : ""}`}>
            <div className="flex justify-between text-sm"><span className="font-semibold">The Adulting Life</span><span className="text-xs text-gray-500">10:5{8 - n} am</span></div>
            <div className="truncate text-sm font-medium">{SUBJECT}</div>
            <div className="truncate text-xs text-gray-500">Sarah Taylor has shared {it} with you in their Peace of Mind Planner.</div>
          </div>
        ))}
      </Box>
      <Box x={600} y={84} w={570} h={60} className="text-xl font-semibold leading-snug">{SUBJECT}</Box>
      <Box x={600} y={152} w={570} h={40} className="flex items-center gap-3 text-sm">
        <Img src="/icons-pwa/icon-192.png" x={0} y={2} w={36} className="rounded-full" />
        <div className="pl-12"><span className="font-semibold">The Adulting Life</span><span className="block text-xs text-gray-500">to emma.clarke@example.com · 10:58 am</span></div>
      </Box>
      <Box x={600} y={210} w={560} h={330} className="space-y-4 text-[15px] leading-relaxed">{MAIL_BODY}</Box>
    </div>
  )
}
function PInbox() {
  return (
    <div className="absolute inset-0 bg-white font-sans text-gray-900" style={{ height: 844 }}>
      <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
      <Box x={16} y={52} w={358} h={32} className="flex items-center text-[17px] text-sky-600">‹ Inbox</Box>
      <Box x={16} y={96} w={358} h={60} className="text-xl font-semibold leading-snug">{SUBJECT}</Box>
      <Box x={16} y={172} w={358} h={40} className="flex items-center text-sm">
        <Img src="/icons-pwa/icon-192.png" x={0} y={2} w={36} className="rounded-full" />
        <div className="pl-12"><span className="font-semibold">The Adulting Life</span><span className="block text-xs text-gray-500">to emma.clarke@example.com · 10:58 am</span></div>
      </Box>
      <Box x={16} y={232} w={358} h={440} className="space-y-4 text-[15px] leading-relaxed">{MAIL_BODY}</Box>
    </div>
  )
}

// The whole Planner as one PDF (lib/services/planner-document.ts order).
const PdfSec = ({ t, children }: { t: string; children: ReactNode }) => (
  <div className="mb-2.5">
    <div className="mb-0.5 border-b border-[#e6dcd0] pb-0.5 font-display text-[12px] font-semibold">{t}</div>
    <div className="text-[10px] leading-snug text-gray-700">{children}</div>
  </div>
)
const PdfGroup = ({ t }: { t: string }) => <div className="mb-1 mt-3 text-[9px] font-semibold uppercase tracking-widest text-tal-plum-soft">{t}</div>
function PdfPage({ phone }: { phone: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Logo.png" alt="" className="mb-3 h-10" />
      <div className="font-display text-2xl">Peace of Mind Planner</div>
      <div className="mb-3 text-[11px] text-tal-plum-soft">Sarah Taylor · 21 November 2026</div>
      <PdfGroup t="My Personal Information" />
      <PdfSec t="My Personal Information">Sarah Taylor · born 14 Jun 1984 · 0412 555 301 · 27 Jacaranda St, Ashgrove QLD 4060</PdfSec>
      <PdfGroup t="Important Consultants & Contacts" />
      <PdfSec t="Attorney(s)">Emma Clarke (Sister) — Enduring Power of Attorney · 0412 555 018<br />James Taylor (Partner) — Enduring Power of Attorney · 0413 555 774</PdfSec>
      <PdfSec t="Accountant(s)">Northside Tax &amp; Accounting — Raj Patel · 07 3555 0190</PdfSec>
      <PdfSec t="Doctors">Dr Priya Nair (GP) — Northside Family Practice · 07 3555 0142<br />Dr Tom Becker (Dermatologist) — Kedron Skin Clinic · 07 3555 0187</PdfSec>
      {!phone && (
        <>
          <PdfSec t="Family Members">James Taylor · Mia Taylor · Leo Taylor</PdfSec>
          <PdfGroup t="Will" />
          <PdfSec t="Information Regarding My Will">Signed 12/03/2024 · original with Harbourside Legal, Brisbane · Executor: Emma Clarke</PdfSec>
        </>
      )}
    </>
  )
}
function PdfViewer({ v }: { v: V }) {
  if (v.phone) {
    return (
      <div className="absolute inset-0 bg-[#525659] font-sans" style={{ height: 844 }}>
        <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-white"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
        <Box x={0} y={44} w={390} h={48} className="flex items-center justify-between bg-[#323639] px-4 text-sm text-white"><span className="text-sky-300">Done</span><span className="truncate px-3">Peace of Mind Planner.pdf</span><span className="text-sky-300">⇪</span></Box>
        <Box x={16} y={112} w={358} h={700} className="overflow-hidden bg-white px-6 pt-6 text-tal-plum shadow-2xl"><PdfPage phone /></Box>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 bg-[#525659] font-sans" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={40} className="flex items-center gap-4 bg-[#323639] px-5 text-sm text-white">
        <span>Peace of Mind Planner - Sarah Taylor.pdf</span><span className="ml-auto text-white/70">1 / 14</span>
      </Box>
      <Box x={330} y={60} w={540} h={700} className="overflow-hidden bg-white px-12 pt-10 text-tal-plum shadow-2xl">
        <PdfPage phone={false} />
        <div className="absolute bottom-6 left-12 right-12 flex justify-between text-[9px] text-gray-400"><span>Made by The Adulting Life</span><span>Page 1</span></div>
      </Box>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Screens + steps (one builder for both devices)
// ═════════════════════════════════════════════════════════════════════════════

const BASE = "app.theadultinglife.com.au"
const U_IDX = `${BASE}/templates/peace-of-mind-planner`

function build(v: V) {
  const { phone } = v
  const tap = phone ? "Tap" : "Click"
  const idx = buildIndex(v, "sarah")
  const emmaIdx = buildIndex(v, "emma")
  const secs: Record<string, SecBuild> = {}
  for (const s of SECTIONS) secs[s.slug] = buildSection(v, s)
  const lettersForm = buildSection(v, SEC("letters"), { form: true })
  const lettersDone = buildSection(v, SEC("letters"), { dotEmma: true })
  const emmaLetters = buildSection(v, SEC("letters"), { viewer: "emma" })
  const shareAll = buildShareAll(v)
  const email = emailDialog(v, 0)

  // Letters list scrolled so the list sits in view (for the nominate steps).
  const L = secs.letters
  const lScroll = clamp(L.r.list.y + L.r.list.h / 2 - v.H / 2, 0, L.h - v.H)
  const nom = nominateDialog(v, lScroll, false)
  const nomDone = nominateDialog(v, lScroll, true)

  const screens: Record<string, ReactNode> = {
    index: idx.node(),
    fabs: idx.node(undefined, true),
    sharePdf: idx.node(email.node(idx.h)),
    pdf: <PdfViewer v={v} />,
    lettersForm: lettersForm.node(),
    nominate: L.node(nom.node(L.h)),
    nominated: lettersDone.node(nomDone.node(L.h)),
    shareAll: shareAll.node,
    inbox: phone ? <PInbox /> : <DInbox />,
    emmaIndex: emmaIdx.node(),
    emmaLetter: emmaLetters.node(),
  }
  for (const s of SECTIONS) screens[`s:${s.slug}`] = secs[s.slug].node()

  const sc = phone ? 1.02 : 1.12
  const cx = v.x + v.w / 2
  /** Ring clipped to what's on screen at this scroll + zoom. */
  const clip = (r: Rect, scroll: number, scale: number): Rect => {
    const vis = v.H / scale
    const top = scroll + (v.H - vis) / 2 + 12
    const bottom = scroll + (v.H + vis) / 2 - 12
    const y = Math.max(r.y, top)
    return { x: r.x, y, w: r.w, h: Math.max(24, Math.min(r.y + r.h, bottom) - y) }
  }
  const idxStep = (ring: Rect, click: Rect | null, caption: string, detail: string, duration = 5500): WalkStep => {
    const scroll = clamp(ring.y - (phone ? 150 : 120), 0, idx.h - v.H)
    return { screen: "index", url: U_IDX, caption, detail, scroll, focus: { x: cx, y: scroll + v.H / 2, scale: sc }, ring: clip(ring, scroll, sc), ...(click ? { click: { x: click.x + Math.min(160, click.w / 3), y: click.y + Math.min(click.h / 2, 24) } } : {}), duration }
  }
  const secStep = (slug: string, caption: string, detail: string, o: { ring?: Rect; click?: { x: number; y: number }; scroll?: number; screen?: string; duration?: number } = {}): WalkStep => {
    const b = secs[slug]
    const ed = editorOf(SEC(slug))
    const scroll = o.scroll ?? clamp(ed === "wish" || ed === "last" ? b.r.title.y - (phone ? 72 : 24) : b.r.content.y - (phone ? 380 : 260), 0, b.h - v.H)
    const ring = o.ring ?? b.r.table ?? b.r.card ?? b.r.content
    return { screen: o.screen ?? `s:${slug}`, url: `${U_IDX}/${slug}`, caption, detail, scroll, focus: { x: cx, y: scroll + v.H / 2, scale: sc }, ring: clip(ring, scroll, sc), ...(o.click ? { click: o.click } : {}), duration: o.duration ?? 7000 }
  }
  const row = (slug: string) => idx.row[slug]
  const grp = (...g: string[]) => span(idx.group[g[0]], idx.group[g[g.length - 1]])
  const header: Rect = phone ? { x: P_ASK.x - 4, y: 54, w: P_MENU.x + P_MENU.w - P_ASK.x + 8, h: 48 } : { x: SEARCH.x, y: 10, w: USER.x + USER.w - SEARCH.x, h: 44 }
  const fabs: Rect = phone ? { x: P_FAB_R - 200, y: P_FAB_Y, w: 200, h: 56 } : { x: FAB_R - 200, y: FAB_Y, w: 200, h: 56 }
  const will = secs.will
  const wishG = secs["wishes-general"]

  const steps: WalkStep[] = [
    // ── The header of the page
    { screen: "index", url: U_IDX, caption: "Peace of Mind Planner", detail: "The things your family would need to know if something happened to you. Dashboard (top left) takes you back.", focus: { x: cx, y: phone ? 260 : 200, scale: phone ? 1.02 : 1.3 }, ring: span(idx.r.crumb, idx.r.intro), duration: 7000 },
    { screen: "index", url: U_IDX, caption: "Download PDF", detail: "The whole Planner as one branded PDF - in the same order as the printed Planner, to keep somewhere safe.", focus: { x: phone ? 140 : 600, y: idx.r.dl.y + 20, scale: phone ? 1.4 : 1.6 }, ring: span(idx.r.dl, idx.r.share), click: mid(idx.r.dl), duration: 6000 },
    { screen: "pdf", url: `${BASE}/api/export/doc?kind=planner`, caption: "Everything, in one document", detail: "Groups, then sections, then entries - only what you've filled in. Print it, save it to Files, or keep it with your Will.", focus: { x: v.W / 2, y: phone ? 420 : 380, scale: phone ? 1.02 : 1.15 }, duration: 7000 },
    { screen: "sharePdf", url: U_IDX, caption: "Share PDF emails it", detail: "Type who it's for and an optional message. The PDF is attached and sent with your name on it - replies come to you.", focus: { x: v.W / 2, y: email.d.y + email.d.h / 2, scale: phone ? 1.02 : 1.35 }, ring: email.d, click: mid(email.send), duration: 7500 },
    idxStep(span(row("my-personal-information"), row("attorneys")), null, "Two kinds of section", "↔ means shared with an Organiser folder - the same data as your Organiser, with how many entries. ◇ means Planner-only - it lives just here.", 8000),

    // ── My Personal Information
    idxStep(row("my-personal-information"), row("my-personal-information"), `${tap} My Personal Information`, "Every row opens its own page.", 4500),
    secStep("my-personal-information", "Your own details", "Date of birth, mobile, email, home and mailing address - read from Family Members. To change them, Edit in Family Members.", { ring: secs["my-personal-information"].r.card }),

    // ── Important Consultants & Contacts
    idxStep(grp("Important Consultants & Contacts"), row("attorneys"), "Important Consultants & Contacts", "Attorneys, accountants, doctors, family, friends and others - each shows how many entries it has.", 6000),
    secStep("attorneys", "Attorney(s)", "Who holds your Power of Attorney: name, relationship, General or Enduring, phone, email, addresses and where the original is kept - plus the signed document. Same entries as the Organiser's Power of Attorney folder.", { duration: 8500 }),
    secStep("accountants", "Accountant(s)", "Business name, contact name, phone, email, address, mailing address and notes - from the List of Accountants folder."),
    secStep("doctors", "Doctors", "Your GP and specialists: speciality, practice, doctor's name, phone, email, address and notes. With two or more, a table at the top lists them all."),
    secStep("family-members", "Family Members", "James, Mia and Leo - dates of birth, phones, email and addresses, straight from Family Members.", { ring: secs["family-members"].r.card }),
    secStep("friends", "Friends", "The friends your family should call: name, phone, email, address, mailing address and notes."),
    secStep("others", "Others", "Anyone else who matters - neighbours, the vet, a builder: role, name, contact details and notes."),

    // ── Device / Online / Important Documents
    idxStep(grp("Device Access Details", "Online & Social Media Access", "Important Documents"), row("device-access"), "Devices, accounts and documents", "How to get into your phone and accounts, and where your papers are.", 6000),
    secStep("device-access", "Device Access Details", "Each phone, tablet and computer: type, name, make & model, passcode or password, recovery info and notes."),
    secStep("online-access", "Online & Social Media Access Details", "Email, social media, banking and shopping accounts: service, username, password, 2FA / recovery and what you'd like done with it."),
    secStep("important-documents", "Important Documents", "Where every important document is kept: title or type, location and any instructions."),
    secStep("advance-health-directive", "Advance Health Directive", "Upload the signed directive, with its title and date signed. Archived on moves an old one to Past directives."),

    // ── Insurances + Will
    idxStep(grp("Insurances", "Will"), row("life-insurance"), "Insurances and your Will", "Life, health, vehicle and other insurance, then everything about your Will.", 6000),
    secStep("life-insurance", "Life Insurance", "Provider, policy number, cover amount, beneficiary, contact, premium, renewal date and notes."),
    secStep("health-insurance", "Health Insurance", "Provider, member number, level of cover, contact, premium, renewal date and notes."),
    secStep("vehicle-insurance", "Vehicle Insurance", "Which vehicle, provider, policy number, cover type (Comprehensive, Third Party, CTP), premium and renewal date."),
    secStep("other-insurance", "Other Insurance", "Home and business insurance: the policy document, insurer, cover type, property, sums insured, excess, premium, dates and claims phone."),
    secStep("will", "Information Regarding My Will", "Upload the Will, then: do you have one, date signed, where the original is, your executor, solicitor and funeral wishes.", { ring: will.r.card, duration: 8000 }),
    secStep("will", "Executors and funeral wishes", "Up to three executors, each with phone, email and relationship - plus whether there's a prepaid funeral and with whom. One Save for the whole form.", { scroll: clamp(will.r.card.y + 520, 0, will.h - v.H), ring: will.r.card, duration: 7500 }),

    // ── Financial + Property
    idxStep(grp("Financial Information", "Property Information"), row("bank-accounts"), "Money and property", "Bank accounts, investments, super, loans, budgets, your home and vehicles.", 6000),
    secStep("bank-accounts", "Bank Accounts / Credit Cards", "Institution, account type, account name, BSB, account number, card last 4, branch and notes - one entry per account."),
    secStep("investment-accounts", "Investment Accounts", "Type (shares, managed fund, ETF…), broker, account or HIN, approximate value, last reviewed, adviser and notes."),
    secStep("superannuation", "Superannuation Retirement Accounts", "Fund name, member number, approximate balance, beneficiary, fund contact and the insurance held in super."),
    secStep("open-loans", "Open Loans", "Each loan's latest statement: the document, which loan it's for and the statement date."),
    secStep("other-financial", "Other Financial Information", "Your budget: the document, its title, date and notes."),
    secStep("my-property", "My Property", "Address, owner-occupied / investment / renting, council, rates, water, rent, bond, date you moved in and review date."),
    secStep("vehicle-information", "Vehicle Information", "Make & model, year, colour, rego and expiry, VIN, finance and notes."),

    // ── My End-of-Life Plan
    idxStep(grp("My End-of-Life Plan"), row("wishes-general"), "My End-of-Life Plan", "Seven Planner-only pages of wishes - in your own words.", 6000),
    secStep("wishes-general", "Wishes (general)", "Private until you share. The farewell you'd like, what happens to your things - whatever you want your family to know.", { ring: wishG.r.editor, duration: 8000 }),
    secStep("wishes-general", "Save - and nominate someone if you like", "Save keeps it. The person-plus button at the top nominates a trusted person to receive this page.", { ring: span(wishG.r.share, wishG.r.excel), scroll: 0, duration: 6500 }),
    secStep("wishes-spouse", "Wishes for my spouse / partner", "What you'd want James to know and do.", { ring: secs["wishes-spouse"].r.editor, duration: 6000 }),
    secStep("wishes-children", "Wishes for my children", "Messages and wishes for Mia and Leo - who gets what, what matters.", { ring: secs["wishes-children"].r.editor, duration: 6000 }),
    secStep("wishes-relatives", "Wishes for my relatives", "Parents, brothers and sisters, the wider family.", { ring: secs["wishes-relatives"].r.editor, duration: 6000 }),
    secStep("wishes-friends", "Wishes for my friends", "The people who aren't family but might as well be.", { ring: secs["wishes-friends"].r.editor, duration: 6000 }),
    secStep("wishes-pets", "Wishes for my pets", "Who looks after them, their vet and their routine.", { ring: secs["wishes-pets"].r.editor, duration: 6000 }),
    secStep("wishes-other", "Other requests", "Anything else - donations, a tree, a song.", { ring: secs["wishes-other"].r.editor, duration: 6000 }),

    // ── Letters / Apologies / Last Words
    idxStep(grp("Letters", "My Last Words"), row("letters"), "Letters, Apologies and My Last Words", "The things you'd want to say - all Planner-only.", 6000),
    secStep("letters", `Letters - ${tap.toLowerCase()} + Add letter`, "Write to the people who matter. Each one starts with \"Dear\" - Sarah has written to Mia, Leo and Emma.", { ring: L.r.list, click: mid(L.r.add), scroll: lScroll, duration: 7000 }),
    secStep("letters", "Dear Emma…", "Who it's to, then the letter - as long or short as you like. Save, and it's in the list.", { ring: lettersForm.r.card, screen: "lettersForm", scroll: clamp(lettersForm.r.card.y - (phone ? 160 : 120), 0, lettersForm.h - v.H), click: mid(lettersForm.r.save), duration: 8500 }),
    secStep("apologies", "Apologies", "Things you'd want to say to someone, from the heart. Each one starts with a name - \"To Kate\".", { ring: secs.apologies.r.list, scroll: clamp(secs.apologies.r.list.y - (phone ? 420 : 380), 0, secs.apologies.h - v.H) }),
    secStep("last-words", "My Last Words", "One page: the last thing you'd want to say to the people you leave behind.", { ring: secs["last-words"].r.editor }),

    // ── Sharing
    secStep("letters", "Nominate a trusted person", `Every letter has its own person-plus button. ${tap} it on Emma's letter.`, { ring: L.itemShare[2], click: mid(L.itemShare[2]), scroll: lScroll, duration: 6000 }),
    { screen: "nominate", url: `${U_IDX}/letters`, caption: "Nominate by email", detail: "Emma's email. The letter appears in her Planner and she gets an email letting her know.", focus: { x: v.W / 2, y: nom.d.y + nom.d.h / 2, scale: phone ? 1.02 : 1.5 }, ring: nom.input, click: mid(nom.nominate), scroll: lScroll, duration: 7000 },
    { screen: "nominated", url: `${U_IDX}/letters`, caption: "Only that letter", detail: "Emma's listed - Remove any time. The green dot shows it's nominated; Mia's and Leo's letters stay private.", focus: { x: v.W / 2, y: nom.d.y + nom.d.h / 2, scale: phone ? 1.02 : 1.5 }, ring: nomDone.grantee, scroll: lScroll, duration: 6500 },
    { screen: "shareAll", url: `${BASE}/settings`, caption: "Or share many at once", detail: "Settings → What you've shared → Share all with… Tick what Emma should see and Share. She needs an Adulting Life account.", focus: { x: v.W / 2, y: v.H / 2, scale: phone ? 1.02 : 1.15 }, ring: shareAll.list, click: mid(shareAll.shareBtn), duration: 8000 },
    { screen: "inbox", url: "mail.example.com/inbox", caption: "Emma gets an email", detail: "It says what Sarah shared and links to the Planner - none of the details are in the email itself.", focus: phone ? { x: 195, y: 400, scale: 1.02 } : { x: 880, y: 330, scale: 1.35 }, duration: 7000 },
    { screen: "emmaIndex", url: U_IDX, caption: "Emma sees only what was shared", detail: "Shared with you - and one PDF of everything Sarah shared. Rows say \"1 shared\"; nothing else of Sarah's is visible.", scroll: clamp(emmaIdx.r.sharedBox.y - (phone ? 200 : 160), 0, emmaIdx.h - v.H), focus: { x: cx, y: clamp(emmaIdx.r.sharedBox.y - (phone ? 200 : 160), 0, emmaIdx.h - v.H) + v.H / 2, scale: sc }, ring: emmaIdx.r.sharedBox, duration: 7500 },
    { screen: "emmaLetter", url: `${U_IDX}/letters`, caption: "Read-only, exactly as Sarah wrote it", detail: "Her own letter - not Mia's or Leo's.", scroll: clamp(emmaLetters.r.card.y - (phone ? 300 : 260), 0, emmaLetters.h - v.H), focus: { x: cx, y: clamp(emmaLetters.r.card.y - (phone ? 300 : 260), 0, emmaLetters.h - v.H) + v.H / 2, scale: sc }, ring: clip(emmaLetters.r.card, clamp(emmaLetters.r.card.y - (phone ? 300 : 260), 0, emmaLetters.h - v.H), sc), duration: 7000 },

    // ── Header and round buttons
    phone
      ? { screen: "index", url: U_IDX, caption: "TAL AI, reminders, account and menu", detail: "TAL AI is your built-in guide. The bell opens Reminders, your picture the account menu, and ☰ every other page.", focus: { x: 250, y: 160, scale: 1.6 }, ring: header, duration: 7000 }
      : { screen: "index", url: U_IDX, caption: "The header, on every page", detail: "Search your organiser, + Add, Ask TAL AI, the reminders bell and your account menu.", focus: { x: 720, y: 140, scale: 1.6 }, ring: header, duration: 6500 },
    { screen: "fabs", url: U_IDX, caption: "Three round buttons", detail: "? opens help for this page. The compass takes the guided Planner tour. And this one plays the walkthrough - you're watching it now.", focus: phone ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: fabs, click: { x: fabs.x + 28, y: fabs.y + 28 }, duration: 7000 },
  ]
  const roundButtons = phone ? <Fabs y={P_FAB_Y} right={P_FAB_R} /> : <Fabs y={FAB_Y} right={FAB_R} />
  const fixed: Record<string, ReactNode> = { index: roundButtons, emmaIndex: roundButtons }
  return { screens, steps, fixed }
}

const D = build(DV)
const P = build(PV)

export default function PlannerPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P.steps : D.steps} screens={phone ? P.screens : D.screens} fixed={phone ? P.fixed : D.fixed}
      title={phone ? "Peace of Mind Planner (phone)" : "Peace of Mind Planner (computer)"} url={U_IDX} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Peace of Mind Planner", subtitle: "Everything your family would need to know" }} />
  )
}
