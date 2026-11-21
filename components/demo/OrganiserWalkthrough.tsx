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

type CatId = "personal" | "health" | "education" | "employment" | "admin"
const CATS: { id: CatId; t: string; d: string; done: number; total: number; tone: string; bar: string; pill: string }[] = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 6, total: 22, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 4, total: 21, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { id: "education", t: "Education", d: "Certificates, transcripts, resumes and study records.", done: 2, total: 12, tone: "bg-sky-50 ring-sky-100", bar: "bg-sky-500", pill: "bg-sky-100 text-sky-800" },
  { id: "employment", t: "Employment", d: "Work contracts, tax details, super and payslips.", done: 3, total: 12, tone: "bg-rose-50 ring-rose-100", bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800" },
  { id: "admin", t: "Admin & Bookkeeping", d: "Finances, accounts, utility bills, insurance and paperwork.", done: 7, total: 23, tone: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-800" },
]
const CAT_N: Record<CatId, number> = { personal: 0, health: 1, education: 2, employment: 3, admin: 4 }
const catLabel = (c: CatId) => CATS[CAT_N[c]].t
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
  { v: "22 of 90 folders", s: "14 in progress", c: "bg-sky-50 ring-sky-100", i: "bg-sky-100 text-sky-700" },
  { v: "Secure & private", s: "Only you can access", c: "bg-emerald-50 ring-emerald-100", i: "bg-emerald-100 text-emerald-700" },
  { v: "Always backed up", s: "Your data is safe", c: "bg-amber-50 ring-amber-100", i: "bg-amber-100 text-amber-700" },
]
const HIDDEN = [
  { n: "ABN", s: "Personal · not applicable" },
  { n: "Dental Records", s: "Health · snoozed until 21 Dec 2026" },
]

// Each section's matrix (CategoryMatrix) - Sarah, James, Mia (15) and Leo (11).
// Folder names are the live ones (supabase/migrations, latest rename wins);
// ABN and Dental Records are left out because the Taylors hid them, and the
// Tax File Number folder is never shown. "—" = under the folder's min_age.
// planner = shareable in the Peace of Mind Planner (PLANNER_SUBCATEGORY_IDS);
// ai = AI_HELP_FOLDERS (form coaches, Life Goals, Meal Planning).
type Cell = "done" | "started" | "empty" | "na"
const CK: Record<string, Cell> = { d: "done", s: "started", e: "empty", n: "na" }
type MRow = { id: string; name: string; cells?: Cell[]; fam?: Cell; users?: boolean; planner?: number; ai?: boolean }
const mr = (id: string, name: string, cells: string, extra: Partial<MRow> = {}): MRow => ({ id, name, cells: cells.split("").map((k) => CK[k]), ...extra })
const famRow = (id: string, name: string, state: Cell, extra: Partial<MRow> = {}): MRow => ({ id, name, fam: state, ...extra })
const MATRIX: Record<CatId, MRow[]> = {
  personal: [
    mr("personal.emergency_contacts", "Emergency Contacts", "ddss"),
    famRow("personal.family_members", "Family Members", "done", { users: true }),
    mr("personal.birth_certificates", "Birth Certificates", "dddd"),
    mr("personal.marriage_certificate", "Marriage Certificate", "ddnn"),
    mr("personal.passport_travel", "Passport & Travel Documents", "ddee"),
    mr("personal.will_funeral", "Will & Funeral Instructions", "senn", { planner: 2 }),
    mr("personal.power_of_attorney", "Power of Attorney Details", "eenn", { planner: 0 }),
    mr("personal.advanced_health_directive", "Advanced Health Directive", "eenn", { planner: 0 }),
    mr("personal.electoral_roll", "Electoral Roll Number & Registered Address", "ddnn"),
    mr("personal.drivers_licence", "Driver's Licence", "ddnn"),
    mr("personal.list_of_accounts", "Custom — List of Personal Accounts", "seee", { planner: 1 }),
    mr("personal.licences_ids", "Copy of Licences & ID's", "dsee"),
    mr("personal.vehicle_details", "Custom — Vehicle Details & Copy of Registration Certificate", "ddnn", { planner: 1 }),
    mr("personal.vehicle_logbook", "Vehicle Logbook", "senn"),
    mr("personal.device_access", "Custom — Device Access Details", "dsee", { planner: 1 }),
    mr("personal.end_of_life_wishes", "Custom — End of Life Wishes", "seee"),
  ],
  health: [
    mr("health.medical_advisers", "List of Medical Advisers", "dsee", { planner: 1 }),
    mr("health.medication_list", "Custom — Medication List", "dese"),
    mr("health.health_insurance_cards", "Health Cards", "dddd"),
    mr("health.concession_cards", "Concession Cards", "eeee"),
    mr("health.pension_cards", "Pension Cards", "eeee"),
    mr("health.health_insurance", "Health Insurance Details & Statements", "dsee", { planner: 2 }),
    mr("health.life_insurance", "Life Insurance Details & Statements", "ddee", { planner: 1 }),
    mr("health.my_health_plan", "My Health Plan", "seee", { ai: true }),
    mr("health.scripts", "Copies of Scripts / Prescriptions", "deds"),
    mr("health.blood_tests", "Blood Test Results", "seee"),
    mr("health.specialist_reports", "Specialist Reports", "eeee"),
    mr("health.referrals", "Referrals", "eede"),
    mr("health.hospital_discharge", "Hospital Discharge Records", "eeee"),
    mr("health.medical_reports", "Medical Reports", "eeee"),
    mr("health.medical_bills", "Medical Bills", "deee"),
    mr("health.meal_planning", "Meal Planning", "seee", { ai: true }),
    mr("health.favourite_recipes", "Favourite Recipes", "dees"),
    mr("health.life_goals_plans", "Life Goals & Plans", "esee", { ai: true }),
    mr("health.mind_set", "Mindset", "eese", { ai: true }),
    mr("health.retirement_pension", "Retirement / Pension Plan", "seee", { ai: true }),
  ],
  education: [
    mr("education.courses_enrolment", "Custom Courses & Enrolments", "esee"),
    mr("education.primary_details", "Primary Education", "ddds"),
    mr("education.primary_reports", "Primary Reports & Certificates", "edds"),
    mr("education.secondary_details", "Secondary Education", "ddde"),
    mr("education.secondary_reports", "Secondary Reports & Certificates", "esse"),
    mr("education.tertiary_details", "Tertiary Education", "dsee"),
    mr("education.tertiary_reports", "Tertiary Transcripts & Certificates", "seee"),
    mr("education.other_courses_details", "Other Education", "deee"),
    mr("education.achievement_certificates", "Achievement Certificates", "eeds"),
    mr("education.study_plan", "Study Plan", "eese", { ai: true }),
    mr("education.course_storage", "Course Storage", "eeee"),
    famRow("education.other", "Other", "empty"),
  ],
  employment: [
    mr("employment.employee_information_form", "Employee Information Form", "dsen"),
    mr("employment.cover_letter", "Cover Letter", "seee", { ai: true }),
    mr("employment.resume", "Resume", "dsee", { ai: true }),
    mr("employment.letters_of_recommendation", "Letters of Recommendation", "deee"),
    mr("employment.volunteering_certificates", "Volunteering Certificates", "eese"),
    mr("employment.employee_contracts", "Employee Contracts", "ddee"),
    mr("employment.job_description", "Position / Job Description", "seee", { ai: true }),
    mr("employment.employment_reviews", "Employment Reviews", "eeee"),
    mr("employment.correspondence", "Correspondence", "eeee"),
    mr("employment.wages_summaries", "Wages Summaries", "dsee"),
    mr("employment.annual_payment_summary", "Annual Payment Summary Report", "ddee"),
    mr("employment.other", "Other", "eeee"),
  ],
  admin: [
    mr("admin.bank_accounts_advisers", "List of Bank Accounts & Advisers", "ddsn", { planner: 2 }),
    mr("admin.bank_statements", "Bank Statements", "dsen"),
    mr("admin.loans", "Loans", "deee"),
    mr("admin.loan_statements", "Loan Statements", "seee", { planner: 1 }),
    mr("admin.budgets", "Budgets", "deee", { planner: 1 }),
    mr("admin.investments_deeds", "Investments, Shares & Deeds", "esnn", { planner: 0 }),
    mr("admin.super_statements", "Superannuation Funds", "ddnn", { planner: 1 }),
    mr("admin.super_statement_documents", "Superannuation Statements", "seee"),
    famRow("admin.property_records", "Property Records", "done"),
    mr("admin.annual_tax_report", "Annual Taxation Report", "ddee"),
    mr("admin.tax_payment_plans", "Tax Payment Plans", "eeee"),
    mr("admin.home_insurance", "Home Insurance", "deee", { planner: 2 }),
    mr("admin.other_business_insurance", "Other Business / Property Insurance", "eeee"),
    mr("admin.vehicle_insurance", "Vehicle Insurance Policies", "ddnn", { planner: 1 }),
    mr("admin.telephone_devices", "Telephones & Devices Contracts", "ddse"),
    mr("admin.telephone_devices_statements", "Telephones & Devices Statements", "seee"),
    mr("admin.electricity_gas", "Electricity & Gas Accounts", "deee"),
    mr("admin.electricity_gas_bills", "Electricity & Gas Bills", "seee"),
    mr("admin.rates_water", "Rates & Water", "deee"),
    mr("admin.rental_agreements", "Rental Agreements", "eeee"),
    mr("admin.warranties", "Warranties on devices & tools", "dsee"),
    famRow("admin.other", "Other", "empty"),
    famRow("admin.invoices_jul_jun", "Invoices July to June", "done"),
  ],
}
const thumbOf = (id: string) => `/thumbnails/subcategories/${id}.png`
const rowIx = (cat: CatId, id: string) => MATRIX[cat].findIndex((r) => r.id === id)
const PEOPLE = [
  { n: "Sarah Taylor", k: "adult · primary", primary: true }, { n: "James Taylor", k: "adult" }, { n: "Mia Taylor", k: "child" }, { n: "Leo Taylor", k: "child" },
]
const SARAH = 0, MIA = 2
const R_FAMILY = rowIx("personal", "personal.family_members")
const R_PASSPORT = rowIx("personal", "personal.passport_travel")
const R_WILL = rowIx("personal", "personal.will_funeral")
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
// Rough text wrapping, so tall copies line up: lines of `text` at `cw` px a character in `w` px.
const lines = (text: string, w: number, cw: number) => Math.max(1, Math.ceil((text.length * cw) / w))

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
// "Sharing — <folder>" dialog (FolderShareButton), for Sarah's Will folder
function ShareDialogBody() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-tal-line px-5 py-4">
        <p className="font-display text-lg">Sharing — Will &amp; Funeral Instructions</p>
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
          {[{ t: "Sarah Taylor", s: "Shared with 2 people", b: "Manage" }, { t: "James Taylor", s: "Not shared", b: "Share" }].map((e) => (
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

// ── A folder's page (records/[category]/[subcategory] + PageForm) ────────────
// The fields are the folder's real page_questions (supabase/migrations: label,
// type, col_start / col_span / row_order, required, hint, placeholder), laid
// out the way PageForm's 12-column grid does (every field full width on a
// phone). Values are the Taylors' sample answers; blanks are left blank.

type FT = "text" | "textarea" | "date" | "dropdown" | "number" | "int" | "file" | "image" | "address"
type FF = { l: string; t: FT; r: number; c?: number; s?: number; req?: boolean; hint?: string; ph?: string; v?: string; demo?: boolean }
type FolderSpec = {
  id: string; cat: CatId; name: string; person: number; hint?: string; desc?: string; note: string
  will?: boolean; calc?: boolean; top?: string[]
  repeat?: { title?: string; share?: boolean; archive?: string; coach?: string; linked?: { label: string; item: string } }
  fields: FF[]
}
const PASSPORT_FIELDS: FF[] = [
  { l: "Passport document", t: "file", r: 0, hint: "Upload a scan or photo of the passport data page (PDF or image)." },
  { l: "Portrait photo", t: "image", r: 1, c: 1, s: 4 },
  { l: "Type", t: "dropdown", r: 1, c: 5, s: 2, req: true },
  { l: "Code of issuing State", t: "text", r: 1, c: 7, s: 2, req: true, hint: "3-letter code, e.g. AUS", ph: "AUS" },
  { l: "Document No.", t: "text", r: 1, c: 9, s: 4, req: true, ph: "RA0123456" },
  { l: "Family name / Surname", t: "text", r: 2, c: 5, s: 8, req: true, ph: "CITIZEN" },
  { l: "Given names", t: "text", r: 3, c: 5, s: 8, req: true, ph: "JANE" },
  { l: "Nationality", t: "text", r: 4, c: 5, s: 8, req: true, ph: "AUSTRALIAN" },
  { l: "Date of birth", t: "date", r: 5, c: 5, s: 4, req: true },
  { l: "Sex", t: "dropdown", r: 5, c: 9, s: 2, req: true },
  { l: "Place of birth", t: "text", r: 6, c: 5, s: 8, req: true, ph: "CANBERRA" },
  { l: "Date of issue", t: "date", r: 7, c: 5, s: 4, req: true },
  { l: "Date of expiry", t: "date", r: 7, c: 9, s: 4, req: true },
  { l: "Authority", t: "text", r: 8, c: 5, s: 8, ph: "AUSTRALIA" },
  { l: "MRZ line 1", t: "text", r: 9, hint: "Machine-readable zone (optional)", ph: "P<AUSCITIZEN<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<" },
  { l: "MRZ line 2", t: "text", r: 10, ph: "RA01234564AUS9105047F3208013<<<<<<<<<<<<<<06" },
]
const SARAH_PASSPORT: Record<string, string> = {
  "Passport document": "Sarah Taylor - passport.pdf", "Portrait photo": "set", Type: "P (Passport)", "Code of issuing State": "AUS", "Document No.": "PA4419027",
  "Family name / Surname": "TAYLOR", "Given names": "SARAH JANE", Nationality: "AUSTRALIAN", "Date of birth": "14/03/1984", Sex: "F",
  "Place of birth": "BRISBANE", "Date of issue": "14/03/2021", "Date of expiry": "14/03/2031", Authority: "AUSTRALIA",
}
const PASSPORT_BASE = { id: "personal.passport_travel", cat: "personal" as const, name: "Passport & Travel Documents", desc: "Your passport details, one entry per current + past passport. Attach a scan for easy reference and to speed up applications.", note: "Choose to keep a scanned copy of your Passport, extract information from the Passport to complete the fields below, or both.", top: ["Preview"] }
const F_MIA_PASSPORT: FolderSpec = { ...PASSPORT_BASE, person: MIA, fields: PASSPORT_FIELDS.map((f) => (f.t === "file" ? { ...f, demo: true } : f)) }
const F_SARAH_PASSPORT: FolderSpec = { ...PASSPORT_BASE, person: SARAH, fields: PASSPORT_FIELDS.map((f) => ({ ...f, v: SARAH_PASSPORT[f.l] })) }
const F_WILL: FolderSpec = {
  id: "personal.will_funeral", cat: "personal", name: "Will & Funeral Instructions", person: SARAH, will: true, top: ["share"],
  note: "Choose to keep a scanned copy of your Will, extract the relevant information to complete the fields below, or both.",
  fields: [
    { l: "Will document", t: "file", r: 0, hint: "Attach a scan or photo of the signed Will.", v: "Sarah Taylor - Will 2022.pdf" },
    { l: "Do you have a Will?", t: "dropdown", r: 1, s: 6, v: "Yes" },
    { l: "Date Will Signed", t: "date", r: 1, c: 7, s: 6, v: "18/08/2022" },
    { l: "Location of Original Will", t: "textarea", r: 2, v: "Original held by Riverbend Legal, Paddington. A copy is in the home safe." },
    { l: "Executor 1 — Name", t: "text", r: 3, v: "James Taylor" },
    { l: "Executor 1 — Contact notes", t: "textarea", r: 4, hint: "Legacy freeform field. Prefer the phone / email / relationship fields below." },
    { l: "Solicitor / Firm", t: "text", r: 5, v: "Riverbend Legal, Paddington" },
    { l: "Funeral Wishes", t: "textarea", r: 6, hint: "Burial / cremation, service type, venue", v: "Cremation. A small service with family, then a picnic at New Farm Park." },
    { l: "Prepaid Funeral?", t: "dropdown", r: 7, s: 6, v: "No" },
    { l: "Prepaid Funeral Provider", t: "text", r: 7, c: 7, s: 6 },
    { l: "Executor 1 — Phone", t: "text", r: 10, s: 6, v: "0412 555 018" },
    { l: "Executor 1 — Email", t: "text", r: 10, c: 7, s: 6, v: "james.taylor@example.com" },
    { l: "Executor 1 — Relationship", t: "text", r: 11, hint: "e.g. spouse, child, sibling, friend, solicitor", v: "Husband" },
    { l: "Executor 2 — Name", t: "text", r: 20, v: "Emma Clarke" },
    { l: "Executor 2 — Phone", t: "text", r: 21, s: 6, v: "0423 555 274" },
    { l: "Executor 2 — Email", t: "text", r: 21, c: 7, s: 6, v: "emma.clarke@example.com" },
    { l: "Executor 2 — Relationship", t: "text", r: 22, hint: "e.g. spouse, child, sibling, friend, solicitor", v: "Sister" },
    { l: "Executor 3 — Name", t: "text", r: 30 },
    { l: "Executor 3 — Phone", t: "text", r: 31, s: 6 },
    { l: "Executor 3 — Email", t: "text", r: 31, c: 7, s: 6 },
    { l: "Executor 3 — Relationship", t: "text", r: 32, hint: "e.g. spouse, child, sibling, friend, solicitor" },
  ],
}
const F_HEALTH_INS: FolderSpec = {
  id: "health.health_insurance", cat: "health", name: "Health Insurance Details & Statements", person: SARAH, repeat: { share: true },
  note: "Scan and save copies of your policies here, complete the information fields, or do both.",
  fields: [
    { l: "Policy document", t: "file", r: 0, hint: "Upload a scan or photo (PDF or image). We can read it for you.", v: "Brightside Health - policy 2026.pdf" },
    { l: "Insurance Provider", t: "text", r: 1, v: "Brightside Health Fund" },
    { l: "Member Number", t: "text", r: 2, s: 6, v: "BHF 4471 9023" },
    { l: "Level of Cover", t: "text", r: 2, c: 7, s: 6, hint: "e.g. Hospital + Extras", v: "Gold Hospital + Top Extras" },
    { l: "Provider Contact", t: "textarea", r: 3, v: "1300 555 247 · members@brightsidehealth.example" },
    { l: "Commencement date", t: "date", r: 4, s: 6, hint: "When your policy started", v: "01/07/2015" },
    { l: "Renewal Date", t: "date", r: 4, c: 7, s: 6, v: "01/12/2026" },
    { l: "Review date", t: "date", r: 5, s: 6, hint: "When you next plan to review the policy" },
    { l: "Cancellation date", t: "date", r: 5, c: 7, s: 6, hint: "Leave blank while the policy is active" },
    { l: "Premium ($)", t: "number", r: 6, v: "412.60" },
    { l: "Notes", t: "textarea", r: 7, v: "Family cover for Sarah, James, Mia and Leo. Extras include dental, optical and physio." },
  ],
}
const F_SECONDARY: FolderSpec = {
  id: "education.secondary_details", cat: "education", name: "Secondary Education", person: MIA,
  repeat: { linked: { label: "Secondary Reports & Certificates (2)", item: "Year 9 - Semester 1 report" } },
  note: "List each high school attended, with its enrolment document. Reports and certificates go in Secondary Reports & Certificates.",
  fields: [
    { l: "Enrolment / registration document", t: "file", r: 0, hint: "The enrolment confirmation or registration that shows the school and dates. We can read it for you.", v: "Mia - Year 7 enrolment.pdf" },
    { l: "School name", t: "text", r: 1, req: true, v: "Bayview State High School" },
    { l: "School address", t: "address", r: 2, v: "45 Hillcrest Road, Bardon QLD 4065" },
    { l: "Year started", t: "int", r: 3, s: 3, v: "2024" },
    { l: "Year finished", t: "int", r: 3, c: 4, s: 3 },
    { l: "ATAR / OP", t: "text", r: 3, c: 7, s: 6 },
    { l: "Subject results", t: "textarea", r: 4, hint: "One subject per line: e.g. English — B", v: "English — A\nMathematics — B\nScience — A\nHistory — B" },
  ],
}
const F_RESUME: FolderSpec = {
  id: "employment.resume", cat: "employment", name: "Resume", person: SARAH,
  repeat: { title: "Résumé — practice manager roles 2026", archive: "Current resumes", coach: "Write my résumé with AI" },
  note: "Scan or save your resume here.",
  fields: [
    { l: "Resume document", t: "file", r: 1, hint: "Upload the resume (PDF or photo)", v: "Sarah Taylor - Resume 2026.pdf" },
    { l: "Title", t: "text", r: 2, hint: "e.g. Résumé — mining roles 2027", v: "Résumé — practice manager roles 2026" },
    { l: "Date", t: "date", r: 3, s: 6, v: "02/09/2026" },
    { l: "Archived on", t: "date", r: 3, c: 7, s: 6, hint: "Leave blank to keep this in Current resumes. A past date moves this to \"Past resumes\"." },
    { l: "Résumé", t: "textarea", r: 4, hint: "Write or paste your résumé here — or use \"Write my résumé with AI\" above.", v: "SARAH TAYLOR\nBrisbane QLD · sarah.taylor@example.com\n\nEXPERIENCE\nOffice Manager — Greenleaf Physio, Ashgrove (2019 – now)" },
    { l: "Notes", t: "textarea", r: 5 },
  ],
}
const F_LOANS: FolderSpec = {
  id: "admin.loans", cat: "admin", name: "Loans", person: SARAH, calc: true, hint: "One entry per loan (mortgage, car loan, personal loan, credit card).", repeat: {},
  note: "Add a private note for your family — reminders, where the physical document lives, who to call.",
  fields: [
    { l: "Loan name", t: "text", r: 1, req: true, hint: "e.g. Home loan — 123 Smith St, Car loan — Mazda CX-5", v: "Home loan — 12 Jacaranda St, Ashgrove" },
    { l: "Loan type", t: "dropdown", r: 2, s: 6, v: "Mortgage" },
    { l: "Lender", t: "text", r: 2, c: 7, s: 6, hint: "e.g. Commonwealth Bank, ANZ, Latitude", v: "Harbourside Bank" },
    { l: "Loan / account number", t: "text", r: 3, s: 6, v: "HL 2048 7731" },
    { l: "Original amount ($)", t: "number", r: 3, c: 7, s: 6, v: "520000" },
    { l: "Start date", t: "date", r: 4, s: 6, v: "15/04/2019" },
    { l: "End date", t: "date", r: 4, c: 7, s: 6, hint: "Blank if ongoing. A past end date moves this to \"Past loans\"." },
    { l: "Payment amount ($)", t: "number", r: 5, s: 6, v: "3185" },
    { l: "Payment frequency", t: "dropdown", r: 5, c: 7, s: 6, v: "Monthly" },
    { l: "Interest rate (%)", t: "number", r: 6, s: 6, v: "6.2" },
    { l: "Notes", t: "textarea", r: 7, v: "Offset account linked. Fixed rate ends March 2027." },
  ],
}
const WILL_TEXT = "Recording your Will details, executors and funeral wishes here helps your family find and follow your intentions, but does not make those wishes legally binding on its own. To have a valid Will or make formal legal arrangements, please speak with a solicitor or accredited legal professional."
const LOAN_NOTE = "This is an estimate only. It assumes your interest rate and repayments stay the same, with no fees, extra repayments or redraws. Your lender can give you the exact figures."
const LOAN_RESULT = "Repayments of about $3,184.84 monthly, with about $626,542 interest over the life of the loan."

// Field heights (label + control + hint) and the folder page's sections.
const CH_LABEL = 7.6, CH_XS = 6.1, CH_SM = 7.1
function ctrlH(f: FF, w: number, phone: boolean) {
  if (f.t === "textarea") {
    const n = f.v ? f.v.split("\n").reduce((a, ln) => a + lines(ln || " ", w - 26, CH_SM), 0) : 3
    return Math.max(84, n * 20 + 26)
  }
  if (f.t === "file") return f.v ? (phone ? 84 : 50) : phone && f.demo ? 88 : 44
  if (f.t === "image") return 128
  return 44
}
const fieldH = (f: FF, w: number, phone: boolean) =>
  lines(f.l + (f.req ? "*" : ""), w, CH_LABEL) * 16 + 4 + ctrlH(f, w, phone) + (f.hint ? 4 + lines(f.hint, w, CH_XS) * 16 : 0)
type Placed = { f: FF; r: Rect }
function layoutFields(fields: FF[], x: number, w: number, y0: number, phone: boolean): { items: Placed[]; bottom: number } {
  const items: Placed[] = []
  let y = y0
  const sorted = [...fields].sort((a, b) => a.r - b.r || (a.c ?? 1) - (b.c ?? 1))
  if (phone) {
    for (const f of sorted) { const h = fieldH(f, w, true); items.push({ f, r: { x, y, w, h } }); y += h + 16 }
    return { items, bottom: y - 16 }
  }
  const col = (w - 11 * 16) / 12
  const rows = [...new Set(sorted.map((f) => f.r))]
  for (const row of rows) {
    let rowH = 0
    for (const f of sorted.filter((g) => g.r === row)) {
      const s = f.s ?? 12, fw = s * col + (s - 1) * 16
      const h = fieldH(f, fw, false)
      rowH = Math.max(rowH, h)
      items.push({ f, r: { x: x + ((f.c ?? 1) - 1) * (col + 16), y, w: fw, h } })
    }
    y += rowH + 16
  }
  return { items, bottom: y - 16 }
}
type FolderLayout = {
  h: number; picker: Rect; head: Rect; titleH: number; desc?: Rect; will?: Rect; calc?: Rect; notes: Rect; top?: Rect; warn?: Rect; missing: string[]
  coach?: Rect; arch?: Rect; card?: Rect; items: Placed[]; form: Rect; linked?: Rect; save: Rect; add?: Rect
}
function chipRows(labels: string[], w: number) {
  let rows = 1, x = 0
  for (const l of labels) { const cw = l.length * 6.2 + 22; if (x + cw > w) { rows += 1; x = 0 } x += cw }
  return rows
}
function folderLayout(sp: FolderSpec, phone: boolean): FolderLayout {
  const x = phone ? PX : L, w = phone ? PCW : CW, iw = w - 44 - 32
  const label = catLabel(sp.cat)
  const picker = phone ? { x: PX, y: 142, w: 150, h: 34 } : { x: L + 268 + Math.round(label.length * 7.4), y: 72, w: 150, h: 34 }
  const titleH = phone ? Math.max(48, lines(sp.name, PCW - 24 - 64, 10.5) * 25 + (sp.hint ? 18 : 0)) : 48
  const head = phone ? { x: PX, y: 188, w: PCW, h: 12 + titleH + 12 + 36 + 12 } : { x: L, y: 116, w: CW, h: 72 }
  let y = head.y + head.h + 24
  const out: Partial<FolderLayout> = { picker, head, titleH }
  if (sp.desc) { const h = 32 + lines(sp.desc, iw, CH_SM) * 23; out.desc = { x, y, w, h }; y += h + 24 }
  if (sp.will) { const h = 32 + 24 + lines(WILL_TEXT, iw, CH_SM) * 23; out.will = { x, y, w, h }; y += h + 24 }
  if (sp.calc) {
    const h = phone ? 64 + 44 + 16 + 4 * 62 + 3 * 12 + 16 + (24 + lines(LOAN_RESULT, w - 64, 8) * 24 + 32) + 16 + 40 + 8 + 48 + 16 + lines(LOAN_NOTE, w - 32, CH_XS) * 16 + 16
      : 64 + 44 + 16 + 62 + 16 + 80 + 16 + 40 + 16 + lines(LOAN_NOTE, w - 32, CH_XS) * 16 + 16
    out.calc = { x, y, w, h }; y += h + 24
  }
  const nh = 20 + 28 + 8 + lines(sp.note, w - 40, CH_SM) * 20 + 20
  out.notes = { x, y, w, h: nh }; y += nh + 24
  let fx = x, fw = w
  if (!sp.repeat) {
    out.top = { x, y, w, h: 36 }; y += 36 + 16
    const missing = sp.fields.filter((f) => f.req && !f.v).map((f) => f.l)
    out.missing = missing
    if (missing.length) {
      const h = 12 + 20 + lines("You can save now and finish later, but this folder won't show as complete until every required field is filled.", w - 60, CH_XS) * 16 + 8 + chipRows(missing, w - 60) * 26 + 12
      out.warn = { x, y, w, h }; y += h + 16
    }
  } else {
    out.missing = []
    out.top = { x, y, w, h: 36 }; y += 36 + 24
    if (sp.repeat.coach) { out.coach = { x: x + w - 250, y, w: 250, h: 40 }; y += 40 + 24 }
    if (sp.repeat.archive) { out.arch = { x, y, w, h: 20 }; y += 20 + 24 }
    out.card = { x, y, w, h: 0 }
    fx = x + 16; fw = w - 32
    y += 16 + 36 + 12
  }
  const { items, bottom } = layoutFields(sp.fields, fx, fw, y, phone)
  out.items = items
  out.form = { x: fx, y, w: fw, h: bottom - y }
  y = bottom
  if (sp.repeat) {
    if (sp.repeat.linked) { out.linked = { x: fx, y: y + 16, w: fw, h: phone ? 112 : 80 }; y += 16 + (phone ? 112 : 80) }
    out.save = { x: fx, y: y + 16, w: 80, h: 40 }; y += 16 + 40 + 16
    out.card = { ...out.card!, h: y - out.card!.y }
    out.add = { x, y: y + 24, w: 140, h: 40 }; y += 24 + 40
  } else {
    out.save = { x, y: y + 24, w: 80, h: 44 }; y += 24 + 44
  }
  out.h = Math.max(phone ? 844 : 760, y + 48)
  return out as FolderLayout
}

// PdfActions' [Download PDF] [Share PDF] pair (icons only on a phone).
function PdfBtns({ phone }: { phone?: boolean }) {
  const b = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  return (
    <>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><PdfGlyph />{!phone && "Download PDF"}</span>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><MailGlyph />{!phone && "Share PDF"}</span>
    </>
  )
}
// ShareButton (person + plus) - green dot once someone is nominated.
const PersonPlus = ({ shared }: { shared?: boolean }) => (
  <span className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border ${shared ? "border-emerald-500 bg-emerald-50" : "border-tal-line bg-white"}`}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
    {shared && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
  </span>
)
const ExcelBtn = () => (
  <span className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-medium text-tal-plum">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-700 text-[9px] font-bold text-white">X</span>Export to Excel
  </span>
)
function Control({ f, h, phone }: { f: FF; h: number; phone?: boolean }) {
  const box = "flex h-11 items-center rounded-xl border border-tal-line bg-white px-3 text-sm"
  const ph = <span className="truncate text-tal-plum-soft/50">{f.ph ?? ""}</span>
  if (f.t === "textarea") return <div className="whitespace-pre-line rounded-xl border border-tal-line bg-white p-3 text-sm leading-5" style={{ height: h }}>{f.v}</div>
  if (f.t === "image") {
    return (
      <div className="rounded-xl border border-tal-line bg-white p-3">
        <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-lg border border-tal-line bg-tal-cream-soft text-center text-[10px] leading-tight text-tal-plum-soft">{f.v ? "Tap to preview" : "No image"}</div>
        <p className="mt-2 text-xs text-tal-plum-soft">Use <span className="font-medium">Upload</span> above to set or replace.</p>
      </div>
    )
  }
  if (f.t === "file") {
    if (f.v) {
      return (
        <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-tal-line bg-white px-3 py-2 ${phone ? "" : "h-[50px]"}`}>
          <span className="flex min-w-0 items-center gap-2 text-sm"><PdfGlyph /><span className="truncate">{f.v}</span></span>
          <span className="flex shrink-0 items-center gap-2 text-xs">
            {["View", "Download", "Share", "Replace"].map((a) => <span key={a} className="inline-flex h-8 items-center rounded-lg border border-tal-line bg-white px-2.5 font-medium">{a}</span>)}
            <span className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-2.5 font-medium text-red-700">Remove</span>
          </span>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-medium text-white shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Upload &amp; scan a file
        </span>
        {f.demo && <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</span>}
      </div>
    )
  }
  if (f.t === "dropdown") return <div className={`${box} justify-between`}><span className="truncate">{f.v ?? "—"}</span><span className="pl-1 text-xs text-tal-plum-soft">▾</span></div>
  if (f.t === "date") return <div className={`${box} justify-between`}>{f.v ? <span>{f.v}</span> : <span className="text-tal-plum-soft/50">dd/mm/yyyy</span>}<span className="text-tal-plum-soft/70">▦</span></div>
  return <div className={box}>{f.v ? <span className="truncate">{f.v}</span> : ph}</div>
}
function FieldView({ p, phone }: { p: Placed; phone?: boolean }) {
  const { f, r } = p
  return (
    <Box {...r}>
      <p className="mb-1 text-xs uppercase leading-4 tracking-wider text-tal-plum-soft">{f.l}{f.req && <span className="text-red-500">*</span>}</p>
      <Control f={f} h={ctrlH(f, r.w, !!phone)} phone={phone} />
      {f.hint && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
    </Box>
  )
}
// UserPicker's list, with each person's status in this folder.
function PickerList({ sp, r }: { sp: FolderSpec; r: Rect }) {
  const row = MATRIX[sp.cat][rowIx(sp.cat, sp.id)]
  return (
    <Box {...r} className="overflow-hidden rounded-xl border border-tal-line bg-white py-1 shadow-lg">
      {PEOPLE.map((u, i) => {
        const st = row.cells?.[i] ?? "empty"
        const active = i === sp.person
        return (
          <div key={u.n} className={`flex h-[52px] items-center justify-between px-3 text-sm ${active ? "bg-tal-cream-soft" : st === "done" ? "bg-emerald-50" : st === "started" ? "bg-amber-50" : ""}`}>
            <div><p className="font-medium">{u.n}</p><p className="text-xs text-tal-plum-soft">{u.k}{st === "done" ? " · Complete" : st === "started" ? " · Started" : ""}</p></div>{active && <span>✓</span>}
          </div>
        )
      })}
    </Box>
  )
}
const pickRect = (lay: FolderLayout): Rect => ({ x: lay.picker.x, y: lay.picker.y + lay.picker.h + 6, w: 256, h: 4 * 52 + 8 })

function FolderBody({ sp, lay, phone, picker }: { sp: FolderSpec; lay: FolderLayout; phone?: boolean; picker?: boolean }) {
  const x = phone ? PX : L, w = phone ? PCW : CW
  const person = PEOPLE[sp.person].n
  return (
    <>
      {/* Breadcrumb + UserPicker */}
      <Box x={x} y={phone ? 116 : 78} w={phone ? PCW : lay.picker.x - L} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>{catLabel(sp.cat)}</span><span className="opacity-50">·</span></Box>
      <Box {...lay.picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">{person}</span><span className="text-xs">▾</span>
      </Box>
      <Box x={lay.picker.x + lay.picker.w + 10} y={lay.picker.y + 8} w={170} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>

      {/* Header */}
      <Box {...lay.head} className="rounded-2xl bg-black shadow-md" />
      <Img src={thumbOf(sp.id)} x={x + (phone ? 12 : 20)} y={lay.head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={x + (phone ? 76 : 84)} y={lay.head.y + 12} w={phone ? PCW - 88 : 600} h={lay.titleH} className="flex flex-col justify-center text-white">
        <p className="font-display text-xl leading-tight sm:text-2xl" style={{ fontSize: phone ? 20 : 24 }}>{sp.name}</p>
        {sp.hint && <p className="mt-0.5 truncate text-xs text-white/70">{sp.hint}</p>}
      </Box>
      <Box x={phone ? x + 12 : x + w - 170} y={phone ? lay.head.y + 12 + lay.titleH + 12 : lay.head.y + 18} w={150} h={36} className="flex"><ExcelBtn /></Box>

      {sp.desc && lay.desc && (
        <Box {...lay.desc} className="flex items-start gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 text-sm leading-relaxed">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>{sp.desc}
        </Box>
      )}
      {lay.will && (
        <Box {...lay.will} className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200"><WarnIcon /></span>
          <div><p className="mb-1 font-semibold">Important — not a legal document</p><p>{WILL_TEXT}</p></div>
        </Box>
      )}
      {lay.calc && <LoanCalc r={lay.calc} phone={phone} />}

      {/* FolderNotes */}
      <Box {...lay.notes} className="rounded-2xl border border-tal-line bg-amber-50/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" /></svg></span><span className="font-display text-lg">Notes</span></span>
          <span className="text-xs text-tal-plum-soft underline">Add note</span>
        </div>
        <p className="text-sm leading-5 text-tal-plum-soft">{sp.note}</p>
      </Box>

      {/* PageForm */}
      {lay.top && (
        <Box {...lay.top} className="flex items-center justify-end gap-2">
          {sp.top?.includes("share") && <PersonPlus shared />}
          {sp.top?.includes("Preview") && <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm">▣ Preview</span>}
          <PdfBtns phone={phone} />
        </Box>
      )}
      {lay.warn && (
        <Box {...lay.warn} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><span className="text-amber-600"><WarnIcon /></span>{lay.missing.length} required fields still empty</p>
          <p className="ml-6 mt-0.5 text-xs leading-4 text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
          <div className="ml-6 mt-2 flex flex-wrap gap-1.5">{lay.missing.map((f) => <span key={f} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-900">{f}</span>)}</div>
        </Box>
      )}
      {lay.coach && <Box {...lay.coach} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white">✨ {sp.repeat?.coach}</Box>}
      {lay.arch && <Box {...lay.arch} className="font-display text-sm uppercase tracking-widest">{sp.repeat?.archive}</Box>}
      {lay.card && (
        <>
          <Box {...lay.card} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={lay.card.x + 16} y={lay.card.y + 16} w={lay.card.w - 32} h={36} className="flex items-center justify-between gap-2">
            {sp.repeat?.title ? <span className="truncate text-sm font-medium">{sp.repeat.title}</span> : <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span>}
            <span className="flex shrink-0 items-center gap-2">
              {sp.repeat?.share && <PersonPlus shared />}
              {!phone && <PdfBtns />}
              {sp.repeat?.archive && <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white">⊟</span>}
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span>
            </span>
          </Box>
        </>
      )}
      {lay.items.map((p) => <FieldView key={p.f.l} p={p} phone={phone} />)}
      {lay.linked && sp.repeat?.linked && (
        <Box {...lay.linked} className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">{sp.repeat.linked.label}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-56 items-center justify-between rounded-xl border border-tal-line bg-white px-2 text-sm"><span className="truncate">{sp.repeat.linked.item}</span><span className="text-xs">▾</span></span>
            <span className="inline-flex h-9 items-center rounded-xl bg-black px-3 text-sm font-medium text-white">View</span>
            <span className="text-sm underline underline-offset-2">Open folder →</span>
          </div>
        </Box>
      )}
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      {lay.add && <Box {...lay.add} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>}
      {picker && <PickerList sp={sp} r={pickRect(lay)} />}
    </>
  )
}
// LoanCalculator, opened, with the Taylors' home loan figures.
function LoanCalc({ r, phone }: { r: Rect; phone?: boolean }) {
  const inputs = [["Loan amount ($)", "520000"], ["Interest rate (% a year)", "6.2"], ["Loan term (years)", "30"], ["Repayments", "Monthly ▾"]]
  const gx = r.x + 16, gw = r.w - 32
  const gridY = r.y + 64 + 44 + 16
  const gridH = phone ? 4 * 62 + 3 * 12 : 62
  const resY = gridY + gridH + 16
  const resH = phone ? 24 + lines(LOAN_RESULT, r.w - 64, 8) * 24 + 32 : 80
  const useY = resY + resH + 16
  return (
    <>
      <Box {...r} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={gx} y={r.y + 12} w={gw} h={40} className="flex items-center justify-between">
        <span><span className="block font-medium">Loan calculator</span><span className="block text-xs text-tal-plum-soft">Work out repayments, or how long a loan will take to pay off.</span></span><span>−</span>
      </Box>
      <Box x={gx} y={r.y + 64} w={phone ? gw : 460} h={44} className={`inline-flex rounded-xl border border-tal-line p-1 ${phone ? "text-xs" : "text-sm"}`}>
        <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-black px-2 text-white">What will my repayments be?</span>
        <span className="inline-flex flex-1 items-center justify-center rounded-lg px-2">How long to pay it off?</span>
      </Box>
      {inputs.map(([l, v], n) => {
        const cw = phone ? gw : (gw - 36) / 4
        return (
          <Box key={l} x={phone ? gx : gx + n * (cw + 12)} y={phone ? gridY + n * 74 : gridY} w={cw} h={62}>
            <p className="mb-1 text-xs text-tal-plum-soft">{l}</p>
            <div className="flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm">{v}</div>
          </Box>
        )
      })}
      <Box x={gx} y={resY} w={gw} h={resH} className="rounded-xl border-2 border-black bg-tal-cream-soft p-4 text-base">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-tal-plum-soft">Your result</p>
        <p>Repayments of about <strong>$3,184.84</strong> monthly, with about <strong>$626,542</strong> interest over the life of the loan.</p>
      </Box>
      <Box x={gx} y={useY} w={gw} h={phone ? 96 : 40} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">Add these figures as a new loan</span>
        <span className={`text-xs text-tal-plum-soft ${phone ? "" : "max-w-[420px]"}`}>Starts a new entry below with these figures filled in — check it, add the name and lender, then press Save.</span>
      </Box>
      <Box x={gx} y={r.y + r.h - 16 - lines(LOAN_NOTE, r.w - 32, CH_XS) * 16} w={gw} h={lines(LOAN_NOTE, r.w - 32, CH_XS) * 16} className="text-xs leading-4 text-tal-plum-soft">{LOAN_NOTE}</Box>
    </>
  )
}

// ── Tasks (tasks/page + TasksList) and Security & Privacy (security/page) ────

const SETUP = [
  { t: "Add your family members (or confirm it's just you)", d: true },
  { t: "Got the physical Adulting Life organiser? Grab it — you can file along as you go", d: true },
  { t: "Start filling in an Organiser folder", d: true },
  { t: "Finish filling in an Organiser folder", d: true },
  { t: "Fill in one Peace of Mind section", d: true },
  { t: "Complete 5 Peace of Mind sections", d: false },
  { t: "Read your first Learn article", d: false },
  { t: "Take a quiz", d: false },
  { t: "Watch a Learn video", d: false },
]
const MY_TASKS = [
  { t: "Renew Toyota RAV4 rego", s: "Due 3 Dec 2026", link: "→ Toyota RAV4 registration" },
  { t: "Book Leo's dentist check-up", s: "Due 12 Dec 2026" },
  { t: "Upload Mia's Term 4 report", s: "Added 18 Nov 2026" },
]
const SEC_CARDS = [
  { t: "Encrypted in storage", b: "Everything you upload — documents, photos, form entries — is stored on managed infrastructure and encrypted at rest. Files and records sit behind per-user access rules, so another account can't reach into yours.", c: "bg-emerald-50 ring-emerald-100", i: "bg-emerald-100 text-emerald-700", g: "🔒" },
  { t: "Only you (and who you invite)", b: "Your family group starts with just you. If you add family members, you choose who is a member and what they can see. No one at The Adulting Life reads your records.", c: "bg-violet-50 ring-violet-100", i: "bg-violet-100 text-violet-700", g: "👁" },
  { t: "Backed up automatically", b: "Data is backed up by our infrastructure provider so an accidental loss on your device doesn't mean losing your records. You can also print or export an emergency page anytime.", c: "bg-sky-50 ring-sky-100", i: "bg-sky-100 text-sky-700", g: "☁" },
  { t: "You stay in control", b: "You sign in with Google, Microsoft or Apple, and only your app PIN or Face ID opens the app. Delete individual records at any time, and if you want to leave, you can download everything and delete your account.", c: "bg-amber-50 ring-amber-100", i: "bg-amber-100 text-amber-700", g: "🔑" },
]
const SEC_LINKS = [
  { t: "PIN, Face ID & account settings", s: "Change your app PIN, Face ID and your details." },
  { t: "Emergency page (print or share)", s: "One page with everything a paramedic or trusted person needs." },
]
type TasksLayout = { head: Rect; setup: Rect; item: (n: number) => Rect; filter: Rect; task: (n: number) => Rect; h: number }
function tasksLayout(phone: boolean): TasksLayout {
  const x = phone ? PX : L, w = phone ? PCW : CW
  const head = phone ? { x, y: 120, w, h: 104 } : { x, y: 76, w, h: 68 }
  const itemH = (n: number) => (phone ? 24 + lines(SETUP[n].t, w - 40 - 60, CH_SM) * 20 : 50)
  const setupY = head.y + head.h + 24
  const itemY = (n: number) => setupY + 20 + 28 + 12 + SETUP.slice(0, n).reduce((a, _, k) => a + itemH(k) + 8, 0)
  const setup = { x, y: setupY, w, h: itemY(SETUP.length) - 8 + 20 - setupY }
  const filter = { x, y: setup.y + setup.h + 24, w, h: 40 }
  const task = (n: number) => ({ x, y: filter.y + 56 + n * 70, w, h: 62 })
  return { head, setup, item: (n) => ({ x: x + 20, y: itemY(n), w: w - 40, h: itemH(n) }), filter, task, h: Math.max(phone ? 844 : 760, task(MY_TASKS.length).y + 40) }
}
const TaskCheck = ({ done }: { done?: boolean }) => (
  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500 text-white" : "border border-tal-line bg-white"}`}>
    {done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
  </span>
)
function TasksBody({ lay, phone }: { lay: TasksLayout; phone?: boolean }) {
  const done = SETUP.filter((s) => s.d).length
  return (
    <>
      <Box {...lay.head} className={`flex flex-wrap items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md ${phone ? "content-center" : ""}`}>
        <Thumb src="/thumbnails/dashboard/tasks.png" size={36} />
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Tasks</span>
        <span className="font-display text-2xl leading-tight">Your list</span>
        <span className="text-white/40">·</span>
        <span className="text-sm text-white/80">{MY_TASKS.length + SETUP.length - done} things to do</span>
      </Box>
      <Box {...lay.setup} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={lay.setup.x + 20} y={lay.setup.y + 20} w={lay.setup.w - 40} h={28} className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg">Setup steps</span><span className="text-xs text-tal-plum-soft">{done} of {SETUP.length} done · {Math.round((done / SETUP.length) * 100)}%</span>
      </Box>
      {SETUP.map((s, n) => (
        <Box key={s.t} {...lay.item(n)} className={`flex items-center gap-3 rounded-xl border border-tal-line p-3 ${s.d ? "bg-tal-cream-soft/60" : "bg-white"}`}>
          <TaskCheck done={s.d} /><span className={`text-sm ${s.d ? "text-tal-plum-soft line-through" : ""}`}>{s.t}</span>
        </Box>
      ))}
      <Box {...lay.filter} className="flex items-center gap-2">
        <span className="inline-flex rounded-lg border border-tal-line bg-white p-1 text-xs font-medium">
          <span className="inline-flex h-8 items-center rounded-md bg-black px-3 text-white">Open ({MY_TASKS.length})</span>
          <span className="inline-flex h-8 items-center px-3 text-tal-plum-soft">All ({MY_TASKS.length + 2})</span>
        </span>
        <span className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-tal-line bg-tal-cream-soft px-3 text-sm font-medium"><PlusIcon />Add a task</span>
      </Box>
      {MY_TASKS.map((t, n) => (
        <Box key={t.t} {...lay.task(n)} className="flex items-center gap-3 rounded-xl border border-tal-line bg-white p-3">
          <TaskCheck />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.t}</p><p className="mt-0.5 flex gap-2 truncate text-xs text-tal-plum-soft"><span>{t.s}</span>{t.link && !phone && <span className="underline">{t.link}</span>}</p></div>
          <span className="text-tal-plum-soft">×</span>
        </Box>
      ))}
    </>
  )
}
type SecLayout = { head: Rect; card: (n: number) => Rect; quick: Rect; foot: number; h: number }
function secLayout(phone: boolean): SecLayout {
  const x = phone ? PX : L, w = phone ? PCW : CW
  const head = phone ? { x, y: 150, w, h: 116 } : { x, y: 104, w, h: 76 }
  const top = head.y + head.h + 24
  const cw = phone ? w : (w - 16) / 2
  const cardH = (n: number) => 20 + 48 + lines(SEC_CARDS[n].b, cw - 40, CH_SM) * 23 + 20
  const rowH = phone ? 0 : Math.max(cardH(0), cardH(1), cardH(2), cardH(3))
  const card = (n: number) => (phone
    ? { x, y: top + SEC_CARDS.slice(0, n).reduce((a, _, k) => a + cardH(k) + 16, 0), w, h: cardH(n) }
    : { x: x + (n % 2) * (cw + 16), y: top + Math.floor(n / 2) * (rowH + 16), w: cw, h: rowH })
  const quickY = card(3).y + card(3).h + 24
  const quick = { x, y: quickY, w, h: phone ? 24 + 36 + 2 * 92 + 12 + 24 : 24 + 36 + 92 + 24 }
  const foot = quick.y + quick.h + 24
  return { head, card, quick, foot, h: Math.max(phone ? 844 : 760, foot + (phone ? 90 : 60)) }
}
function SecurityBody({ lay, phone }: { lay: SecLayout; phone?: boolean }) {
  const x = phone ? PX : L, w = phone ? PCW : CW
  const lw = phone ? w - 48 : (w - 48 - 12) / 2
  return (
    <>
      <Box x={x} y={phone ? 116 : 78} w={w} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>Security &amp; Privacy</span></Box>
      <Box {...lay.head} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft px-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">{STAT_ICONS[2]}</span>
        <div><p className="font-display text-2xl leading-tight">Security &amp; Privacy</p><p className="text-sm text-tal-plum-soft">How your information is protected — and what stays under your control.</p></div>
      </Box>
      {SEC_CARDS.map((c, n) => (
        <Box key={c.t} {...lay.card(n)} className={`rounded-2xl p-5 ring-1 ${c.c}`}>
          <div className="mb-2 flex items-start gap-3"><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.i}`}>{c.g}</span><p className="mt-1 font-display text-lg leading-tight">{c.t}</p></div>
          <p className="text-sm leading-relaxed text-tal-plum-soft">{c.b}</p>
        </Box>
      ))}
      <Box {...lay.quick} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={x + 24} y={lay.quick.y + 24} w={w - 48} h={28} className="font-display text-xl">Quick actions</Box>
      {SEC_LINKS.map((q, n) => (
        <Box key={q.t} x={phone ? x + 24 : x + 24 + n * (lw + 12)} y={lay.quick.y + 60 + (phone ? n * 92 : 0)} w={lw} h={80} className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4">
          <p className="font-medium">{q.t}</p><p className="mt-1 text-xs text-tal-plum-soft">{q.s}</p>
        </Box>
      ))}
      <Box x={x} y={lay.foot} w={w} h={phone ? 64 : 36} className="text-xs text-tal-plum-soft">We&apos;re building this app with security as the top priority. As we add features (e.g. the Domestic Violence vault), each will get its own stricter access layer.</Box>
    </>
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

function DShell({ children, addOpen, userOpen, h = 760, fabs = true, nav = ACTIVE_NAV }: { children: ReactNode; addOpen?: boolean; userOpen?: boolean; h?: number; fabs?: boolean; nav?: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {/* Sidebar (AppSidebar) */}
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

// ── A section (records/[category] + FolderListHeader + CategoryMatrix) ───────

const M = {
  crumbs: { x: L, y: 76, w: CW, h: 20 },
  bar: { x: L, y: 104, w: CW, h: 108 },
  toggle: { x: L + CW - 24 - 108 - 8 - 104 - 8 - 128 - 8 - 214, y: 158, w: 214, h: 40 },
  pdf: { x: L + CW - 24 - 108 - 8 - 104 - 8 - 128, y: 160, w: 128, h: 36 },
  share: { x: L + CW - 24 - 108 - 8 - 104, y: 160, w: 104, h: 36 },
  newFolder: { x: L + CW - 24 - 108, y: 162, w: 108, h: 32 },
}
const SHARE_DLG = { x: 376, y: 100, w: 448, h: 560 }
const COL_AI = L + 400, COL_PL = L + 452, COL_U = L + 532, UW = 91
const colX = (u: number) => COL_U + u * UW
const ROW_H = 38
const M_TOP = 256 // table top
const mRowY = (n: number) => M_TOP + 56 + n * ROW_H
const mCell = (n: number, u: number) => ({ x: colX(u), y: mRowY(n), w: UW, h: ROW_H })
const mH = (cat: CatId) => Math.max(760, mRowY(MATRIX[cat].length) + 32)

function DMatrix({ cat, share }: { cat: CatId; share?: boolean }) {
  const rows = MATRIX[cat]
  const h = mH(cat)
  return (
    <DShell h={h} fabs={!share && h === 760}>
      <Box {...M.crumbs} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>{catLabel(cat)}</span></Box>
      <Box {...M.bar} className="rounded-2xl bg-black shadow-md" />
      <Img src={`/thumbnails/categories/${cat}.png`} x={L + 24} y={120} w={36} />
      <Box x={L + 72} y={126} w={200} h={22} className="flex items-center"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">The Adulting Life Organiser</span></Box>
      <Box x={L + 280} y={120} w={320} h={36} className="font-display text-2xl leading-9 text-white">{catLabel(cat)}</Box>
      <Box {...M.toggle} className="flex items-center gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs shadow-inner">
        {["List", "Grid", "Matrix"].map((v) => (
          <span key={v} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium ${v === "Matrix" ? "scale-105 bg-white text-black shadow-sm" : "text-white/85"}`}><ViewIcon v={v} />{v}</span>
        ))}
      </Box>
      <Box {...M.pdf} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfGlyph />Download PDF</Box>
      <Box {...M.share} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><MailGlyph />Share PDF</Box>
      <Box {...M.newFolder} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-medium text-black"><PlusIcon />New Folder</Box>
      <Box x={L} y={228} w={CW} h={22} className="flex items-center justify-between text-xs text-tal-plum-soft">
        <Legend />
        <span className="font-medium text-tal-plum">{CATS[CAT_N[cat]].total} folders in this section</span>
      </Box>
      {/* The table */}
      <Box x={L} y={M_TOP} w={CW} h={56 + rows.length * ROW_H + 2} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={L} y={M_TOP} w={CW} h={56} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      <Box x={L + 16} y={M_TOP + 18} w={200} h={20} className="text-sm font-medium text-tal-plum-soft">Folder</Box>
      <Box x={COL_AI} y={M_TOP + 10} w={52} h={40} className="text-center text-sm font-medium">AI<p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">help</p></Box>
      <Box x={COL_PL} y={M_TOP + 10} w={80} h={40} className="text-center text-sm font-medium">Planner<p className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">shareable</p></Box>
      {PEOPLE.map((p, u) => (
        <Box key={p.n} x={colX(u)} y={M_TOP + 10} w={UW} h={40} className="whitespace-nowrap text-center text-[13px] font-medium">{p.n}<p className="mt-0.5 text-[9px] uppercase tracking-wider text-tal-plum-soft">{p.k}</p></Box>
      ))}
      {rows.map((r, n) => (
        <div key={r.id}>
          {n > 0 && <Box x={L} y={mRowY(n)} w={CW} h={1} className="bg-tal-line" />}
          <Box x={L + 12} y={mRowY(n)} w={COL_AI - L - 16} h={ROW_H} className="flex items-center gap-2 text-sm">
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
            <Thumb src={thumbOf(r.id)} size={28} className="rounded-md ring-1 ring-tal-line" />
            <span className="truncate">{r.name}</span>
            {r.users && <span className="ml-1 shrink-0 text-[10px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
          </Box>
          {r.ai && <Box x={COL_AI} y={mRowY(n)} w={52} h={ROW_H} className="flex items-center justify-center"><AiHelpIcon /></Box>}
          {r.planner !== undefined && <Box x={COL_PL} y={mRowY(n)} w={80} h={ROW_H} className="flex items-center justify-center"><ShareCount n={r.planner} /></Box>}
          {r.fam ? (
            <Box x={COL_U} y={mRowY(n) + 1} w={UW * 4} h={ROW_H - 1} className={`flex items-center justify-center gap-2 ${CELL[r.fam].bg}`}>
              <span className={CELL[r.fam].c}>{CELL[r.fam].s}</span><span className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">· shared with family</span>
            </Box>
          ) : r.cells!.map((c, u) => (
            <Box key={u} x={colX(u)} y={mRowY(n) + 1} w={UW} h={ROW_H - 1} className={`flex items-center justify-center ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
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

// ── Folder pages, Tasks and Security on a computer ───────────────────────────

const DL = {
  miaPassport: folderLayout(F_MIA_PASSPORT, false),
  sarahPassport: folderLayout(F_SARAH_PASSPORT, false),
  will: folderLayout(F_WILL, false),
  healthIns: folderLayout(F_HEALTH_INS, false),
  secondary: folderLayout(F_SECONDARY, false),
  resume: folderLayout(F_RESUME, false),
  loans: folderLayout(F_LOANS, false),
}
const DT = tasksLayout(false)
const DSEC = secLayout(false)
const DFolder = ({ sp, lay, picker }: { sp: FolderSpec; lay: FolderLayout; picker?: boolean }) => (
  <DShell h={lay.h} fabs={false}><FolderBody sp={sp} lay={lay} picker={picker} /></DShell>
)

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
  matrix: <DMatrix cat="personal" />,
  share: <DMatrix cat="personal" share />,
  mhealth: <DMatrix cat="health" />,
  medu: <DMatrix cat="education" />,
  memp: <DMatrix cat="employment" />,
  madmin: <DMatrix cat="admin" />,
  mia: <DFolder sp={F_MIA_PASSPORT} lay={DL.miaPassport} />,
  miapick: <DFolder sp={F_MIA_PASSPORT} lay={DL.miaPassport} picker />,
  sarahpass: <DFolder sp={F_SARAH_PASSPORT} lay={DL.sarahPassport} />,
  will: <DFolder sp={F_WILL} lay={DL.will} />,
  healthins: <DFolder sp={F_HEALTH_INS} lay={DL.healthIns} />,
  secondary: <DFolder sp={F_SECONDARY} lay={DL.secondary} />,
  resume: <DFolder sp={F_RESUME} lay={DL.resume} />,
  loans: <DFolder sp={F_LOANS} lay={DL.loans} />,
  tasks: <DShell h={DT.h} fabs={false} nav={8}><TasksBody lay={DT} /></DShell>,
  security: <DShell h={DSEC.h} fabs={false} nav={-1}><SecurityBody lay={DSEC} /></DShell>,
}
const BASE = "app.theadultinglife.com.au"
const U_ORG = `${BASE}/records`
const U_SEARCH = `${BASE}/records/search`
const U_NEW = `${BASE}/records/personal/new`
const U_REC = `${BASE}/records/employment/r/7c1e`
const U_CAT = (c: CatId) => `${BASE}/records/${c}`
const U_FOLDER = (sp: FolderSpec) => `${BASE}/records/${sp.cat}/${sp.id}?user=${PEOPLE[sp.person].n.split(" ")[0].toLowerCase()}`
const U_TASKS = `${BASE}/tasks`
const U_SECURITY = `${BASE}/security`

// Shared step helpers (computer)
const fieldsRing = (lay: FolderLayout, from: number, to: number) => {
  const a = lay.items[from].r, b = lay.items[Math.min(to, lay.items.length - 1)].r
  return pad({ x: lay.form.x, y: a.y, w: lay.form.w, h: b.y + b.h - a.y }, 6)
}
const dCatClick = (c: CatId, caption: string, detail: string): WalkStep => {
  const r = O.cat(CAT_N[c])
  return { screen: "org", url: U_ORG, scroll: 420, caption, detail, focus: { x: r.x + r.w / 2, y: r.y + 60, scale: 1.45 }, ring: r, click: { x: r.x + r.w / 2, y: r.y + 50 }, duration: 5000 }
}
const dMatrixOpen = (screen: string, c: CatId, id: string, u: number, caption: string, detail: string): WalkStep => {
  const n = rowIx(c, id), cell = mCell(n, u)
  return { screen, url: U_CAT(c), caption, detail, focus: { x: 720, y: mRowY(n) + 40, scale: 1.25 }, ring: { x: L, y: mRowY(n), w: CW, h: ROW_H }, click: mid(cell), duration: 8000 }
}

const D_STEPS: WalkStep[] = [
  { screen: "org", url: U_ORG, caption: "The Adulting Life Organiser", detail: "All your important information, organised in one place - for the whole family. It's in the sidebar, under Setup guide.", focus: { x: 600, y: 300, scale: 1.05 }, ring: O.hdr, duration: 6500 },
  // Search
  { screen: "org", url: U_ORG, caption: "Search records", detail: "Opens the search page. Type a word - it looks through folder names, record titles, notes and the answers in your forms.", focus: { x: 900, y: 170, scale: 1.7 }, ring: O.search, click: mid(O.search), duration: 5500 },
  { screen: "sfound", url: `${U_SEARCH}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "And every passport record in the family, with its expiry date and an Active / Expiring soon / Expired label.", focus: { x: 720, y: 330, scale: 1.25 }, ring: { x: L - 4, y: 192, w: CW + 8, h: 300 }, duration: 6500 },
  { screen: "snone", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "Nothing is called \"how do i add a will\" - so TAL AI offers to point you to the right place. The first time, it asks before sending your search words.", focus: { x: 560, y: 220, scale: 1.45 }, ring: AI.ask, click: mid(AI.ask), duration: 7000 },
  { screen: "sai", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner. Click one to go straight there.", focus: { x: 620, y: 340, scale: 1.3 }, ring: AI.match(0), click: { x: L + 300, y: AI.match(0).y + 31 }, duration: 7000 },
  { screen: "will", url: U_FOLDER(F_WILL), caption: "Sarah's Will & Funeral Instructions", detail: "A reminder that this isn't a legal will. Attach a scan of the signed Will, then say whether you have one, when it was signed and where the original is kept.", focus: { x: 720, y: 520, scale: 1.1 }, ring: span(DL.will.will!, DL.will.items[2].r), duration: 8000 },
  { screen: "will", url: U_FOLDER(F_WILL), scroll: DL.will.items[6].r.y - 120, caption: "Executors and funeral wishes", detail: "Her solicitor, funeral wishes and any prepaid funeral, then up to three executors with phone, email and relationship - here James and Sarah's sister Emma. Nothing here is required.", ring: fieldsRing(DL.will, 6, 12), duration: 8500 },
  // Add Record
  { screen: "org", url: U_ORG, caption: "+ Add Record", detail: "Opens a new record in Personal - anything with a title and, if it has one, an expiry date.", focus: { x: 980, y: 170, scale: 1.7 }, ring: O.add, click: mid(O.add), duration: 5500 },
  { screen: "newrec", url: U_NEW, caption: "Title, expiry date, tags and notes", detail: "An expiry date becomes a reminder - under the bell, in Reminders, and here on the Organiser when it's 30 days away. Tags (wallet, glovebox, safe) help you find it later.", focus: { x: 620, y: 380, scale: 1.2 }, ring: pad(NR.expiry), click: mid(NR.create), duration: 7000 },
  // Expiring or expired
  { screen: "org", url: U_ORG, caption: "Expiring or expired (4)", detail: "Rego, insurance, cards and certificates due in the next 30 days - or already past. Each row shows its section and the expiry date.", focus: { x: 720, y: 330, scale: 1.3 }, ring: O.exp, duration: 7000 },
  { screen: "org", url: U_ORG, caption: "Click one to open it", detail: "Sarah's first aid certificate ran out on 10 November.", focus: { x: 600, y: 390, scale: 1.6 }, ring: O.expRow(EXPIRED_ROW), click: { x: L + 200, y: O.expRow(EXPIRED_ROW).y + 20 }, duration: 5500 },
  { screen: "record", url: U_REC, caption: "Update the date and it's sorted", detail: "Red Expired, amber Expiring soon, green Active. Change the expiry, Save changes, and it drops off the list. The audit trail shows who changed what.", focus: { x: 720, y: 300, scale: 1.2 }, ring: RC.pill, duration: 7500 },
  // Personal
  { screen: "org", url: U_ORG, scroll: 420, caption: "Choose a category - open Personal", detail: "Five sections, each with what goes in it and how far along the family is - \"6 of 22 folders complete\". Click one to see every folder in it.", focus: { x: 720, y: 670, scale: 1.12 }, ring: pad(allCats, 6), click: { x: O.cat(0).x + 144, y: O.cat(0).y + 50 }, duration: 7000 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Every folder, for every person", detail: "One column per family member - Sarah, James, Mia and Leo. List, Grid or Matrix view; download or email the whole section as a PDF.", focus: { x: 720, y: 220, scale: 1.2 }, ring: M.bar, duration: 7000 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Read it at a glance", detail: "✓ complete, ◐ in progress, ✗ empty, — not applicable (a will isn't for Mia or Leo). Family Members is one shared list. The share icon means it can go in the Planner.", focus: { x: 640, y: 330, scale: 1.3 }, ring: { x: L - 4, y: 224, w: 720, h: 30 }, duration: 8500 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Who it's shared with", detail: "The number is how many people can see this folder in their Peace of Mind Planner - green if someone, red if no one. Click to manage.", focus: { x: COL_PL + 40, y: mRowY(R_WILL) + 40, scale: 1.7 }, ring: { x: COL_PL, y: mRowY(R_WILL), w: 80, h: ROW_H }, click: { x: COL_PL + 40, y: mRowY(R_WILL) + 19 }, duration: 6000 },
  { screen: "share", url: U_CAT("personal"), caption: "Sharing — Will & Funeral Instructions", detail: "James and Sarah's sister Emma can see Sarah's will details. Share or Manage each person's entry, one at a time.", focus: { x: 600, y: 380, scale: 1.25 }, ring: SHARE_DLG, click: mid(SHARE_DONE), duration: 7000 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Click a square to open that person's folder", detail: "Mia's passport is still empty.", focus: { x: colX(MIA) + 40, y: mRowY(R_PASSPORT) + 20, scale: 1.7 }, ring: mCell(R_PASSPORT, MIA), click: mid(mCell(R_PASSPORT, MIA)), duration: 5500 },
  { screen: "mia", url: U_FOLDER(F_MIA_PASSPORT), caption: "Mia's passport: what's missing", detail: "All 11 starred fields are still empty, so the folder can't turn green yet. You can save part of it and finish later.", focus: { x: 720, y: DL.miaPassport.warn!.y + 40, scale: 1.2 }, ring: DL.miaPassport.warn!, duration: 7000 },
  { screen: "mia", url: U_FOLDER(F_MIA_PASSPORT), scroll: DL.miaPassport.items[0].r.y - 140, caption: "The passport's real fields", detail: "Upload & scan the data page and AI fills these in - type, issuing country, document number, names, nationality, birth date and place, issue and expiry dates.", ring: fieldsRing(DL.miaPassport, 0, 4), duration: 8500 },
  { screen: "miapick", url: U_FOLDER(F_MIA_PASSPORT), caption: "Switch person in one click", detail: "James's and Sarah's are complete. Pick Sarah to see a finished one.", focus: { x: 620, y: 220, scale: 1.5 }, ring: pickRect(DL.miaPassport), click: { x: pickRect(DL.miaPassport).x + 120, y: pickRect(DL.miaPassport).y + 30 }, duration: 6000 },
  { screen: "sarahpass", url: U_FOLDER(F_SARAH_PASSPORT), scroll: DL.sarahPassport.items[5].r.y - 200, caption: "Sarah's passport, filled in", detail: "Every starred field done, a scan attached and the photo cropped from it. The expiry date (14/03/2031) becomes a reminder; Preview shows it laid out like the real passport.", ring: fieldsRing(DL.sarahPassport, 5, 13), duration: 8500 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Need a folder that isn't there?", detail: "New Folder adds your own to the section - type a name and Create.", focus: { x: 900, y: 230, scale: 1.5 }, ring: M.newFolder, click: mid(M.newFolder), duration: 5500 },
  // Health
  dCatClick("health", "Open Health", "Medical advisers, medications, insurance, scripts, test results, plans."),
  dMatrixOpen("mhealth", "health", "health.health_insurance", SARAH, "Health: 21 folders", "From medical advisers to retirement plans. A sparkle means AI can help you write it (My Health Plan, Mindset). Open Sarah's health insurance."),
  { screen: "healthins", url: U_FOLDER(F_HEALTH_INS), scroll: 320, caption: "One entry per policy", detail: "Attach the policy, then provider, member number, level of cover, contact, start, renewal and review dates, premium and notes. + Add another for a second policy.", focus: { x: 720, y: 760, scale: 1.05 }, ring: pad(DL.healthIns.card!, 4), duration: 8500 },
  // Education
  dCatClick("education", "Open Education", "Schools, reports, certificates, courses and study plans - for the kids and the adults."),
  dMatrixOpen("medu", "education", "education.secondary_details", MIA, "Education: 12 folders", "Each school level has a school folder and a reports folder. Study Plan has AI help. Open Mia's Secondary Education."),
  { screen: "secondary", url: U_FOLDER(F_SECONDARY), scroll: 220, caption: "Mia's high school", detail: "The enrolment document, school name (required) and address, years started and finished, ATAR and subject results. Her term reports link in from Secondary Reports & Certificates.", focus: { x: 720, y: 620, scale: 1.08 }, ring: pad(DL.secondary.card!, 4), duration: 8500 },
  // Employment
  dCatClick("employment", "Open Employment", "Employee details, cover letters, resumes, contracts, reviews and pay summaries."),
  dMatrixOpen("memp", "employment", "employment.resume", SARAH, "Employment: 12 folders", "Cover Letter, Resume and Position Description have AI help. Leo is too young for the Employee Information Form. Open Sarah's Resume."),
  { screen: "resume", url: U_FOLDER(F_RESUME), scroll: 300, caption: "Sarah's résumé", detail: "Attach it or write it here - title, date and the résumé itself. Archived on moves an old one to Past resumes. Or let \"Write my résumé with AI\" draft it.", focus: { x: 720, y: 720, scale: 1.05 }, ring: pad(DL.resume.card!, 4), duration: 8000 },
  // Admin & Bookkeeping
  dCatClick("admin", "Open Admin & Bookkeeping", "Bank accounts, loans, budgets, super, tax, insurance, bills and warranties."),
  dMatrixOpen("madmin", "admin", "admin.loans", SARAH, "Admin & Bookkeeping: 23 folders", "Accounts and their statements, loans, super, tax, insurance, phone, power, rates and water. Property Records is shared with the family. Open Sarah's Loans."),
  { screen: "loans", url: U_FOLDER(F_LOANS), scroll: 120, caption: "A loan calculator at the top", detail: "$520,000 at 6.2% over 30 years works out at about $3,185 a month. One click starts a new loan with those figures.", focus: { x: 720, y: DL.loans.calc!.y + 200, scale: 1.12 }, ring: DL.loans.calc!, duration: 8000 },
  { screen: "loans", url: U_FOLDER(F_LOANS), scroll: DL.loans.card!.y - 90, caption: "One entry per loan", detail: "Loan name (required), type, lender, account number, original amount, start and end dates, repayments, interest rate and notes - mortgage, car loan, personal loan or credit card.", focus: { x: 720, y: DL.loans.card!.y + 300, scale: 1.05 }, ring: pad(DL.loans.card!, 4), duration: 8500 },
  // The rest of the Organiser page
  { screen: "org", url: U_ORG, scroll: 520, caption: "Your progress, and peace of mind", detail: "5 Categories jumps back up to the sections. 22 of 90 folders done, 14 in progress - click it to see what to do next.", focus: { x: 720, y: 894, scale: 1.3 }, ring: span(O.stat(0), O.stat(3)), click: mid(O.stat(1)), duration: 7000 },
  { screen: "tasks", url: U_TASKS, caption: "Tasks: setup steps and your own list", detail: "Setup steps tick off as you go (5 of 9 done). Below, your own to-dos - add a task, give it a due date, link it to a record.", focus: { x: 720, y: 420, scale: 1.08 }, ring: pad(DT.setup, 4), duration: 7500 },
  { screen: "org", url: U_ORG, scroll: 520, caption: "Secure & private", detail: "This one, and Always backed up, open Security & Privacy.", focus: { x: 800, y: 894, scale: 1.6 }, ring: O.stat(2), click: mid(O.stat(2)), duration: 5000 },
  { screen: "security", url: U_SECURITY, caption: "How your information is protected", detail: "Encrypted in storage, only you and who you invite, backed up automatically, and you stay in control. Quick links to your PIN and Face ID, and the emergency page.", focus: { x: 720, y: 400, scale: 1.08 }, ring: pad(span(DSEC.card(0), DSEC.card(3)), 4), duration: 8000 },
  { screen: "orghidden", url: U_ORG, scroll: 520, caption: "New here? And folders you've hidden", detail: "Getting Started Guide opens the same Tasks list. Hidden suggestions brings back folders you snoozed or marked Not applicable - Unhide.", focus: { x: 720, y: 1100, scale: 1.2 }, ring: span(O.newTo, O.hiddenOpen), click: { x: L + 400, y: 1078 }, duration: 7500 },
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

// ── A section on a phone (FolderListHeader + CategoryMatrix's MobileMatrix) ──

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
const pCell = (n: number, u: number) => ({ x: pCellX(u), y: pRowY(n) + 38, w: P_CELL_W, h: 32 })
const pmH = (cat: CatId) => pRowY(MATRIX[cat].length) + 40

function PMatrix({ cat }: { cat: CatId }) {
  const rows = MATRIX[cat]
  return (
    <PPage h={pmH(cat)}>
      <Box x={PX} y={116} w={PCW} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span className="truncate">{catLabel(cat)}</span></Box>
      <Box {...PM.bar} className="rounded-2xl bg-black shadow-md" />
      <Img src={`/thumbnails/categories/${cat}.png`} x={PX + 24} y={160} w={36} />
      <Box x={PX + 72} y={167} w={220} h={22} className="flex items-center"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">The Adulting Life Organiser</span></Box>
      <Box x={PX + 24} y={206} w={PCW - 48} h={34} className="truncate font-display text-2xl leading-9 text-white">{catLabel(cat)}</Box>
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
        <p className="mt-2 font-medium text-tal-plum">{CATS[CAT_N[cat]].total} folders in this section</p>
      </Box>
      {/* MobileMatrix */}
      <Box x={PX} y={PM.card.y} w={PCW} h={140 + rows.length * P_ROW_H} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box {...PM.names} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      {PEOPLE.map((p, u) => (
        <Box key={p.n} x={pCellX(u)} y={PM.card.y + 12} w={P_CELL_W} h={120} className="flex items-end justify-center">
          <div className="truncate px-1 text-xs font-medium leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {p.n}{p.primary && <span className="ml-1 text-tal-plum-soft">★</span>}
          </div>
        </Box>
      ))}
      {rows.map((r, n) => (
        <div key={r.id}>
          {n > 0 && <Box x={PX} y={pRowY(n)} w={PCW} h={1} className="bg-tal-line" />}
          <Box x={PX + 8} y={pRowY(n) + 8} w={PCW - 16} h={24} className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
            <Thumb src={thumbOf(r.id)} size={24} className="rounded-md ring-1 ring-tal-line" />
            <span className="min-w-0 truncate">{r.name}</span>
            {r.users && <span className="ml-1 shrink-0 text-[9px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
            {r.planner !== undefined && <span className="ml-1 inline-flex shrink-0 text-tal-plum"><ShareIcon size={13} /></span>}
          </Box>
          {r.fam ? (
            <Box x={PX + 8} y={pRowY(n) + 38} w={PCW - 16} h={32} className={`flex items-center justify-center gap-2 rounded-md ${CELL[r.fam].bg}`}>
              <span className={CELL[r.fam].c}>{CELL[r.fam].s}</span><span className="text-[9px] font-medium uppercase tracking-widest text-tal-plum-soft">· family</span>
            </Box>
          ) : r.cells!.map((c, u) => (
            <Box key={u} {...pCell(n, u)} className={`flex items-center justify-center rounded-md ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
          ))}
        </div>
      ))}
    </PPage>
  )
}

// ── Folder pages, Tasks and Security on a phone ──────────────────────────────

const PL = {
  miaPassport: folderLayout(F_MIA_PASSPORT, true),
  sarahPassport: folderLayout(F_SARAH_PASSPORT, true),
  will: folderLayout(F_WILL, true),
  healthIns: folderLayout(F_HEALTH_INS, true),
  secondary: folderLayout(F_SECONDARY, true),
  resume: folderLayout(F_RESUME, true),
  loans: folderLayout(F_LOANS, true),
}
const PT = tasksLayout(true)
const PSEC = secLayout(true)
const PFolder = ({ sp, lay, picker }: { sp: FolderSpec; lay: FolderLayout; picker?: boolean }) => (
  <PPage h={lay.h}><FolderBody sp={sp} lay={lay} phone picker={picker} /></PPage>
)

const P_SCREENS: Record<string, ReactNode> = {
  org: <POrganiser />,
  orghidden: <POrganiser hiddenOpen />,
  stype: <PSearch q={Q1} mode="typing" />,
  sfound: <PSearch q={Q1} mode="found" />,
  snone: <PSearch q={Q2} mode="none" />,
  sai: <PSearch q={Q2} mode="ai" />,
  newrec: <PNewRecord />,
  record: <PRecord />,
  matrix: <PMatrix cat="personal" />,
  mhealth: <PMatrix cat="health" />,
  medu: <PMatrix cat="education" />,
  memp: <PMatrix cat="employment" />,
  madmin: <PMatrix cat="admin" />,
  mia: <PFolder sp={F_MIA_PASSPORT} lay={PL.miaPassport} />,
  miapick: <PFolder sp={F_MIA_PASSPORT} lay={PL.miaPassport} picker />,
  sarahpass: <PFolder sp={F_SARAH_PASSPORT} lay={PL.sarahPassport} />,
  will: <PFolder sp={F_WILL} lay={PL.will} />,
  healthins: <PFolder sp={F_HEALTH_INS} lay={PL.healthIns} />,
  secondary: <PFolder sp={F_SECONDARY} lay={PL.secondary} />,
  resume: <PFolder sp={F_RESUME} lay={PL.resume} />,
  loans: <PFolder sp={F_LOANS} lay={PL.loans} />,
  tasks: <PPage h={PT.h}><TasksBody lay={PT} phone /></PPage>,
  security: <PPage h={PSEC.h}><SecurityBody lay={PSEC} phone /></PPage>,
}
const pFull = (r: Rect) => ({ x: PX, y: r.y, w: PCW, h: r.h })
// Shared step helpers (phone)
const pFieldsRing = (lay: FolderLayout, from: number, to: number) => {
  const a = lay.items[from].r, b = lay.items[Math.min(to, lay.items.length - 1)].r
  return pad({ x: PX, y: a.y, w: PCW, h: b.y + b.h - a.y }, 2)
}
const pCatClick = (c: CatId, caption: string, detail: string): WalkStep => {
  const r = PO.cat(CAT_N[c])
  return { screen: "org", url: U_ORG, scroll: r.y - 300, caption, detail, focus: { x: 195, y: r.y + 75, scale: 1.15 }, ring: r, click: { x: 195, y: r.y + 50 }, duration: 5000 }
}
const pMatrixOpen = (screen: string, c: CatId, id: string, u: number, caption: string, detail: string): WalkStep => {
  const n = rowIx(c, id), cell = pCell(n, u)
  return { screen, url: U_CAT(c), scroll: Math.max(0, pRowY(n) - 420), caption, detail, focus: { x: 195, y: pRowY(n) + 40, scale: 1.2 }, ring: pFull({ x: 0, y: pRowY(n), w: 0, h: P_ROW_H }), click: mid(cell), duration: 8000 }
}
const pCard = (lay: FolderLayout) => pad(lay.card!, 2)
const pScrollTo = (lay: FolderLayout, y: number) => Math.max(0, Math.min(lay.h - 844, y))

const P_STEPS: WalkStep[] = [
  { screen: "org", url: U_ORG, caption: "The Adulting Life Organiser", detail: "Every important record for the whole family, in five sections. Open it from the ☰ menu.", duration: 6000 },
  // Search
  { screen: "org", url: U_ORG, caption: "Search records", detail: "On a phone, this is where search lives.", focus: { x: 195, y: 230, scale: 1.4 }, ring: PO.search, click: mid(PO.search), duration: 5000 },
  { screen: "stype", url: U_SEARCH, caption: "Type what you're after", detail: "Folder names, record titles, notes and the answers in your forms.", focus: { x: 195, y: 200, scale: 1.4 }, ring: P_SR.btn, click: mid(P_SR.btn), duration: 6000 },
  { screen: "sfound", url: `${U_SEARCH}?q=${Q1}`, caption: "\"passport\" finds the Passport folder", detail: "And every passport record in the family, with its expiry date.", focus: { x: 195, y: 380, scale: 1.1 }, ring: { x: PX - 2, y: 236, w: PCW + 4, h: 300 }, duration: 6000 },
  { screen: "snone", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "No match? Ask TAL AI to find it", detail: "It points you to the right place. The first time, it asks before sending your search words.", focus: { x: 195, y: 300, scale: 1.3 }, ring: P_AI.ask, click: mid(P_AI.ask), duration: 6500 },
  { screen: "sai", url: `${U_SEARCH}?q=how+do+i+add+a+will`, caption: "TAL AI tells you where to go", detail: "Will & Funeral Instructions in Personal, and the Peace of Mind Planner. Tap one to go there.", focus: { x: 195, y: 440, scale: 1.08 }, ring: { x: PX + 20, y: P_AI.matchY, w: PCW - 40, h: P_AI.gap - 8 }, click: { x: 195, y: P_AI.matchY + 38 }, duration: 7000 },
  { screen: "will", url: U_FOLDER(F_WILL), scroll: pScrollTo(PL.will, PL.will.will!.y - 120), caption: "Sarah's Will & Funeral Instructions", detail: "Not a legal will - a record of it. Attach the signed Will, say when it was signed and where the original is.", focus: { x: 195, y: PL.will.will!.y + 300, scale: 1.02 }, ring: pFull(span(PL.will.will!, PL.will.will!)), duration: 7500 },
  { screen: "will", url: U_FOLDER(F_WILL), scroll: pScrollTo(PL.will, PL.will.items[10].r.y - 200), caption: "Executors and funeral wishes", detail: "Up to three executors with phone, email and relationship - James and Emma here. Plus funeral wishes and any prepaid funeral.", focus: { x: 195, y: PL.will.items[12].r.y, scale: 1.02 }, ring: pFieldsRing(PL.will, 10, 13), duration: 8000 },
  // Add Record
  { screen: "org", url: U_ORG, caption: "+ Add Record", detail: "A new record in Personal - anything with a title and, if it has one, an expiry date.", focus: { x: 260, y: 230, scale: 1.4 }, ring: PO.add, click: mid(PO.add), duration: 5000 },
  { screen: "newrec", url: U_NEW, caption: "Title, expiry date, tags and notes", detail: "An expiry date becomes a reminder - under the bell, in Reminders, and on the Organiser when it's due.", focus: { x: 195, y: 420, scale: 1.05 }, ring: pad(PNR.expiry), click: mid(PNR.create), duration: 7000 },
  // Expiring
  { screen: "org", url: U_ORG, scroll: 220, caption: "Expiring or expired (4)", detail: "Anything due in the next 30 days, or already past - with its section and date.", focus: { x: 195, y: 460, scale: 1.08 }, ring: PO.exp, duration: 6500 },
  { screen: "org", url: U_ORG, scroll: 220, caption: "Tap one to open it", detail: "Sarah's first aid certificate ran out on 10 November.", focus: { x: 195, y: 560, scale: 1.3 }, ring: PO.expRow(EXPIRED_ROW), click: { x: 180, y: PO.expRow(EXPIRED_ROW).y + 24 }, duration: 5000 },
  { screen: "record", url: U_REC, caption: "Update the date and it's sorted", detail: "Red Expired, amber Expiring soon, green Active. Change the expiry and Save changes.", focus: { x: 195, y: 420, scale: 1.05 }, ring: PRC.pill, click: mid(PRC.save), duration: 7000 },
  // Personal
  { screen: "org", url: U_ORG, scroll: 640, caption: "Choose a category", detail: "Personal, Health, Education, Employment and Admin & Bookkeeping - each with what goes in it.", focus: { x: 195, y: 1000, scale: 1.05 }, ring: span(PO.cat(0), PO.cat(4)), duration: 6000 },
  { screen: "org", url: U_ORG, scroll: 640, caption: "How far along each one is", detail: "\"6 of 22 folders complete\", the percentage and the bar - for the whole family. Tap Personal.", focus: { x: 195, y: 760, scale: 1.4 }, ring: { x: PX + 16, y: PO.cat(0).y + 104, w: PCW - 32, h: 34 }, click: { x: 195, y: PO.cat(0).y + 50 }, duration: 6000 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Every folder, for every person", detail: "List, Grid or Matrix; download or email the section as a PDF; or add a New Folder of your own.", focus: { x: 195, y: 300, scale: 1.08 }, ring: PM.bar, duration: 6500 },
  { screen: "matrix", url: U_CAT("personal"), caption: "Read it at a glance", detail: "✓ complete, ◐ in progress, ✗ empty, — not applicable. The share icon means shareable in the Planner; a sparkle means AI can help plan it.", focus: { x: 195, y: 420, scale: 1.2 }, ring: PM.legend, duration: 7500 },
  { screen: "matrix", url: U_CAT("personal"), scroll: 280, caption: "One column per person", detail: "Names run up the side to fit - Sarah ★ is the account holder, then James, Mia and Leo.", focus: { x: 195, y: 600, scale: 1.12 }, ring: PM.names, duration: 6000 },
  { screen: "matrix", url: U_CAT("personal"), scroll: 280, caption: "Family folders, and what doesn't apply", detail: "Family Members is one list for the whole family. A dash means it doesn't apply - no marriage certificate for Mia or Leo.", focus: { x: 195, y: pRowY(R_FAMILY) + 120, scale: 1.08 }, ring: pFull({ x: 0, y: pRowY(R_FAMILY), w: 0, h: P_ROW_H }), duration: 7000 },
  { screen: "matrix", url: U_CAT("personal"), scroll: 600, caption: "Tap a square to open that person's folder", detail: "Mia's passport is still empty.", focus: { x: 250, y: pRowY(R_PASSPORT) + 54, scale: 1.4 }, ring: pCell(R_PASSPORT, MIA), click: mid(pCell(R_PASSPORT, MIA)), duration: 5500 },
  { screen: "mia", url: U_FOLDER(F_MIA_PASSPORT), scroll: pScrollTo(PL.miaPassport, PL.miaPassport.warn!.y - 300), caption: "Mia's passport: what's missing", detail: "All 11 starred fields are still empty, so the folder can't turn green yet. Save part of it and finish later.", focus: { x: 195, y: PL.miaPassport.warn!.y + 80, scale: 1.05 }, ring: PL.miaPassport.warn!, duration: 7000 },
  { screen: "mia", url: U_FOLDER(F_MIA_PASSPORT), scroll: pScrollTo(PL.miaPassport, PL.miaPassport.items[0].r.y - 60), caption: "The passport's real fields", detail: "Upload & scan the data page and AI fills them in - type, issuing country, document number, names and more.", focus: { x: 195, y: PL.miaPassport.items[2].r.y + 200, scale: 1.02 }, ring: pFieldsRing(PL.miaPassport, 0, 4), duration: 7500 },
  { screen: "miapick", url: U_FOLDER(F_MIA_PASSPORT), caption: "Switch person in one tap", detail: "James's and Sarah's are complete. Tap Sarah.", focus: { x: 160, y: 280, scale: 1.3 }, ring: pickRect(PL.miaPassport), click: { x: 120, y: pickRect(PL.miaPassport).y + 30 }, duration: 6000 },
  { screen: "sarahpass", url: U_FOLDER(F_SARAH_PASSPORT), scroll: pScrollTo(PL.sarahPassport, PL.sarahPassport.items[2].r.y - 120), caption: "Sarah's passport, filled in", detail: "Every starred field done and a scan attached. The expiry date becomes a reminder.", focus: { x: 195, y: PL.sarahPassport.items[5].r.y, scale: 1.02 }, ring: pFieldsRing(PL.sarahPassport, 2, 7), duration: 7500 },
  // Health
  pCatClick("health", "Open Health", "Medical advisers, medications, insurance, scripts, test results and plans."),
  pMatrixOpen("mhealth", "health", "health.health_insurance", SARAH, "Health: 21 folders", "From medical advisers to retirement plans. Tap Sarah's health insurance."),
  { screen: "healthins", url: U_FOLDER(F_HEALTH_INS), scroll: pScrollTo(PL.healthIns, PL.healthIns.card!.y - 40), caption: "One entry per policy", detail: "Policy document, provider, member number, level of cover, contact, dates, premium and notes.", focus: { x: 195, y: PL.healthIns.card!.y + 420, scale: 1.02 }, ring: pCard(PL.healthIns), duration: 8000 },
  // Education
  pCatClick("education", "Open Education", "Schools, reports, certificates, courses and study plans."),
  pMatrixOpen("medu", "education", "education.secondary_details", MIA, "Education: 12 folders", "A school folder and a reports folder for each level. Tap Mia's Secondary Education."),
  { screen: "secondary", url: U_FOLDER(F_SECONDARY), scroll: pScrollTo(PL.secondary, PL.secondary.card!.y - 40), caption: "Mia's high school", detail: "Enrolment document, school name and address, years, ATAR and subject results. Her reports link in below.", focus: { x: 195, y: PL.secondary.card!.y + 420, scale: 1.02 }, ring: pCard(PL.secondary), duration: 8000 },
  // Employment
  pCatClick("employment", "Open Employment", "Employee details, cover letters, resumes, contracts and pay summaries."),
  pMatrixOpen("memp", "employment", "employment.resume", SARAH, "Employment: 12 folders", "Cover Letter, Resume and Position Description have AI help. Tap Sarah's Resume."),
  { screen: "resume", url: U_FOLDER(F_RESUME), scroll: pScrollTo(PL.resume, PL.resume.coach!.y - 60), caption: "Sarah's résumé", detail: "Attach it or write it here - or tap \"Write my résumé with AI\". Archived on moves an old one to Past resumes.", focus: { x: 195, y: PL.resume.coach!.y + 360, scale: 1.02 }, ring: pad(span(PL.resume.coach!, PL.resume.items[3].r), 4), duration: 8000 },
  // Admin
  pCatClick("admin", "Open Admin & Bookkeeping", "Bank accounts, loans, budgets, super, tax, insurance and bills."),
  pMatrixOpen("madmin", "admin", "admin.loans", SARAH, "Admin & Bookkeeping: 23 folders", "Accounts and statements, loans, super, tax, insurance and household bills. Tap Sarah's Loans."),
  { screen: "loans", url: U_FOLDER(F_LOANS), scroll: pScrollTo(PL.loans, PL.loans.calc!.y + 100), caption: "A loan calculator at the top", detail: "$520,000 at 6.2% over 30 years is about $3,185 a month. One tap starts a new loan with those figures.", focus: { x: 195, y: PL.loans.calc!.y + 520, scale: 1.02 }, ring: pFull({ x: 0, y: PL.loans.calc!.y + 108, w: 0, h: PL.loans.calc!.h - 108 }), duration: 8000 },
  { screen: "loans", url: U_FOLDER(F_LOANS), scroll: pScrollTo(PL.loans, PL.loans.card!.y - 40), caption: "One entry per loan", detail: "Loan name (required), type, lender, account number, amount, dates, repayments and interest rate.", focus: { x: 195, y: PL.loans.card!.y + 420, scale: 1.02 }, ring: pCard(PL.loans), duration: 8000 },
  // The rest of the page
  { screen: "org", url: U_ORG, scroll: 1320, caption: "Your progress, and peace of mind", detail: "22 of 90 folders done, 14 in progress - tap it to see what to do next.", focus: { x: 195, y: 1660, scale: 1.08 }, ring: span(PO.stat(0), PO.stat(3)), click: mid(PO.stat(1)), duration: 6500 },
  { screen: "tasks", url: U_TASKS, caption: "Tasks: setup steps and your own list", detail: "Setup steps tick off as you go. Below them, your own to-dos with due dates.", focus: { x: 195, y: 500, scale: 1.02 }, ring: pFull({ x: 0, y: PT.setup.y, w: 0, h: Math.min(PT.setup.h, 600) }), duration: 7000 },
  { screen: "org", url: U_ORG, scroll: 1320, caption: "Secure & private", detail: "This one, and Always backed up, open Security & Privacy.", focus: { x: 195, y: PO.stat(2).y + 36, scale: 1.3 }, ring: PO.stat(2), click: mid(PO.stat(2)), duration: 5000 },
  { screen: "security", url: U_SECURITY, scroll: 120, caption: "How your information is protected", detail: "Encrypted in storage, only you and who you invite, backed up automatically, and you stay in control.", focus: { x: 195, y: 600, scale: 1.02 }, ring: pFull(span(PSEC.card(0), PSEC.card(2))), duration: 7500 },
  { screen: "orghidden", url: U_ORG, scroll: 1396, caption: "New here? And folders you've hidden", detail: "Getting Started Guide opens the Tasks list. Hidden suggestions brings back folders you snoozed or marked Not applicable.", focus: { x: 195, y: 2030, scale: 1.05 }, ring: span(PO.newTo, PO.hiddenOpen), click: { x: 195, y: 2020 }, duration: 7000 },
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
