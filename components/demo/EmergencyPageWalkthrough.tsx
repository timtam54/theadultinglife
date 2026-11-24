"use client"

// "In case of emergency" page walkthrough - /emergency's walkthrough button
// (the tour compass) and /demo. Hand-built copies of the real screens with a
// made-up family's sample data (the Taylors, Brisbane) - no sign-in, no API
// calls. Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column; icon-only PDF / Excel buttons)
// Copies: app/(app)/emergency/page.tsx (breadcrumb, red header, record count,
// one card per folder with records, "Still missing"), lib/services/emergency.ts
// (the 12 folders, their order and labels, record title = first answer, every
// answer shown as stored), components/PdfActions + EmailFileDialog,
// components/ExportExcelButton, app/api/export/emergency (one sheet per folder,
// "Family member" + every field), lib/services/doc-sources.ts + doc-pdf.tsx +
// pdf-brand.tsx (the "Emergency information" PDF), lib/file-client
// saveFileToDevice (iPhone share sheet), app/(app)/records/[category]/[subcategory]
// + PageForm (repeater entry, + Add another, Upload or scan a list) +
// FileFieldInput + ScanDemoButton + FolderNotes, and the folders' page_questions
// (labels, types, layout, hints - the live wording). The shell (sidebar,
// header) is copied from OrganiserWalkthrough; the round buttons are HelpButton
// and TourFab (the compass plays this walkthrough).
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
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

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) })
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
// Rough text wrapping: lines of `text` at `cw` px a character in `w` px.
const lines = (text: string, w: number, cw: number) => Math.max(1, Math.ceil((text.length * cw) / w))

// ── Icons (nav-items.tsx, layout.tsx, the emergency page, PdfActions) ────────

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
const NAV_EMERGENCY = 10
const NAV_ORGANISER = 2
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
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
// ExportExcelButton's Microsoft Excel icon (Simple Icons, CC0).
const ExcelIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="#1a7f37">
    <path d="M23.181 1.5H8.818A.818.818 0 0 0 8 2.318v3.273h15.181c.452 0 .819-.366.819-.819V2.318a.818.818 0 0 0-.819-.818zM8 22.5h15.181c.453 0 .819-.366.819-.818v-2.454a.818.818 0 0 0-.819-.819H8V22.5zM24 6.409H8v3.273h16V6.41zM8 14.591h16V11.318H8v3.273zM8 18.409h16v-3.273H8v3.273zM7.023 4.91L0 3.638v16.723l7.023-1.272V4.909z" />
    <path fill="#fff" d="M4.803 10.001l-1.398-.104-.883 2.234-.94-2.353-1.301-.088L1.9 12.5l-1.62 2.827 1.267-.093.87-2.365 1.007 2.263 1.408-.108-1.749-2.804 1.72-2.219z" />
  </svg>
)
const FolderGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const WarnTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2 3 20h18L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>
)

// The two round buttons, bottom right: HelpButton (?) at right-6, and TourFab
// (the compass, which plays this walkthrough) at right 1.5rem + 72px.
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
// EMERGENCY_SUBCATEGORIES in lib/services/emergency.ts: id, label, category,
// in that order. Each record is one entry in that folder for one person; its
// fields are the folder's page_questions labels in form order, with answers
// shown as they're stored (dates as yyyy-mm-dd, dropdowns as their value, e.g.
// "primary"). The title is the first answer. Advanced health directive, Power
// of attorney and Life insurance have nothing yet, so they're "Still missing".

type Cat = "personal" | "health" | "admin"
type Rec = { who: string; f: [string, string][] }
type Sec = { id: string; label: string; cat: Cat; recs: Rec[] }
const SECTIONS: Sec[] = [
  { id: "personal.emergency_contacts", label: "Emergency contacts", cat: "personal", recs: [
    { who: "Sarah Taylor", f: [["Full Name", "Emma Clarke"], ["Relationship", "Sister"], ["Priority", "primary"], ["Phone Number", "0423 555 274"], ["Email Address", "emma.clarke@example.com"], ["Address", "8 Wattle Close, Paddington QLD 4064"], ["Notes", "Has a spare house key. Best on her mobile after 3pm."]] },
    { who: "James Taylor", f: [["Full Name", "Sarah Taylor"], ["Relationship", "Wife"], ["Priority", "primary"], ["Phone Number", "0412 555 301"]] },
    { who: "Mia Taylor", f: [["Full Name", "James Taylor"], ["Relationship", "Dad"], ["Priority", "primary"], ["Phone Number", "0413 555 774"], ["Alternate Phone", "07 3555 0128"]] },
  ] },
  { id: "health.medical_advisers", label: "Doctors & medical advisers", cat: "health", recs: [
    { who: "Sarah Taylor", f: [["Business Name", "Northside Family Practice"], ["Contact Name", "Dr Priya Nair"], ["Speciality / Role", "GP"], ["Phone Number", "07 3555 0142"], ["Address", "Shop 4, 120 Kedron Park Rd, Wooloowin QLD 4030"]] },
    { who: "Leo Taylor", f: [["Business Name", "Kids First Paediatrics"], ["Contact Name", "Dr Alan Reid"], ["Speciality / Role", "Paediatrician"], ["Phone Number", "07 3555 0166"]] },
  ] },
  { id: "health.medication_list", label: "Current medications", cat: "health", recs: [
    { who: "Sarah Taylor", f: [["Medication name", "Ventolin inhaler"], ["Dosage", "100mcg"], ["Frequency", "2 puffs when needed"], ["Purpose / condition", "Asthma"], ["Prescribed by", "Dr Priya Nair"], ["Pharmacy", "Ashgrove Village Pharmacy"]] },
    { who: "Leo Taylor", f: [["Medication name", "EpiPen Jr"], ["Dosage", "150mcg"], ["Frequency", "In an emergency only"], ["Purpose / condition", "Peanut allergy (anaphylaxis)"], ["Prescribed by", "Dr Alan Reid"], ["Notes", "One in his school bag, one in the kitchen drawer."]] },
  ] },
  { id: "health.health_insurance_cards", label: "Medicare & health card", cat: "health", recs: [
    { who: "Sarah Taylor", f: [["Fund", "Brightside Health Fund"], ["Membership number", "BHF 4471 9023"], ["Cover type", "combined"], ["Medicare number", "2951 48203 1"], ["Medicare ref / position", "1"], ["Medicare expiry", "2028-04-30"]] },
  ] },
  { id: "health.health_insurance", label: "Health insurance", cat: "health", recs: [
    { who: "Sarah Taylor", f: [["Insurance Provider", "Brightside Health Fund"], ["Member Number", "BHF 4471 9023"], ["Level of Cover", "Gold Hospital + Top Extras"], ["Provider Contact", "1300 555 247"], ["Renewal Date", "2026-12-01"]] },
  ] },
  { id: "personal.licences_ids", label: "Licence & ID", cat: "personal", recs: [
    { who: "James Taylor", f: [["Card name / issuer", "Blue Card (QLD)"], ["Card / member number", "1182044/2"], ["Expiry date", "2028-02-14"]] },
  ] },
  { id: "personal.advanced_health_directive", label: "Advanced health directive", cat: "personal", recs: [] },
  { id: "personal.will_funeral", label: "Will & funeral instructions", cat: "personal", recs: [
    { who: "Sarah Taylor", f: [["Date Will Signed", "2022-08-18"], ["Location of Original Will", "Riverbend Legal, Paddington. A copy is in the home safe."], ["Executor 1 — Name", "James Taylor"], ["Solicitor / Firm", "Riverbend Legal, Paddington"], ["Executor 1 — Phone", "0413 555 774"]] },
  ] },
  { id: "personal.power_of_attorney", label: "Power of attorney", cat: "personal", recs: [] },
  { id: "health.life_insurance", label: "Life insurance", cat: "health", recs: [] },
  { id: "admin.home_insurance", label: "Home insurance", cat: "admin", recs: [
    { who: "Sarah Taylor", f: [["Insurer", "Jacaranda Mutual"], ["Policy number", "JMI-3302-7781"], ["Insured property address", "27 Jacaranda St, Ashgrove QLD 4060"], ["Renewal date", "2026-12-15"], ["Claims phone", "1300 555 909"]] },
  ] },
  { id: "admin.vehicle_insurance", label: "Vehicle insurance", cat: "admin", recs: [
    { who: "Sarah Taylor", f: [["Vehicle", "Toyota RAV4 · 512 TLR"], ["Provider", "Coastline Car Insurance"], ["Policy Number", "CCI-88213"], ["Cover Type", "comprehensive"], ["Renewal Date", "2027-03-03"]] },
  ] },
]
const FILLED = SECTIONS.filter((s) => s.recs.length > 0)
const MISSING = SECTIONS.filter((s) => s.recs.length === 0)
const TOTAL = SECTIONS.reduce((a, s) => a + s.recs.length, 0)
const COUNT_TEXT = `${TOTAL} records across 4 family members`
const TONE: Record<Cat, { chip: string; bar: string }> = {
  personal: { chip: "bg-violet-100 text-violet-800", bar: "bg-violet-500" },
  health: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  admin: { chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-600" },
}
const truncateForRow = (raw: string, max = 30) => (raw.length <= max ? raw : raw.slice(0, max - 1) + "…")
const SHARE_LABEL = "Emergency information (PDF), made by The Adulting Life"
const EMMA = "emma.clarke@example.com"
const SHARE_MSG = "Hi Em - everything for the kids and me, just in case. S x"

// ── Shell (copied from OrganiserWalkthrough) ─────────────────────────────────

const SB = 240 // sidebar width
const L = 272 // content left
const CW = 896 // content width
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const FAB_Y = 680
const FAB_R = 1176

function DShell({ children, h = 760, fabs = true, nav = NAV_EMERGENCY }: { children: ReactNode; h?: number; fabs?: boolean; nav?: number }) {
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
      <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm">
        <Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span>
      </Box>

      {children}

      {fabs && <Fabs y={FAB_Y} right={FAB_R} />}
    </div>
  )
}

const PW = 390
const PX = 8 // main px-2
const PCW = 374
const P_FAB_Y = 764
const P_FAB_R = 366
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }

const StatusBar = ({ dark }: { dark?: boolean }) => (
  <Box x={0} y={0} w={PW} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${dark ? "text-white" : "text-tal-plum-dark"}`}>
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

// ── The emergency page (app/(app)/emergency/page.tsx) ────────────────────────
// Every position is worked out here, so steps can ring and click exactly.

const CH_SM = 7.1
type RecLay = { r: Rect; rec: Rec }
type SecLay = { s: Sec; r: Rect; head: Rect; edit: Rect; labelLines: number; recs: RecLay[] }
type PageLay = {
  phone: boolean; h: number; crumb: Rect; crumbDash: Rect; hdr: Rect; icon: Rect; pill: Rect; dl: Rect; share: Rect; xl: Rect; title: Rect; count: Rect
  secs: SecLay[]; missing: Rect; chips: Rect[]
}
function recH(rec: Rec, phone: boolean) {
  if (!phone) return 16 + 24 + 6 + rec.f.length * 22 - 2 + 16
  const vw = PCW - 2 - 32
  const body = rec.f.reduce((a, [, v]) => a + 20 + lines(v, vw, CH_SM) * 20 + 4, 0) - 2
  return 16 + 24 + 6 + body + 16
}
function pageLayout(phone: boolean): PageLay {
  const x = phone ? PX : L, w = phone ? PCW : CW
  const crumb = { x, y: phone ? 120 : 80, w: 200, h: 20 }
  const crumbDash = { x, y: crumb.y, w: 76, h: 20 }
  const hdrY = phone ? 152 : 112
  const titleLines = phone ? 2 : 1
  const hdr = { x, y: hdrY, w, h: 12 + 36 + 8 + titleLines * 25 + 12 }
  const rowY = hdrY + 12
  const icon = { x: x + 20, y: rowY, w: 36, h: 36 }
  const gap = phone ? 8 : 12
  const pill = { x: icon.x + 36 + gap, y: rowY + 7, w: phone ? 152 : 160, h: 22 }
  const dl = { x: pill.x + pill.w + gap, y: rowY, w: phone ? 34 : 136, h: 36 }
  const share = { x: dl.x + dl.w + gap, y: rowY, w: phone ? 34 : 112, h: 36 }
  const xl = { x: share.x + share.w + gap, y: rowY + 2, w: phone ? 44 : 80, h: 32 }
  const title = { x: x + 20, y: rowY + 36 + 8, w: w - 40, h: titleLines * 25 }
  const count = { x, y: hdr.y + hdr.h + 12, w, h: 20 }
  let y = count.y + count.h + 24
  const secs: SecLay[] = []
  for (const s of FILLED) {
    // Header: on a phone a long folder name wraps beside the chip and Edit →
    const labelW = phone ? PCW - 2 - 40 - 32 - 24 - 40 - 36 : 9999
    const labelLines = lines(s.label, labelW, 9.6)
    const headH = 24 + Math.max(32, labelLines * 28) + 1
    const r0 = y
    const head = { x, y, w, h: headH }
    const edit = { x: x + w - 20 - 44, y: y + headH / 2 - 10, w: 44, h: 20 }
    y += headH
    const recs: RecLay[] = []
    s.recs.forEach((rec, n) => {
      const h = recH(rec, phone) + (n > 0 ? 1 : 0)
      recs.push({ r: { x, y, w, h }, rec })
      y += h
    })
    secs.push({ s, r: { x, y: r0, w, h: y - r0 + 1 }, head, edit, labelLines, recs })
    y += 1 + 24
  }
  // Still missing (mt-8)
  y += 8
  const innerW = w - 2 - 40
  const pText = "These folders have no records yet. Filling them makes this page more useful in an emergency."
  const chipsY0 = y + 20 + 28 + 4 + lines(pText, innerW, CH_SM) * 20 + 12
  const chips: Rect[] = []
  let cx = 0, cy = chipsY0
  for (const s of MISSING) {
    const cw = Math.round((s.label.length + 2) * 7.1 + 26)
    if (cx > 0 && cx + cw > innerW) { cx = 0; cy += 36 }
    chips.push({ x: x + 21 + cx, y: cy, w: cw, h: 28 })
    cx += cw + 8
  }
  const missing = { x, y, w, h: cy + 28 + 20 - y }
  y += missing.h
  return { phone, h: Math.max(phone ? 844 : 760, y + 40), crumb, crumbDash, hdr, icon, pill, dl, share, xl, title, count, secs, missing, chips }
}

const pdfBtn = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm text-tal-plum"
function EmergencyBody({ lay }: { lay: PageLay }) {
  const { phone } = lay
  return (
    <>
      <Box {...lay.crumb} className="flex items-center gap-2 text-sm">
        <span className="text-tal-plum-soft">Dashboard</span><span className="text-tal-plum-soft/50">/</span><span className="text-tal-plum-soft">Emergency</span>
      </Box>

      {/* The red header */}
      <Box {...lay.hdr} className="rounded-2xl bg-red-600 shadow-md" />
      <Box {...lay.icon} className="flex items-center justify-center rounded-lg bg-white/20 text-white"><WarnTriangle /></Box>
      <Box {...lay.pill} className="flex items-center justify-center whitespace-nowrap rounded-full bg-white/15 text-[10px] font-medium uppercase tracking-wider text-white">In case of emergency</Box>
      <Box {...lay.dl} className={pdfBtn}><PdfGlyph />{!phone && "Download PDF"}</Box>
      <Box {...lay.share} className={pdfBtn}><MailGlyph />{!phone && "Share PDF"}</Box>
      <Box {...lay.xl} className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/15 text-xs font-medium text-white"><ExcelIcon />{!phone && "Excel"}</Box>
      <Box {...lay.title} className="font-display text-xl leading-tight text-white">Everything a paramedic, hospital or trusted person might need</Box>

      <Box {...lay.count} className="text-sm text-tal-plum-soft">{COUNT_TEXT}</Box>

      {/* One card per folder that has records */}
      {lay.secs.map((sl) => {
        const tone = TONE[sl.s.cat]
        return (
          <div key={sl.s.id}>
            <Box {...sl.r} className="overflow-hidden rounded-2xl border border-tal-line bg-white shadow-sm" />
            <Box x={sl.head.x + 1} y={sl.head.y + 1} w={sl.head.w - 2} h={sl.head.h - 1} className="flex items-center gap-3 rounded-t-2xl border-b border-tal-line bg-tal-cream-soft/50 px-5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${tone.bar}`}><FolderGlyph /></span>
              <span className="min-w-0 font-display text-lg leading-7">{sl.s.label}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${tone.chip}`}>{sl.s.recs.length}</span>
              <span className="ml-auto shrink-0 text-xs text-tal-plum-soft">Edit →</span>
            </Box>
            {sl.recs.map((rl, n) => (
              <Box key={n} x={rl.r.x + 1} y={rl.r.y} w={rl.r.w - 2} h={rl.r.h} className={`px-4 py-4 ${n > 0 ? "border-t border-tal-line" : ""}`}>
                <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-3">
                  <div className="min-w-0 break-all font-medium leading-6 text-tal-plum">{truncateForRow(rl.rec.f[0][1], 40)}</div>
                  <div className="shrink-0 text-xs text-tal-plum-soft">{rl.rec.who}</div>
                </div>
                <div className={`grid gap-x-4 gap-y-0.5 text-sm leading-5 ${phone ? "grid-cols-1" : "grid-cols-[max-content_1fr]"}`}>
                  {rl.rec.f.map(([l, v]) => (
                    <div key={l} className="contents">
                      <span className="text-tal-plum-soft">{l}</span>
                      <span className="text-tal-plum">{v}</span>
                    </div>
                  ))}
                </div>
              </Box>
            ))}
          </div>
        )
      })}

      {/* Still missing */}
      <Box {...lay.missing} className="rounded-2xl border border-dashed border-tal-line bg-white p-5">
        <p className="mb-1 font-display text-lg leading-7">Still missing</p>
        <p className="mb-3 text-sm leading-5 text-tal-plum-soft">These folders have no records yet. Filling them makes this page more useful in an emergency.</p>
      </Box>
      {MISSING.map((s, n) => (
        <Box key={s.id} {...lay.chips[n]} className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-tal-line bg-tal-cream-soft text-sm text-tal-plum">{s.label} →</Box>
      ))}
    </>
  )
}

// ── Share PDF (EmailFileDialog) ──────────────────────────────────────────────

function EmailDialog({ r, phone, sent }: { r: Rect; phone: boolean; sent?: boolean }) {
  return (
    <>
      <Box x={0} y={0} w={phone ? PW : 1200} h={phone ? 844 : 760} className="bg-black/50" />
      <Box {...r} className="rounded-2xl bg-white p-5 text-left shadow-xl">
        <p className="font-display text-lg">Share by email</p>
        <p className="mt-1 truncate text-xs text-tal-plum-soft">{SHARE_LABEL}</p>
        {sent ? (
          <>
            <p className="mt-4 text-sm leading-5">Sent to <span className="font-medium">{EMMA}</span>. The document is attached.</p>
            <div className="mt-5 flex justify-end"><span className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">Done</span></div>
          </>
        ) : (
          <>
            <p className="mb-1 mt-4 text-sm">Recipient&apos;s email</p>
            <div className="flex h-11 items-center rounded-xl border border-tal-line px-3 text-sm ring-2 ring-tal-plum/30"><Typed text={EMMA} delay={900} speed={55} /></div>
            <p className="mb-1 mt-3 text-sm">Message <span className="text-tal-plum-soft">(optional)</span></p>
            <div className="h-[84px] rounded-xl border border-tal-line px-3 py-2 text-sm leading-5"><Typed text={SHARE_MSG} delay={2600} speed={35} /></div>
            <p className="mt-2 text-xs leading-4 text-tal-plum-soft">Sent from The Adulting Life with your name on it. Replies come to your email address.</p>
            <div className="mt-5 flex justify-end gap-2">
              <span className="inline-flex h-10 items-center rounded-xl border border-tal-line px-4 text-sm">Cancel</span>
              <span className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">Send</span>
            </div>
          </>
        )}
      </Box>
    </>
  )
}
const emailRect = (phone: boolean): Rect => (phone ? { x: 16, y: 230, w: 358, h: 408 } : { x: 376, y: 170, w: 448, h: 392 })
const emailSentRect = (phone: boolean): Rect => (phone ? { x: 16, y: 300, w: 358, h: 200 } : { x: 376, y: 270, w: 448, h: 184 })
const sendBtn = (phone: boolean): Rect => { const r = emailRect(phone); return { x: r.x + r.w - 20 - 68, y: r.y + r.h - 20 - 40, w: 68, h: 40 } }
const doneBtn = (phone: boolean): Rect => { const r = emailSentRect(phone); return { x: r.x + r.w - 20 - 68, y: r.y + r.h - 20 - 40, w: 68, h: 40 } }

// ── The PDF ("Emergency information.pdf", doc-sources kind "emergency") ──────
// pdf-brand: grey frame, the coral accent strip, the logo, title + subtitle,
// then a table per folder - the folder name on the accent colour, each record
// as "Person — title" and its other answers as label / value rows.

const PDF_ACCENT = "#f27678"
function PdfTable({ s, max }: { s: Sec; max?: number }) {
  return (
    <div className="mb-3 border-t border-[#a6a6a6] text-[9px] leading-[13px] text-[#3a3a3a]">
      <div className="border-b border-l border-r border-[#a6a6a6] px-1.5 py-0.5 font-display text-[10.5px] font-semibold" style={{ background: PDF_ACCENT }}>{s.label}</div>
      {s.recs.slice(0, max ?? s.recs.length).map((rec, n) => (
        <div key={n}>
          <div className="flex border-b border-l border-[#a6a6a6]">
            <div className="w-[35%] border-r border-[#a6a6a6] bg-white px-1 py-0.5 font-semibold underline">{rec.who} — {rec.f[0][1]}</div>
            <div className="w-[65%] border-r border-[#a6a6a6] bg-[#dde3fb]" />
          </div>
          {rec.f.slice(1).map(([l, v]) => (
            <div key={l} className="flex border-b border-l border-[#a6a6a6]">
              <div className="w-[35%] border-r border-[#a6a6a6] bg-[#f2f2f2] px-1 py-0.5">{l}:</div>
              <div className="w-[65%] border-r border-[#a6a6a6] bg-[#dde3fb] px-1 py-0.5">{v}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
function PdfSheet({ phone }: { phone: boolean }) {
  return (
    <div className="relative h-full overflow-hidden bg-white px-8 pt-8 font-sans">
      <div className="absolute inset-[10px] border-[3px] border-[#8c8c8c]" />
      <div className="absolute left-[13px] right-[13px] top-[13px] h-[5px]" style={{ background: PDF_ACCENT }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Logo.png" alt="" className="mx-auto mb-2 w-28" />
      <p className="font-display text-[13px] font-semibold text-[#3a3a3a]">Emergency information</p>
      <p className="mb-3 text-[9px] font-semibold text-[#3a3a3a]">Contacts, medications, insurance and important documents · Completed 23 Nov 2026</p>
      <PdfTable s={SECTIONS[0]} />
      <PdfTable s={SECTIONS[1]} max={phone ? 1 : 2} />
      {!phone && <PdfTable s={SECTIONS[2]} max={1} />}
      <div className="absolute bottom-4 left-8 right-8 flex justify-between border-t border-[#a6a6a6] pt-1 text-[7.5px] text-[#777]">
        <span>The Adulting Life · UNOFFICIAL RECORD – For personal reference only. Not a government-issued document.</span><span className="shrink-0 pl-2">Page 1 of 3</span>
      </div>
    </div>
  )
}
const PDF_SHEET: Rect = { x: 330, y: 52, w: 540, h: 760 }
function DPdfViewer() {
  return (
    <div className="absolute inset-0 bg-[#525659] font-sans" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={40} className="flex items-center gap-4 bg-[#323639] px-5 text-sm text-white">
        <span>Emergency information.pdf</span><span className="ml-auto text-white/70">1 / 3</span>
      </Box>
      <Box {...PDF_SHEET} className="shadow-2xl"><PdfSheet phone={false} /></Box>
    </div>
  )
}
const P_PDF_SHEET: Rect = { x: 12, y: 104, w: 366, h: 720 }
function PPdfViewer() {
  return (
    <div className="absolute inset-0 bg-[#525659] font-sans" style={{ height: 844 }}>
      <StatusBar dark />
      <Box x={0} y={44} w={390} h={48} className="flex items-center justify-between bg-[#323639] px-4 text-sm text-white"><span className="text-sky-300">Done</span><span className="truncate px-3">Emergency information.pdf</span><span className="text-sky-300">⇪</span></Box>
      <Box {...P_PDF_SHEET} className="shadow-2xl"><PdfSheet phone /></Box>
    </div>
  )
}
// iPhone: Download PDF opens the system share sheet (saveFileToDevice).
const P_SHEET_SAVE: Rect = { x: 16, y: 640, w: 358, h: 52 }
function PShareSheet({ lay }: { lay: PageLay }) {
  return (
    <>
      <PPage h={lay.h}><EmergencyBody lay={lay} /></PPage>
      <Box x={0} y={0} w={PW} h={844} className="bg-black/40" />
      <Box x={0} y={300} w={PW} h={544} className="rounded-t-3xl bg-[#f2f2f7] font-sans" />
      <Box x={16} y={316} w={358} h={64} className="flex items-center gap-3 rounded-2xl bg-white px-3">
        <span className="flex h-11 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-red-600"><PdfGlyph /></span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900">Emergency information.pdf</span><span className="block text-xs text-gray-500">PDF Document · 184 KB</span></span>
      </Box>
      <Box x={16} y={396} w={358} h={96} className="flex items-start justify-around pt-2 text-[11px] text-gray-700">
        {[["AirDrop", "bg-sky-500"], ["Messages", "bg-green-500"], ["Mail", "bg-blue-500"], ["Notes", "bg-yellow-400"]].map(([t, c]) => (
          <span key={t} className="flex flex-col items-center gap-1.5"><span className={`h-14 w-14 rounded-2xl ${c}`} />{t}</span>
        ))}
      </Box>
      <Box x={16} y={508} w={358} h={52} className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white px-4 text-[15px] text-gray-900"><span>Copy</span><span className="text-gray-400">⧉</span></Box>
      <Box x={16} y={560} w={358} h={80} className="flex flex-col justify-center gap-0 bg-white px-4 text-[15px] text-gray-900">
        <span className="flex h-10 items-center justify-between border-b border-gray-200"><span>Print</span><span className="text-gray-400">⎙</span></span>
        <span className="flex h-10 items-center justify-between"><span>Markup</span><span className="text-gray-400">✎</span></span>
      </Box>
      <Box {...P_SHEET_SAVE} className="flex items-center justify-between rounded-b-2xl border-t border-gray-200 bg-white px-4 text-[15px] text-gray-900"><span>Save to Files</span><span className="text-gray-400">▭</span></Box>
    </>
  )
}

// ── Excel (app/api/export/emergency: emergency.xlsx) ─────────────────────────
// One sheet per folder that has records (empty folders are skipped), each with
// the heading, the export date, a blank row, then "Family member" + every field.

function xlColumns(s: Sec) {
  const labels: string[] = []
  for (const r of s.recs) for (const [l] of r.f) if (!labels.includes(l)) labels.push(l)
  return labels
}
function Spreadsheet({ s, phone }: { s: Sec; phone: boolean }) {
  const cols = ["Family member", ...xlColumns(s)]
  const colW = phone ? 132 : 150
  const shown = phone ? cols.slice(0, 3) : cols.slice(0, 6)
  const letters = "ABCDEFGHIJ"
  const rows: (string[] | "blank" | { head: string })[] = [
    { head: "Emergency information — The Adulting Life" },
    { head: "Exported 23 Nov 2026" },
    "blank",
    cols,
    ...s.recs.map((r) => cols.map((c, n) => (n === 0 ? r.who : r.f.find(([l]) => l === c)?.[1] ?? ""))),
  ]
  return (
    <div className="text-[12px] text-gray-900">
      <div className="flex border-b border-gray-300 bg-gray-100 text-[11px] text-gray-500">
        <div className="w-8 shrink-0 border-r border-gray-300" />
        {shown.map((_, n) => <div key={n} className="shrink-0 border-r border-gray-300 py-0.5 text-center" style={{ width: colW }}>{letters[n]}</div>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className={`flex border-b border-gray-200 ${ri === 3 ? "border-b-2 border-b-gray-400" : ""}`} style={{ height: 26 }}>
          <div className="flex w-8 shrink-0 items-center justify-center border-r border-gray-300 bg-gray-100 text-[11px] text-gray-500">{ri + 1}</div>
          {row === "blank" ? <div className="flex-1" />
            : "head" in row ? <div className="flex items-center whitespace-nowrap px-1.5 text-[14px] font-bold">{row.head}</div>
            : shown.map((_, ci) => (
              <div key={ci} className={`flex shrink-0 items-center overflow-hidden whitespace-nowrap border-r border-gray-200 px-1.5 ${ri === 3 ? "font-bold" : ""}`} style={{ width: colW }}>{row[ci]}</div>
            ))}
        </div>
      ))}
    </div>
  )
}
const XL_TABS = FILLED.map((s) => s.label.slice(0, 31))
function DExcel() {
  return (
    <div className="absolute inset-0 bg-white font-sans" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={44} className="flex items-center gap-3 bg-[#1a7f37] px-4 text-sm text-white"><span className="flex h-6 w-6 items-center justify-center rounded bg-white"><ExcelIcon size={16} /></span><span className="font-medium">emergency.xlsx</span><span className="text-white/70">· Saved to Downloads</span></Box>
      <Box x={0} y={44} w={1200} h={34} className="flex items-center gap-5 border-b border-gray-200 bg-[#f3f3f3] px-4 text-[12px] text-gray-700">{["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View"].map((t) => <span key={t} className={t === "Home" ? "border-b-2 border-[#1a7f37] pb-1 font-medium text-[#1a7f37]" : ""}>{t}</span>)}</Box>
      <Box x={0} y={78} w={1200} h={28} className="flex items-center border-b border-gray-300 text-[12px] text-gray-500"><span className="w-12 border-r border-gray-300 px-2">A4</span><span className="px-3 italic">fx</span><span className="text-gray-900">Family member</span></Box>
      <Box x={0} y={106} w={1200} h={560} className="overflow-hidden"><Spreadsheet s={SECTIONS[0]} phone={false} /></Box>
      <Box x={0} y={720} w={1200} h={40} className="flex items-end gap-0.5 border-t border-gray-300 bg-[#f3f3f3] px-4 text-[12px]">
        {XL_TABS.map((t, n) => <span key={t} className={`whitespace-nowrap rounded-t px-3 py-2 ${n === 0 ? "bg-white font-semibold text-[#1a7f37] shadow-sm" : "text-gray-600"}`}>{t}</span>)}
      </Box>
    </div>
  )
}
const XL_GRID: Rect = { x: 0, y: 106, w: 940, h: 26 * 8 + 20 }
const XL_TABS_R: Rect = { x: 0, y: 720, w: 1200, h: 40 }
function PExcel() {
  return (
    <div className="absolute inset-0 bg-white font-sans" style={{ height: 844 }}>
      <StatusBar />
      <Box x={0} y={44} w={390} h={48} className="flex items-center justify-between border-b border-gray-200 px-4 text-sm"><span className="text-[#1a7f37]">Done</span><span className="font-medium">emergency.xlsx</span><span className="text-[#1a7f37]">⇪</span></Box>
      <Box x={0} y={92} w={390} h={600} className="overflow-hidden"><Spreadsheet s={SECTIONS[0]} phone /></Box>
      <Box x={0} y={780} w={390} h={64} className="flex items-start gap-0.5 overflow-hidden border-t border-gray-300 bg-[#f3f3f3] px-2 pt-2 text-[12px]">
        {XL_TABS.slice(0, 3).map((t, n) => <span key={t} className={`whitespace-nowrap rounded px-2.5 py-1.5 ${n === 0 ? "bg-white font-semibold text-[#1a7f37] shadow-sm" : "text-gray-600"}`}>{t}</span>)}
        <span className="px-1.5 py-1.5 text-gray-400">…</span>
      </Box>
    </div>
  )
}
const P_XL_GRID: Rect = { x: 0, y: 92, w: 390, h: 26 * 8 + 20 }
const P_XL_TABS: Rect = { x: 0, y: 780, w: 390, h: 64 }

// ── A folder's page (records/[category]/[subcategory] + PageForm) ────────────
// Copied from OrganiserWalkthrough's folder page: the folder's real
// page_questions (label, type, col_start / col_span / row_order, required,
// hint, placeholder) laid out like PageForm's 12-column grid (every field full
// width on a phone). Both folders here are repeatable (one entry each).

type Cell = "done" | "started" | "empty"
type FT = "text" | "textarea" | "date" | "dropdown" | "file" | "address"
type FF = { l: string; t: FT; r: number; c?: number; s?: number; req?: boolean; hint?: string; ph?: string; v?: string; demo?: boolean }
type FolderSpec = {
  id: string; name: string; hint?: string; desc?: string; note: string
  share?: boolean; listImport?: boolean; status: Cell[]
  fields: FF[]
}
const PEOPLE = [
  { n: "Sarah Taylor", k: "adult · primary" }, { n: "James Taylor", k: "adult" }, { n: "Mia Taylor", k: "child" }, { n: "Leo Taylor", k: "child" },
]
const F_EC: FolderSpec = {
  id: "personal.emergency_contacts", name: "Emergency Contacts",
  hint: "The people to call in an emergency — start with your top one or two.",
  desc: "The people who need to know first if something happens — your named next-of-kin and immediate emergency contacts. For every family member. Fill it in so anyone opening your organiser in a crisis can call the right people straight away.",
  note: "Add a private note for your family — reminders, where the physical document lives, who to call.",
  status: ["done", "done", "done", "empty"],
  fields: [
    { l: "Full Name", t: "text", r: 1, req: true, v: "Emma Clarke" },
    { l: "Relationship", t: "text", r: 2, s: 6, hint: "e.g. spouse, parent, sibling, friend", v: "Sister" },
    { l: "Priority", t: "dropdown", r: 2, c: 7, s: 6, v: "Primary" },
    { l: "Phone Number", t: "text", r: 3, s: 6, req: true, v: "0423 555 274" },
    { l: "Alternate Phone", t: "text", r: 3, c: 7, s: 6 },
    { l: "Email Address", t: "text", r: 4, v: EMMA },
    { l: "Address", t: "address", r: 5, v: "8 Wattle Close, Paddington QLD 4064" },
    { l: "Notes", t: "textarea", r: 6, hint: "Anything a paramedic or hospital should know — best time to call, spoken languages, etc.", v: "Has a spare house key. Best on her mobile after 3pm." },
  ],
}
const F_POA: FolderSpec = {
  id: "personal.power_of_attorney", name: "Power of Attorney Details", share: true, listImport: true,
  note: "Choose to keep a scanned copy of your Power of Attorney, extract the relevant information to complete the fields below, or both.",
  status: ["empty", "empty", "empty", "empty"],
  fields: [
    { l: "Power of Attorney document", t: "file", r: 0, hint: "Attach a scan or photo of the executed POA.", demo: true },
    { l: "Business Name", t: "text", r: 1, hint: "Only if the attorney is a firm or trustee company (e.g. a law firm). Leave blank for family and friends." },
    { l: "Contact Name", t: "text", r: 2, hint: "The attorney's full name." },
    { l: "Relationship to you", t: "text", r: 3, s: 6, ph: "e.g. Son, Daughter, Partner, Solicitor" },
    { l: "Type of Power of Attorney", t: "dropdown", r: 3, c: 7, s: 6, hint: "Enduring keeps working if you lose capacity; General doesn't." },
    { l: "Phone Number", t: "text", r: 4, s: 6 },
    { l: "Email Address", t: "text", r: 4, c: 7, s: 6 },
    { l: "Address", t: "address", r: 5 },
    { l: "Mailing Address", t: "address", r: 6 },
    { l: "Where the original is kept", t: "textarea", r: 7, hint: "e.g. \"With Smith & Co Lawyers, Brisbane\" or \"Fire safe, home office\"." },
  ],
}
const thumbOf = (id: string) => `/thumbnails/subcategories/${id}.png`

const CH_LABEL = 7.6, CH_XS = 6.1
function ctrlH(f: FF, w: number, phone: boolean) {
  if (f.t === "textarea") {
    const n = f.v ? f.v.split("\n").reduce((a, ln) => a + lines(ln || " ", w - 26, CH_SM), 0) : 3
    return Math.max(84, n * 20 + 26)
  }
  if (f.t === "file") return f.v ? (phone ? 84 : 50) : phone && f.demo ? 100 : 44
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
  h: number; picker: Rect; head: Rect; titleH: number; desc?: Rect; notes: Rect; top: Rect
  card: Rect; items: Placed[]; form: Rect; save: Rect; add: Rect; list?: Rect; how?: Rect
}
function folderLayout(sp: FolderSpec, phone: boolean): FolderLayout {
  const x = phone ? PX : L, w = phone ? PCW : CW, iw = w - 44 - 32
  const picker = phone ? { x: PX, y: 142, w: 150, h: 34 } : { x: L + 268 + Math.round("Personal".length * 7.4), y: 72, w: 150, h: 34 }
  const titleH = phone ? Math.max(48, lines(sp.name, PCW - 24 - 64, 10.5) * 25 + (sp.hint ? lines(sp.hint, PCW - 24 - 64, 6.1) * 16 : 0)) : 48
  const head = phone ? { x: PX, y: 188, w: PCW, h: 12 + titleH + 12 + 36 + 12 } : { x: L, y: 116, w: CW, h: 72 }
  let y = head.y + head.h + 24
  const out: Partial<FolderLayout> = { picker, head, titleH }
  if (sp.desc) { const h = 32 + lines(sp.desc, iw, CH_SM) * 23; out.desc = { x, y, w, h }; y += h + 24 }
  const nh = 20 + 28 + 8 + lines(sp.note, w - 40, CH_SM) * 20 + 20
  out.notes = { x, y, w, h: nh }; y += nh + 24
  out.top = { x, y, w, h: 36 }; y += 36 + 24
  const card = { x, y, w, h: 0 }
  const fx = x + 16, fw = w - 32
  y += 16 + 36 + 12
  const { items, bottom } = layoutFields(sp.fields, fx, fw, y, phone)
  out.items = items
  out.form = { x: fx, y, w: fw, h: bottom - y }
  y = bottom
  out.save = { x: fx, y: y + 16, w: 80, h: 40 }; y += 16 + 40 + 16
  out.card = { ...card, h: y - card.y }
  y += 24
  out.add = { x, y, w: 132, h: 40 }
  if (sp.listImport) {
    out.list = { x: x + 144, y, w: 184, h: 40 }
    out.how = phone ? { x, y: y + 52, w: 176, h: 40 } : { x: x + 340, y, w: 176, h: 40 }
    y += phone ? 52 + 40 : 40
  } else y += 40
  out.h = Math.max(phone ? 844 : 760, y + 48)
  return out as FolderLayout
}

function PdfBtns({ phone }: { phone?: boolean }) {
  const b = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  return (
    <>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><PdfGlyph />{!phone && "Download PDF"}</span>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><MailGlyph />{!phone && "Share PDF"}</span>
    </>
  )
}
// ShareButton (person + plus) - a green dot once someone is nominated.
const PersonPlus = ({ shared }: { shared?: boolean }) => (
  <span className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border ${shared ? "border-emerald-500 bg-emerald-50" : "border-tal-line bg-white"}`}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
    {shared && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
  </span>
)
const ExcelBtn = ({ phone }: { phone?: boolean }) => (
  <span className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-medium text-tal-plum">
    <ExcelIcon size={18} />{!phone && "Export to Excel"}
  </span>
)
const HowBtn = () => (
  <span className="inline-flex h-full w-full items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white px-3 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</span>
)
function Control({ f, h }: { f: FF; h: number }) {
  const box = "flex h-11 items-center rounded-xl border border-tal-line bg-white px-3 text-sm"
  const ph = <span className="truncate text-tal-plum-soft/50">{f.ph ?? ""}</span>
  if (f.t === "textarea") return <div className="whitespace-pre-line rounded-xl border border-tal-line bg-white p-3 text-sm leading-5" style={{ height: h }}>{f.v}</div>
  if (f.t === "file") {
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
      <Control f={f} h={ctrlH(f, r.w, !!phone)} />
      {f.hint && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
    </Box>
  )
}
// UserPicker's list, with each person's status in this folder.
const pickRect = (lay: FolderLayout): Rect => ({ x: lay.picker.x, y: lay.picker.y + lay.picker.h + 6, w: 256, h: 4 * 52 + 8 })
function PickerList({ sp, r }: { sp: FolderSpec; r: Rect }) {
  return (
    <Box {...r} className="overflow-hidden rounded-xl border border-tal-line bg-white py-1 shadow-lg">
      {PEOPLE.map((u, i) => {
        const s = sp.status[i]
        const active = i === 0
        return (
          <div key={u.n} className={`flex h-[52px] items-center justify-between px-3 text-sm ${active ? "bg-tal-cream-soft" : s === "done" ? "bg-emerald-50" : s === "started" ? "bg-amber-50" : ""}`}>
            <div><p className="font-medium">{u.n}</p><p className="text-xs text-tal-plum-soft">{u.k}{s === "done" ? " · Complete" : s === "started" ? " · Started" : ""}</p></div>{active && <span>✓</span>}
          </div>
        )
      })}
    </Box>
  )
}
function FolderBody({ sp, lay, phone, picker }: { sp: FolderSpec; lay: FolderLayout; phone?: boolean; picker?: boolean }) {
  const x = phone ? PX : L, w = phone ? PCW : CW
  return (
    <>
      {/* Breadcrumb + UserPicker (Sarah - the folder opens on your own) */}
      <Box x={x} y={phone ? 116 : 78} w={phone ? PCW : lay.picker.x - L} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span><span className="opacity-50">·</span></Box>
      <Box {...lay.picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">Sarah Taylor</span><span className="text-xs">▾</span>
      </Box>
      <Box x={lay.picker.x + lay.picker.w + 10} y={lay.picker.y + 8} w={170} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>

      {/* Header */}
      <Box {...lay.head} className="rounded-2xl bg-black shadow-md" />
      <Img src={thumbOf(sp.id)} x={x + (phone ? 12 : 20)} y={lay.head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={x + (phone ? 76 : 84)} y={lay.head.y + 12} w={phone ? PCW - 88 : 600} h={lay.titleH} className="flex flex-col justify-center text-white">
        <p className="font-display leading-tight" style={{ fontSize: phone ? 20 : 24 }}>{sp.name}</p>
        {sp.hint && <p className={`mt-0.5 text-xs text-white/70 ${phone ? "" : "truncate"}`}>{sp.hint}</p>}
      </Box>
      <Box x={phone ? x + 12 : x + w - 170} y={phone ? lay.head.y + 12 + lay.titleH + 12 : lay.head.y + 18} w={150} h={36} className="flex"><ExcelBtn /></Box>

      {sp.desc && lay.desc && (
        <Box {...lay.desc} className="flex items-start gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 text-sm leading-relaxed">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>{sp.desc}
        </Box>
      )}

      {/* FolderNotes */}
      <Box {...lay.notes} className="rounded-2xl border border-tal-line bg-amber-50/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" /></svg></span><span className="font-display text-lg">Notes</span></span>
          <span className="text-xs text-tal-plum-soft underline">Add note</span>
        </div>
        <p className="text-sm leading-5 text-tal-plum-soft">{sp.note}</p>
      </Box>

      {/* PageForm: the folder's PDF pair, then the entry card */}
      <Box {...lay.top} className="flex items-center justify-end gap-2"><PdfBtns phone={phone} /></Box>
      <Box {...lay.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={lay.card.x + 16} y={lay.card.y + 16} w={lay.card.w - 32} h={36} className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span>
        <span className="flex shrink-0 items-center gap-2">
          {sp.share && <PersonPlus />}
          {!phone && <PdfBtns />}
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span>
        </span>
      </Box>
      {lay.items.map((p) => <FieldView key={p.f.l} p={p} phone={phone} />)}
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      <Box {...lay.add} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
      {lay.list && <Box {...lay.list} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">Upload or scan a list</Box>}
      {lay.how && <Box {...lay.how}><HowBtn /></Box>}
      {picker && <PickerList sp={sp} r={pickRect(lay)} />}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPUTER (1200 x 760)
// ═════════════════════════════════════════════════════════════════════════════

const BASE = "app.theadultinglife.com.au"
const U_EM = `${BASE}/emergency`
const U_FOLDER = (id: string) => `${BASE}/records/personal/${id}`

const DP = pageLayout(false)
const DF_EC = folderLayout(F_EC, false)
const DF_POA = folderLayout(F_POA, false)
const secOf = (lay: PageLay, id: string) => lay.secs.find((s) => s.s.id === id)!
const chipOf = (lay: PageLay, id: string) => lay.chips[MISSING.findIndex((s) => s.id === id)]
const dScroll = (y: number) => clamp(y, 0, DP.h - 760)

const DEm = ({ children }: { children?: ReactNode }) => (
  <DShell h={DP.h}><EmergencyBody lay={DP} />{children}</DShell>
)
const DFolder = ({ sp, lay, picker }: { sp: FolderSpec; lay: FolderLayout; picker?: boolean }) => (
  <DShell h={lay.h} fabs={false} nav={NAV_ORGANISER}><FolderBody sp={sp} lay={lay} picker={picker} /></DShell>
)

const D_SCREENS: Record<string, ReactNode> = {
  page: <DEm />,
  pdf: <DPdfViewer />,
  email: <DEm><EmailDialog r={emailRect(false)} phone={false} /></DEm>,
  sent: <DEm><EmailDialog r={emailSentRect(false)} phone={false} sent /></DEm>,
  excel: <DExcel />,
  ec: <DFolder sp={F_EC} lay={DF_EC} />,
  ecpick: <DFolder sp={F_EC} lay={DF_EC} picker />,
  poa: <DFolder sp={F_POA} lay={DF_POA} />,
}

function dSecStep(id: string, caption: string, detail: string, opts: Partial<WalkStep> = {}): WalkStep {
  const sl = secOf(DP, id)
  const scroll = dScroll(sl.r.y - 90)
  return { screen: "page", url: U_EM, scroll, caption, detail, focus: { x: 720, y: sl.r.y + Math.min(sl.r.h, 600) / 2, scale: sl.r.h > 560 ? 1.05 : 1.15 }, ring: pad(sl.r, 4), duration: 7000, ...opts }
}
const D_EC = secOf(DP, "personal.emergency_contacts")
const D_MED = secOf(DP, "health.medication_list")
const D_INS1 = secOf(DP, "health.health_insurance_cards")
const D_INS2 = secOf(DP, "health.health_insurance")
const D_HOME = secOf(DP, "admin.home_insurance")
const D_VEH = secOf(DP, "admin.vehicle_insurance")
const D_POA_CHIP = chipOf(DP, "personal.power_of_attorney")
const D_BOTTOM = dScroll(DP.h)
const dFieldsRing = (lay: FolderLayout, from: number, to: number) => {
  const a = lay.items[from].r, b = lay.items[Math.min(to, lay.items.length - 1)].r
  return pad({ x: lay.form.x, y: a.y, w: lay.form.w, h: b.y + b.h - a.y }, 6)
}

const D_STEPS: WalkStep[] = [
  { screen: "page", url: U_EM, caption: "In case of emergency", detail: "One page with everything a paramedic, hospital or trusted person might need - for the whole family. It's built from what you've already put in your folders.", focus: { x: 720, y: 300, scale: 1.05 }, ring: pad(span(DP.crumb, DP.count), 6), duration: 7000 },
  { screen: "page", url: U_EM, caption: "Open it from the sidebar", detail: "Emergency is in the menu on every page.", focus: { x: 300, y: navY(NAV_EMERGENCY) + 18, scale: 1.6 }, ring: { x: 12, y: navY(NAV_EMERGENCY), w: 216, h: 37 }, click: { x: 100, y: navY(NAV_EMERGENCY) + 18 }, duration: 5000 },
  { screen: "page", url: U_EM, caption: "Dashboard / Emergency", detail: "The breadcrumb - Dashboard takes you back to the dashboard.", focus: { x: 520, y: 160, scale: 1.7 }, ring: pad(DP.crumb), duration: 5000 },
  { screen: "page", url: U_EM, caption: "The red header", detail: "\"Everything a paramedic, hospital or trusted person might need\" - with buttons to download, share or export it all.", focus: { x: 720, y: DP.hdr.y + 60, scale: 1.25 }, ring: pad(DP.hdr), duration: 6500 },
  { screen: "page", url: U_EM, caption: `${COUNT_TEXT}`, detail: "How much is on the page, and for how many people. Sarah, James, Mia and Leo all count, even if a folder only has an entry for some of them.", focus: { x: 520, y: DP.count.y, scale: 1.7 }, ring: pad({ ...DP.count, w: 320 }), duration: 6000 },
  // Download PDF
  { screen: "page", url: U_EM, caption: "Download PDF", detail: "Makes one branded PDF of the whole page and saves it to your computer.", focus: { x: DP.dl.x + 120, y: DP.dl.y + 30, scale: 1.8 }, ring: pad(DP.dl), click: mid(DP.dl), duration: 5000 },
  { screen: "pdf", url: U_EM, caption: "Emergency information.pdf", detail: "Contacts, medications, insurance and important documents - with the date it was made. Print it for the fridge, the glovebox or the grandparents.", focus: { x: 600, y: 300, scale: 1.15 }, ring: { x: PDF_SHEET.x, y: PDF_SHEET.y, w: PDF_SHEET.w, h: 690 }, duration: 7000 },
  { screen: "pdf", url: U_EM, caption: "One table per folder", detail: "Each entry is headed with the person and its title - \"Sarah Taylor — Emma Clarke\" - then every answer below it.", focus: { x: 600, y: 300, scale: 1.7 }, ring: { x: PDF_SHEET.x + 28, y: 170, w: PDF_SHEET.w - 56, h: 240 }, duration: 7000 },
  // Share PDF
  { screen: "page", url: U_EM, caption: "Share PDF", detail: "Emails the same PDF to someone - a partner, a sister, a carer.", focus: { x: DP.share.x + 60, y: DP.share.y + 30, scale: 1.8 }, ring: pad(DP.share), click: mid(DP.share), duration: 5000 },
  { screen: "email", url: U_EM, caption: "Share by email", detail: "Type their email and, if you like, a message. It's sent from The Adulting Life with your name on it, and replies come to you.", focus: { x: 600, y: 370, scale: 1.3 }, ring: pad(emailRect(false), 2), click: mid(sendBtn(false)), duration: 8000 },
  { screen: "sent", url: U_EM, caption: "Sent to Emma", detail: "The PDF is attached. A file too big to attach goes as a private link that works for 7 days.", focus: { x: 600, y: 360, scale: 1.5 }, ring: pad(emailSentRect(false), 2), click: mid(doneBtn(false)), duration: 6000 },
  // Excel
  { screen: "page", url: U_EM, caption: "Excel", detail: "Downloads it all as a spreadsheet instead.", focus: { x: DP.xl.x + 20, y: DP.xl.y + 30, scale: 1.8 }, ring: pad(DP.xl), click: mid(DP.xl), duration: 5000 },
  { screen: "excel", url: U_EM, caption: "emergency.xlsx", detail: "A heading and the export date, then one row per entry: Family member, then a column for every field.", focus: { x: 470, y: 220, scale: 1.25 }, ring: XL_GRID, duration: 7000 },
  { screen: "excel", url: U_EM, caption: "A sheet for every folder", detail: "Emergency contacts, Doctors & medical advisers, Current medications and so on. Empty folders are left out.", focus: { x: 600, y: 700, scale: 1.3 }, ring: XL_TABS_R, duration: 6500 },
  // The sections
  dSecStep("personal.emergency_contacts", "Emergency contacts", "Every family member's contacts, in one card. The number shows how many entries; the colour shows the section - violet is Personal.", { focus: { x: 720, y: D_EC.r.y + 120, scale: 1.25 }, ring: pad(D_EC.head, 4) }),
  { screen: "page", url: U_EM, scroll: dScroll(D_EC.r.y - 90), caption: "Whose entry it is", detail: "Each entry shows whose it is on the right - Sarah's emergency contact is her sister Emma Clarke - and every answer from the form.", focus: { x: 720, y: D_EC.recs[0].r.y + 90, scale: 1.3 }, ring: pad(D_EC.recs[0].r, 2), duration: 7500 },
  { screen: "page", url: U_EM, scroll: dScroll(D_EC.r.y - 90), caption: "Everyone's on the one page", detail: "James's contact is Sarah, and Mia's is her dad. Leo hasn't got one yet.", focus: { x: 720, y: D_EC.recs[1].r.y + 100, scale: 1.25 }, ring: pad(span(D_EC.recs[1].r, D_EC.recs[2].r), 2), duration: 6500 },
  dSecStep("health.medical_advisers", "Doctors & medical advisers", "Sarah's GP and Leo's paediatrician, with phone numbers. Amber means Health."),
  dSecStep("health.medication_list", "Current medications", "What each person takes, the dose and what for - Leo's EpiPen for his peanut allergy, and where to find it.", { focus: { x: 720, y: D_MED.recs[1].r.y + 40, scale: 1.15 } }),
  { screen: "page", url: U_EM, scroll: dScroll(D_INS1.r.y - 90), caption: "Medicare & health card, and health insurance", detail: "Fund, membership and Medicare numbers, level of cover and who to call - ready for the hospital desk.", focus: { x: 720, y: D_INS1.r.y + 220, scale: 1.1 }, ring: pad(span(D_INS1.r, D_INS2.r), 4), duration: 7000 },
  dSecStep("personal.licences_ids", "Licence & ID", "Cards and IDs - James's Blue Card and when it expires."),
  dSecStep("personal.will_funeral", "Will & funeral instructions", "When Sarah signed her Will, where the original is, her executor and her solicitor."),
  { screen: "page", url: U_EM, scroll: dScroll(D_HOME.r.y - 90), caption: "Home and vehicle insurance", detail: "Policy numbers and the claims phone. Green means Admin & Bookkeeping.", focus: { x: 720, y: D_HOME.r.y + 200, scale: 1.1 }, ring: pad(span(D_HOME.r, D_VEH.r), 4), duration: 6500 },
  // Edit
  { screen: "page", url: U_EM, scroll: dScroll(D_EC.r.y - 90), caption: "Edit →", detail: "Every card links to its folder, to add or change an entry.", focus: { x: D_EC.edit.x, y: D_EC.edit.y + 10, scale: 1.8 }, ring: pad(D_EC.edit), click: mid(D_EC.edit), duration: 5000 },
  { screen: "ec", url: U_FOLDER(F_EC.id), caption: "The Emergency Contacts folder", detail: "\"The people to call in an emergency — start with your top one or two.\" It opens on Sarah's own.", focus: { x: 720, y: 220, scale: 1.15 }, ring: pad(span(DF_EC.head, DF_EC.desc!), 4), duration: 7000 },
  { screen: "ec", url: U_FOLDER(F_EC.id), scroll: DF_EC.card.y - 60, caption: "One entry per contact", detail: "Full name and phone number are required. Relationship, priority, another phone, email, address, and notes for a paramedic - best time to call, languages spoken.", ring: pad(DF_EC.card, 4), duration: 8500 },
  { screen: "ec", url: U_FOLDER(F_EC.id), scroll: Math.max(0, DF_EC.h - 760), caption: "Save, or + Add another", detail: "Add a second contact, and each one turns up on the emergency page.", focus: { x: 600, y: DF_EC.add.y, scale: 1.5 }, ring: pad(span(DF_EC.save, DF_EC.add), 4), duration: 5500 },
  { screen: "ecpick", url: U_FOLDER(F_EC.id), caption: "Switch person", detail: "Each family member has their own contacts. Sarah's, James's and Mia's are done; Leo's is empty.", focus: { x: 620, y: 220, scale: 1.5 }, ring: pickRect(DF_EC), click: { x: pickRect(DF_EC).x + 120, y: pickRect(DF_EC).y + 30 }, duration: 6500 },
  // Still missing
  { screen: "page", url: U_EM, scroll: D_BOTTOM, caption: "Still missing", detail: "Folders with nothing in them for anyone yet. Filling them makes the page more useful in an emergency.", focus: { x: 720, y: DP.missing.y + 60, scale: 1.3 }, ring: pad(DP.missing, 4), duration: 7000 },
  { screen: "page", url: U_EM, scroll: D_BOTTOM, caption: "Each one opens its folder", detail: "Advanced health directive, Power of attorney, Life insurance. Click Power of attorney.", focus: { x: D_POA_CHIP.x + 60, y: D_POA_CHIP.y, scale: 1.6 }, ring: pad(D_POA_CHIP), click: mid(D_POA_CHIP), duration: 5500 },
  { screen: "poa", url: U_FOLDER(F_POA.id), caption: "Power of Attorney Details", detail: "Keep a scan of your Power of Attorney, use it to fill the fields below, or both.", focus: { x: 720, y: 260, scale: 1.12 }, ring: pad(span(DF_POA.head, DF_POA.notes), 4), duration: 6500 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: DF_POA.card.y - 40, caption: "Upload & scan the POA", detail: "AI reads the document and fills in the attorney's details. How does this work? shows you on a sample. The person-plus button nominates it for the Peace of Mind Planner.", focus: { x: 720, y: DF_POA.items[0].r.y + 20, scale: 1.3 }, ring: pad(span(DF_POA.items[0].r, { x: DF_POA.card.x + 16, y: DF_POA.card.y + 16, w: DF_POA.card.w - 32, h: 36 }), 4), duration: 7500 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: DF_POA.items[1].r.y - 60, caption: "The attorney", detail: "Business name (only for a law firm or trustee company), their name, relationship, General or Enduring, phone, email, addresses - and where the original is kept.", ring: dFieldsRing(DF_POA, 1, 9), duration: 8500 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: Math.max(0, DF_POA.h - 760), caption: "Save - and more than one attorney", detail: "+ Add another for each attorney, or Upload or scan a list when one document names several.", focus: { x: 620, y: DF_POA.add.y, scale: 1.4 }, ring: pad(span(DF_POA.save, DF_POA.how!), 4), duration: 6500 },
  // Round buttons
  { screen: "page", url: U_EM, caption: "Help, and this walkthrough", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 1050, y: 640, scale: 1.8 }, ring: { x: FAB_R - 128, y: FAB_Y, w: 128, h: 56 }, click: { x: FAB_R - 100, y: FAB_Y + 28 }, duration: 7000 },
]

// ═════════════════════════════════════════════════════════════════════════════
// PHONE (390 x 844)
// ═════════════════════════════════════════════════════════════════════════════

const PP = pageLayout(true)
const PF_EC = folderLayout(F_EC, true)
const PF_POA = folderLayout(F_POA, true)
const pScroll = (y: number) => clamp(y, 0, PP.h - 844)
const pScrollF = (lay: FolderLayout, y: number) => clamp(y, 0, lay.h - 844)
const pFull = (r: Rect) => ({ x: PX, y: r.y, w: PCW, h: r.h })

const PEm = ({ children, fabs = false }: { children?: ReactNode; fabs?: boolean }) => (
  <PPage h={PP.h} fabs={fabs}><EmergencyBody lay={PP} />{children}</PPage>
)
const PFolder = ({ sp, lay, picker }: { sp: FolderSpec; lay: FolderLayout; picker?: boolean }) => (
  <PPage h={lay.h}><FolderBody sp={sp} lay={lay} phone picker={picker} /></PPage>
)
const P_SCREENS: Record<string, ReactNode> = {
  page: <PEm fabs />,
  sheet: <PShareSheet lay={PP} />,
  pdf: <PPdfViewer />,
  email: <PEm><EmailDialog r={emailRect(true)} phone /></PEm>,
  sent: <PEm><EmailDialog r={emailSentRect(true)} phone sent /></PEm>,
  excel: <PExcel />,
  ec: <PFolder sp={F_EC} lay={PF_EC} />,
  ecpick: <PFolder sp={F_EC} lay={PF_EC} picker />,
  poa: <PFolder sp={F_POA} lay={PF_POA} />,
}
const P_EC = secOf(PP, "personal.emergency_contacts")
const P_MA = secOf(PP, "health.medical_advisers")
const P_MED = secOf(PP, "health.medication_list")
const P_INS1 = secOf(PP, "health.health_insurance_cards")
const P_INS2 = secOf(PP, "health.health_insurance")
const P_LIC = secOf(PP, "personal.licences_ids")
const P_WILL = secOf(PP, "personal.will_funeral")
const P_HOME = secOf(PP, "admin.home_insurance")
const P_VEH = secOf(PP, "admin.vehicle_insurance")
const P_POA_CHIP = chipOf(PP, "personal.power_of_attorney")
const P_BOTTOM = pScroll(PP.h)
// Ring + scroll for a block of the phone page.
const pBlock = (r: Rect, caption: string, detail: string, opts: Partial<WalkStep> = {}): WalkStep => ({
  screen: "page", url: U_EM, scroll: pScroll(r.y - Math.max(16, Math.min(130, (844 - r.h) / 2))), caption, detail, focus: { x: 195, y: r.y + Math.min(r.h, 640) / 2, scale: 1.02 }, ring: pad(pFull(r), 2), duration: 7000, ...opts,
})
const pRecs = (sl: SecLay, a: number, b: number): Rect => span(sl.recs[a].r, sl.recs[b].r)
const pFieldsRing = (lay: FolderLayout, from: number, to: number) => {
  const a = lay.items[from].r, b = lay.items[Math.min(to, lay.items.length - 1)].r
  return pad({ x: PX, y: a.y, w: PCW, h: b.y + b.h - a.y }, 2)
}

const P_STEPS: WalkStep[] = [
  { screen: "page", url: U_EM, caption: "In case of emergency", detail: "Everything a paramedic, hospital or trusted person might need, for the whole family - on your phone. Open it from the ☰ menu.", focus: { x: 195, y: 260, scale: 1.05 }, ring: pad(pFull(span(PP.crumb, PP.count)), 2), duration: 7000 },
  { screen: "page", url: U_EM, caption: "Dashboard / Emergency", detail: "The breadcrumb - Dashboard takes you back to the dashboard.", focus: { x: 195, y: 160, scale: 1.5 }, ring: pad(PP.crumb), duration: 5000 },
  { screen: "page", url: U_EM, caption: "The red header", detail: "Download PDF, Share PDF and Excel are the three buttons at the top.", focus: { x: 195, y: PP.hdr.y + 60, scale: 1.12 }, ring: pad(PP.hdr), duration: 6000 },
  { screen: "page", url: U_EM, caption: COUNT_TEXT, detail: "How much is on the page, and for how many people.", focus: { x: 195, y: PP.count.y, scale: 1.4 }, ring: pad({ ...PP.count, w: 270 }), duration: 5500 },
  // Download PDF
  { screen: "page", url: U_EM, caption: "Download PDF", detail: "The PDF icon makes one branded PDF of the whole page.", focus: { x: PP.dl.x, y: PP.dl.y + 40, scale: 1.6 }, ring: pad(PP.dl), click: mid(PP.dl), duration: 5000 },
  { screen: "sheet", url: U_EM, caption: "Save to Files, Print or send it", detail: "On an iPhone it opens the share sheet - save it to Files, print it, or AirDrop it to someone.", focus: { x: 195, y: 560, scale: 1.05 }, ring: pad(P_SHEET_SAVE, 2), click: mid(P_SHEET_SAVE), duration: 6500 },
  { screen: "pdf", url: U_EM, caption: "Emergency information.pdf", detail: "Contacts, medications, insurance and important documents. Each entry is headed with the person - \"Sarah Taylor — Emma Clarke\".", focus: { x: 195, y: 360, scale: 1.25 }, ring: { x: P_PDF_SHEET.x, y: P_PDF_SHEET.y, w: P_PDF_SHEET.w, h: 420 }, duration: 7500 },
  // Share PDF
  { screen: "page", url: U_EM, caption: "Share PDF", detail: "The envelope emails the same PDF to someone.", focus: { x: PP.share.x, y: PP.share.y + 40, scale: 1.6 }, ring: pad(PP.share), click: mid(PP.share), duration: 5000 },
  { screen: "email", url: U_EM, caption: "Share by email", detail: "Their email and an optional message. It goes from The Adulting Life with your name on it.", focus: { x: 195, y: 440, scale: 1.05 }, ring: pad(emailRect(true), 2), click: mid(sendBtn(true)), duration: 8000 },
  { screen: "sent", url: U_EM, caption: "Sent to Emma", detail: "The PDF is attached.", focus: { x: 195, y: 400, scale: 1.1 }, ring: pad(emailSentRect(true), 2), click: mid(doneBtn(true)), duration: 5500 },
  // Excel
  { screen: "page", url: U_EM, caption: "Excel", detail: "The Excel icon downloads it all as a spreadsheet.", focus: { x: PP.xl.x - 20, y: PP.xl.y + 40, scale: 1.6 }, ring: pad(PP.xl), click: mid(PP.xl), duration: 5000 },
  { screen: "excel", url: U_EM, caption: "emergency.xlsx", detail: "One row per entry: Family member, then a column for every field.", focus: { x: 195, y: 230, scale: 1.2 }, ring: P_XL_GRID, duration: 6500 },
  { screen: "excel", url: U_EM, caption: "A sheet for every folder", detail: "Empty folders are left out.", focus: { x: 195, y: 790, scale: 1.3 }, ring: P_XL_TABS, duration: 5500 },
  // Sections
  pBlock(P_EC.head, "Emergency contacts", "Every family member's contacts in one card. The number is how many entries; violet means Personal.", { focus: { x: 195, y: P_EC.head.y + 60, scale: 1.3 } }),
  pBlock(P_EC.recs[0].r, "Whose entry it is", "Sarah's emergency contact is her sister Emma - with every answer from the form, one under the other."),
  pBlock(pRecs(P_EC, 1, 2), "Everyone's on the one page", "James's contact is Sarah, and Mia's is her dad."),
  pBlock(P_MA.r, "Doctors & medical advisers", "Sarah's GP and Leo's paediatrician. Amber means Health."),
  pBlock(P_MED.recs[1].r, "Current medications", "What each person takes - Leo's EpiPen for his peanut allergy, and where to find it.", { scroll: pScroll(P_MED.r.y - 120) }),
  pBlock(span(P_INS1.r, P_INS2.r), "Medicare & health card, and health insurance", "Fund, membership and Medicare numbers, level of cover and who to call."),
  pBlock(span(P_LIC.r, P_WILL.r), "Licence & ID, and Will & funeral instructions", "James's Blue Card; when Sarah signed her Will, where the original is and her executor."),
  pBlock(span(P_HOME.r, P_VEH.r), "Home and vehicle insurance", "Policy numbers and the claims phone. Green means Admin & Bookkeeping."),
  // Edit
  { screen: "page", url: U_EM, scroll: pScroll(P_EC.r.y - 130), caption: "Edit →", detail: "Every card links to its folder.", focus: { x: P_EC.edit.x, y: P_EC.edit.y + 10, scale: 1.6 }, ring: pad(P_EC.edit), click: mid(P_EC.edit), duration: 5000 },
  { screen: "ec", url: U_FOLDER(F_EC.id), caption: "The Emergency Contacts folder", detail: "The people to call in an emergency - it opens on Sarah's own.", focus: { x: 195, y: 330, scale: 1.02 }, ring: pad(pFull(span(PF_EC.head, PF_EC.desc!)), 2), duration: 6500 },
  { screen: "ec", url: U_FOLDER(F_EC.id), scroll: pScrollF(PF_EC, PF_EC.card.y - 60), caption: "One entry per contact", detail: "Full name and phone number are required; relationship, priority, another phone, email, address and notes for a paramedic.", focus: { x: 195, y: PF_EC.card.y + 380, scale: 1.02 }, ring: pad(pFull({ x: 0, y: PF_EC.card.y, w: 0, h: Math.min(PF_EC.card.h, 760) }), 2), duration: 8000 },
  { screen: "ec", url: U_FOLDER(F_EC.id), scroll: pScrollF(PF_EC, PF_EC.h), caption: "Save, or + Add another", detail: "Each contact turns up on the emergency page.", focus: { x: 150, y: PF_EC.add.y - 20, scale: 1.3 }, ring: pad(span(PF_EC.save, PF_EC.add), 4), duration: 5500 },
  { screen: "ecpick", url: U_FOLDER(F_EC.id), caption: "Switch person", detail: "Sarah's, James's and Mia's are done; Leo's is empty.", focus: { x: 160, y: 280, scale: 1.3 }, ring: pickRect(PF_EC), click: { x: 120, y: pickRect(PF_EC).y + 30 }, duration: 6000 },
  // Still missing
  { screen: "page", url: U_EM, scroll: P_BOTTOM, caption: "Still missing", detail: "Folders with nothing in them for anyone yet. Filling them makes the page more useful.", focus: { x: 195, y: PP.missing.y + 80, scale: 1.08 }, ring: pad(PP.missing, 2), duration: 6500 },
  { screen: "page", url: U_EM, scroll: P_BOTTOM, caption: "Each one opens its folder", detail: "Tap Power of attorney.", focus: { x: mid(P_POA_CHIP).x, y: P_POA_CHIP.y, scale: 1.4 }, ring: pad(P_POA_CHIP), click: mid(P_POA_CHIP), duration: 5000 },
  { screen: "poa", url: U_FOLDER(F_POA.id), caption: "Power of Attorney Details", detail: "Keep a scan of it, use it to fill the fields, or both.", focus: { x: 195, y: 330, scale: 1.02 }, ring: pad(pFull(span(PF_POA.head, PF_POA.notes)), 2), duration: 6000 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: pScrollF(PF_POA, PF_POA.card.y - 60), caption: "Upload & scan the POA", detail: "AI reads it and fills in the attorney's details. How does this work? shows you on a sample.", focus: { x: 195, y: PF_POA.items[0].r.y + 60, scale: 1.15 }, ring: pad(pFull({ x: 0, y: PF_POA.card.y + 16, w: 0, h: PF_POA.items[0].r.y + PF_POA.items[0].r.h - PF_POA.card.y - 16 }), 2), duration: 7000 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: pScrollF(PF_POA, PF_POA.items[1].r.y - 60), caption: "The attorney", detail: "Business name (only for a firm), their name, relationship, General or Enduring, phone and email.", focus: { x: 195, y: PF_POA.items[3].r.y + 100, scale: 1.02 }, ring: pFieldsRing(PF_POA, 1, 6), duration: 7500 },
  { screen: "poa", url: U_FOLDER(F_POA.id), scroll: pScrollF(PF_POA, PF_POA.h), caption: "Save - and more than one attorney", detail: "+ Add another for each attorney, or Upload or scan a list when one document names several.", focus: { x: 195, y: PF_POA.add.y + 20, scale: 1.1 }, ring: pad(pFull(span(PF_POA.save, PF_POA.how!)), 2), duration: 6500 },
  // Round buttons
  { screen: "page", url: U_EM, caption: "Help, and this walkthrough", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 300, y: 780, scale: 1.5 }, ring: { x: P_FAB_R - 128, y: P_FAB_Y, w: 128, h: 56 }, click: { x: P_FAB_R - 100, y: P_FAB_Y + 28 }, duration: 7000 },
]

export default function EmergencyPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "In case of emergency (phone)" : "In case of emergency (computer)"} url={U_EM} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "In case of emergency", subtitle: "Everything a paramedic, hospital or trusted person might need - on one page" }} />
  )
}
