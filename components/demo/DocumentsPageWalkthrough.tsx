"use client"

// "Documents" walkthrough - the Documents page's tour (the compass round button)
// and /demo. Hand-built copies of the real screens with a made-up family's sample
// data (the Taylors, Brisbane) - no sign-in, no API calls. Two versions
// (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (single column, actions wrap)
// Copies: app/(app)/documents/page.tsx (filters form, count, rows),
// components/DocumentActionsMenu (Replace, Relink -> "Move this document",
// Delete -> "Delete this document?"), components/FileActions (View, Download,
// Print, Share), components/FileViewerButton (the viewer: Download, Share, open
// in new tab, Close; PDFs page by page on phones), components/FileDownloadLink,
// components/FilePrintButton, components/EmailFileDialog ("Share by email"),
// the folder page app/(app)/records/[category]/[subcategory] (UserPicker,
// header, PageForm with the Warranties questions from migration 158, the
// "AI filled N fields" banner, Documents + FolderUploader + FolderFileList's
// Scan), app/(app)/records/[category]/r/[id], components/HeaderQuickBar's
// + Add menu, app/(app)/records/upload + UploadFolderPicker,
// app/(app)/records/scan + ScanFolderPicker, components/FolderPickerGrid,
// app/(app)/records/[category]/new + RecordEditor (fromScan: ScanSourcePreview +
// "AI-filled — review and save."), components/HelpButton + tour/TourFab.
// The shell (sidebar, header, round buttons) is copied from DashboardWalkthrough.
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

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) })

// ── Icons (copied from nav-items.tsx, layout.tsx and the components above) ───

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
const NAV_DOCS = 3
const NAV_ORG = 2
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
const MailIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" /></svg>
)
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ExternalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3h7v7M10 14L21 3M21 14v6a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
const TickIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" /></svg>
)
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v12M6 9l6-6 6 6M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const BinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
)
// ShareButton (person + plus)
const PersonPlus = () => (
  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tal-line bg-white">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  </span>
)
const ExcelBtn = () => (
  <span className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-medium text-tal-plum">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-700 text-[9px] font-bold text-white">X</span>Export to Excel
  </span>
)
// PdfActions' [Download PDF] [Share PDF] pair (icons only on a phone).
function PdfBtns({ phone }: { phone?: boolean }) {
  const b = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  return (
    <>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><PdfGlyph />{!phone && "Download PDF"}</span>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><MailIcon size={16} />{!phone && "Share PDF"}</span>
    </>
  )
}

// The two round buttons, bottom right: HelpButton (?) and TourFab (the compass,
// which plays this page's walkthrough), at right 1.5rem + 72px.
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
// Newest first, like listFamilyDocuments. Folder names are the live ones. An
// expiry date shows only when the file is linked to an entry that has one.

type Kind = "pdf" | "image" | "other"
type Doc = { name: string; kind: Kind; size: string; added: string; exp?: string; owner: string; folder?: string; entry?: string }
const DOCS: Doc[] = [
  { name: "Power bill Oct 2026.pdf", kind: "pdf", size: "190 KB", added: "4 Nov 2026", owner: "James Taylor", folder: "Electricity & Gas Bills" },
  { name: "Mia term 3 report.png", kind: "image", size: "880 KB", added: "2 Oct 2026", owner: "Mia Taylor", folder: "Secondary Reports & Certificates" },
  { name: "Fridge warranty - Westbrook.pdf", kind: "pdf", size: "310 KB", added: "8 Aug 2026", owner: "Sarah Taylor", folder: "Warranties on devices & tools" },
  { name: "Sarah Taylor - passport.pdf", kind: "pdf", size: "1.2 MB", added: "3 Feb 2026", owner: "Sarah Taylor", folder: "Passport & Travel Documents" },
  { name: "Family budget 2026.xlsx", kind: "other", size: "45 KB", added: "20 Jan 2026", owner: "Sarah Taylor" },
  { name: "Home and contents policy 2026.pdf", kind: "pdf", size: "2.4 MB", added: "16 Dec 2025", exp: "15 Dec 2026", owner: "Sarah Taylor", folder: "Home Insurance", entry: "Home & contents insurance" },
  { name: "RAV4 insurance certificate.jpg", kind: "image", size: "640 KB", added: "12 Nov 2025", exp: "3 Dec 2026", owner: "James Taylor", folder: "Vehicle Insurance Policies", entry: "RAV4 car insurance" },
]
const D_BILL = 0, D_WARRANTY = 2, D_BUDGET = 4
type Mode = "all" | "search" | "admin" | "expiry" | "relinked"
const MODE_ROWS: Record<Mode, number[]> = {
  all: [0, 1, 2, 3, 4, 5, 6],
  search: [5, 6], // "insurance" - filename, folder, entry or owner
  admin: [0, 2, 5, 6], // Admin & Bookkeeping (the budget isn't in a folder yet)
  expiry: [5, 6], // expiring 1 - 31 Dec 2026
  relinked: [0, 1, 2, 3, 4, 5, 6],
}
const rowsOf = (m: Mode): Doc[] => MODE_ROWS[m].map((n) => (m === "relinked" && n === D_BUDGET ? { ...DOCS[n], folder: "Budgets" } : DOCS[n]))
const filtered = (m: Mode) => m !== "all" && m !== "relinked"
const Q = "insurance"
const EMAIL_TO = "emma.clarke@example.com"
const EMAIL_MSG = "Hi Em - here's the power bill for the rental, as promised. S"

// Folder pickers (FolderPickerGrid): every folder that takes ad-hoc documents,
// by category - the Organiser's live folder names (Family Members is a family list).
type CatId = "personal" | "health" | "education" | "employment" | "admin"
const CAT_LABEL: Record<CatId, string> = { personal: "Personal", health: "Health", education: "Education", employment: "Employment", admin: "Admin & Bookkeeping" }
const CAT_IDS: CatId[] = ["personal", "health", "education", "employment", "admin"]
const FOLDERS: Record<CatId, [string, string][]> = {
  personal: [["personal.emergency_contacts", "Emergency Contacts"], ["personal.birth_certificates", "Birth Certificates"], ["personal.marriage_certificate", "Marriage Certificate"], ["personal.passport_travel", "Passport & Travel Documents"], ["personal.will_funeral", "Will & Funeral Instructions"], ["personal.power_of_attorney", "Power of Attorney Details"], ["personal.advanced_health_directive", "Advanced Health Directive"], ["personal.electoral_roll", "Electoral Roll Number & Registered Address"], ["personal.drivers_licence", "Driver's Licence"], ["personal.list_of_accounts", "Custom — List of Personal Accounts"], ["personal.licences_ids", "Copy of Licences & ID's"], ["personal.vehicle_details", "Custom — Vehicle Details & Copy of Registration Certificate"], ["personal.vehicle_logbook", "Vehicle Logbook"], ["personal.device_access", "Custom — Device Access Details"], ["personal.end_of_life_wishes", "Custom — End of Life Wishes"]],
  health: [["health.medical_advisers", "List of Medical Advisers"], ["health.medication_list", "Custom — Medication List"], ["health.health_insurance_cards", "Health Cards"], ["health.concession_cards", "Concession Cards"], ["health.pension_cards", "Pension Cards"], ["health.health_insurance", "Health Insurance Details & Statements"], ["health.life_insurance", "Life Insurance Details & Statements"], ["health.my_health_plan", "My Health Plan"], ["health.scripts", "Copies of Scripts / Prescriptions"], ["health.blood_tests", "Blood Test Results"], ["health.specialist_reports", "Specialist Reports"], ["health.referrals", "Referrals"], ["health.hospital_discharge", "Hospital Discharge Records"], ["health.medical_reports", "Medical Reports"], ["health.medical_bills", "Medical Bills"], ["health.meal_planning", "Meal Planning"], ["health.favourite_recipes", "Favourite Recipes"], ["health.life_goals_plans", "Life Goals & Plans"], ["health.mind_set", "Mindset"], ["health.retirement_pension", "Retirement / Pension Plan"]],
  education: [["education.courses_enrolment", "Custom Courses & Enrolments"], ["education.primary_details", "Primary Education"], ["education.primary_reports", "Primary Reports & Certificates"], ["education.secondary_details", "Secondary Education"], ["education.secondary_reports", "Secondary Reports & Certificates"], ["education.tertiary_details", "Tertiary Education"], ["education.tertiary_reports", "Tertiary Transcripts & Certificates"], ["education.other_courses_details", "Other Education"], ["education.achievement_certificates", "Achievement Certificates"], ["education.study_plan", "Study Plan"], ["education.course_storage", "Course Storage"], ["education.other", "Other"]],
  employment: [["employment.employee_information_form", "Employee Information Form"], ["employment.cover_letter", "Cover Letter"], ["employment.resume", "Resume"], ["employment.letters_of_recommendation", "Letters of Recommendation"], ["employment.volunteering_certificates", "Volunteering Certificates"], ["employment.employee_contracts", "Employee Contracts"], ["employment.job_description", "Position / Job Description"], ["employment.employment_reviews", "Employment Reviews"], ["employment.correspondence", "Correspondence"], ["employment.wages_summaries", "Wages Summaries"], ["employment.annual_payment_summary", "Annual Payment Summary Report"], ["employment.other", "Other"]],
  admin: [["admin.bank_accounts_advisers", "List of Bank Accounts & Advisers"], ["admin.bank_statements", "Bank Statements"], ["admin.loans", "Loans"], ["admin.loan_statements", "Loan Statements"], ["admin.budgets", "Budgets"], ["admin.investments_deeds", "Investments, Shares & Deeds"], ["admin.super_statements", "Superannuation Funds"], ["admin.super_statement_documents", "Superannuation Statements"], ["admin.property_records", "Property Records"], ["admin.annual_tax_report", "Annual Taxation Report"], ["admin.tax_payment_plans", "Tax Payment Plans"], ["admin.home_insurance", "Home Insurance"], ["admin.other_business_insurance", "Other Business / Property Insurance"], ["admin.vehicle_insurance", "Vehicle Insurance Policies"], ["admin.telephone_devices", "Telephones & Devices Contracts"], ["admin.telephone_devices_statements", "Telephones & Devices Statements"], ["admin.electricity_gas", "Electricity & Gas Accounts"], ["admin.electricity_gas_bills", "Electricity & Gas Bills"], ["admin.rates_water", "Rates & Water"], ["admin.rental_agreements", "Rental Agreements"], ["admin.warranties", "Warranties on devices & tools"], ["admin.other", "Other"], ["admin.invoices_jul_jun", "Invoices July to June"]],
}
const thumbOf = (id: string) => `/thumbnails/subcategories/${id}.png`
const WARRANTY = "Warranties on devices & tools"
const NEW_FILE = "Dishwasher warranty.pdf"

// Dropdown options (native selects)
const OPT_CATEGORY = ["All categories", ...CAT_IDS.map((c) => CAT_LABEL[c])]
const OPT_FOLDER = ["All folders", ...FOLDERS.admin.map((f) => f[1])]
const OPT_ENTRY = ["Any entry", "Home & contents insurance", "Home loan", "RAV4 car insurance"]
const OPT_TYPE = ["Any type", "PDF", "Image", "Other"]
type Open = "category" | "folder" | "entry" | "type"
const OPTS: Record<Open, string[]> = { category: OPT_CATEGORY, folder: OPT_FOLDER, entry: OPT_ENTRY, type: OPT_TYPE }

// ── Row actions (FileActions + DocumentActionsMenu), laid out like flex-wrap gap-1 ──

const ACT = ["View", "Download", "Print", "Share", "Replace", "Relink", "Delete"] as const
type Act = (typeof ACT)[number]
const ACT_W: Record<Act, number> = { View: 50, Download: 80, Print: 72, Share: 74, Replace: 76, Relink: 68, Delete: 68 }
const BUSY: Partial<Record<Act, { t: string; w: number }>> = { Download: { t: "Downloading…", w: 104 }, Print: { t: "Preparing…", w: 108 }, Replace: { t: "Replacing…", w: 92 } }
const actW = (a: Act, busy?: Act) => (busy === a && BUSY[a] ? BUSY[a]!.w : ACT_W[a])
// Computer: one line, right-aligned at the row's top. Phone: wraps under the text.
function actRects(phone: boolean, x0: number, rowTop: number, maxW: number, busy?: Act): Record<Act, Rect> {
  const out = {} as Record<Act, Rect>
  if (!phone) {
    const total = ACT.reduce((s, a) => s + actW(a, busy), 0) + 4 * (ACT.length - 1)
    let x = x0 + maxW - total
    for (const a of ACT) {
      const small = ACT.indexOf(a) < 4
      out[a] = { x, y: rowTop + (small ? 2 : 0), w: actW(a, busy), h: small ? 32 : 36 }
      x += actW(a, busy) + 4
    }
    return out
  }
  let x = x0, y = rowTop
  for (const a of ACT) {
    const w = actW(a, busy)
    if (x + w > x0 + maxW) { x = x0; y += 36 }
    const small = ACT.indexOf(a) < 4
    out[a] = { x, y, w, h: small ? 32 : 36 }
    x += w + 4
  }
  return out
}
function ActBtn({ a, r, busy }: { a: Act; r: Rect; busy?: Act }) {
  const label = busy === a && BUSY[a] ? BUSY[a]!.t : a
  const base = "flex items-center justify-center gap-1.5 whitespace-nowrap"
  const cls =
    a === "View" ? `${base} rounded-lg bg-black text-xs font-medium text-white`
    : a === "Delete" ? `${base} rounded-xl border border-red-200 bg-red-50 text-sm text-red-700`
    : a === "Replace" || a === "Relink" ? `${base} rounded-xl border border-tal-line bg-white text-sm`
    : `${base} rounded-lg border border-tal-line bg-white text-xs font-medium`
  return (
    <Box {...r} className={`${cls} ${busy === a ? "opacity-60" : ""}`}>
      {a === "Print" && <PrintIcon />}{a === "Share" && <MailIcon />}{label}
    </Box>
  )
}
function KindBadge({ k, label }: { k: Kind; label?: string }) {
  const c = k === "pdf" ? "bg-red-100 text-red-800" : k === "image" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${c}`}>{label ?? k.toUpperCase()}</span>
}
const truncate = (s: string, max = 40) => (s.length <= max ? s : s.slice(0, max - 1) + "…")

// One document row: badge, filename (opens the viewer), size · Added · Expires · owner,
// then its folder and linked entry (links), and the actions.
// On a computer a row whose details are too wide for the buttons beside them
// (one with an expiry date) wraps its buttons onto their own line, like the real flex-wrap.
const dWraps = (d: Doc) => !!d.exp
function DocRow({ d, r, phone, busy }: { d: Doc; r: Rect; phone: boolean; busy?: Act }) {
  const tx = r.x + 16 + 50
  const wrap = !phone && dWraps(d)
  const tw = phone ? r.w - 32 - 50 : wrap ? r.w - 32 - 50 : 290
  const acts = phone ? actRects(true, r.x + 16, r.y + 112, r.w - 32, busy) : wrap ? actRects(true, r.x + 16, r.y + 94, r.w - 32, busy) : actRects(false, r.x + 16, r.y + 16, r.w - 32, busy)
  return (
    <>
      <Box x={r.x + 16} y={r.y + 18} w={46} h={18} className="flex"><KindBadge k={d.kind} /></Box>
      <Box x={tx} y={r.y + 14} w={tw} h={24} className="truncate font-medium">{truncate(d.name)}</Box>
      <Box x={tx} y={r.y + 42} w={tw} h={phone ? 34 : 16} className="flex flex-wrap items-center gap-x-2 text-xs leading-4 text-tal-plum-soft">
        <span>{d.size}</span><span>·</span><span>Added {d.added}</span>
        {d.exp && <><span>·</span><span>Expires {d.exp}</span></>}
        <span>·</span><span>{d.owner}</span>
      </Box>
      <Box x={tx} y={r.y + (phone ? 80 : 62)} w={tw} h={16} className="flex items-center gap-2 whitespace-nowrap text-xs text-tal-plum-soft">
        {d.folder ? <span>{d.folder}</span> : <span className="italic">Not linked to a folder</span>}
        {d.entry && <><span>·</span><span>{d.entry}</span></>}
      </Box>
      {ACT.map((a) => <ActBtn key={a} a={a} r={acts[a]} busy={busy} />)}
    </>
  )
}

// A native select's open list (computer) / the iOS menu (phone).
function SelectList({ r, opts, sel, phone }: { r: Rect; opts: string[]; sel: number; phone: boolean }) {
  const shown = opts.slice(0, phone ? 9 : 12)
  return (
    <Box x={r.x} y={r.y + r.h + 4} w={r.w} h={shown.length * (phone ? 40 : 26) + 10} className={`overflow-hidden border border-black/10 bg-white py-1 shadow-2xl ${phone ? "rounded-2xl" : "rounded-md"}`}>
      {shown.map((o, k) => (
        <div key={o} className={`flex items-center gap-2 px-3 text-sm ${phone ? "h-10 border-b border-black/5" : "h-[26px]"} ${!phone && k === sel ? "bg-blue-600 text-white" : ""}`}>
          {phone && <span className="w-4 text-blue-600">{k === sel ? "✓" : ""}</span>}<span className="truncate">{o}</span>
        </div>
      ))}
      {opts.length > shown.length && <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white" />}
    </Box>
  )
}

// ── Dialogs (EmailFileDialog, DocumentActionsMenu) ───────────────────────────

const lbl = "block text-xs uppercase tracking-wider text-tal-plum-soft mb-1"
const inputBox = "flex h-10 items-center rounded-xl border border-tal-line bg-white px-3 text-sm"
type DlgKind = "share" | "sent" | "relink" | "delete"
const DLG_SIZE: Record<DlgKind, { w: number; h: number }> = { share: { w: 448, h: 372 }, sent: { w: 448, h: 196 }, relink: { w: 448, h: 330 }, delete: { w: 384, h: 196 } }
const dlgRect = (k: DlgKind, phone: boolean, oy: number): Rect => {
  const W = phone ? 390 : 1200, H = phone ? 844 : 760
  const s = DLG_SIZE[k]
  const w = Math.min(s.w, W - 32)
  const h = phone && k !== "sent" ? s.h + 24 : phone ? s.h + 40 : s.h
  return { x: (W - w) / 2, y: oy + (H - h) / 2, w, h }
}
// The main button, bottom right of a dialog.
const dlgMain = (k: DlgKind, r: Rect): Rect => {
  const p = k === "delete" || k === "relink" ? 24 : 20
  const w = k === "delete" ? 150 : k === "sent" ? 72 : 70
  const h = k === "delete" || k === "relink" ? 36 : 40
  return { x: r.x + r.w - p - w, y: r.y + r.h - p - h, w, h }
}
function Dialog({ k, phone, oy, filename }: { k: DlgKind; phone: boolean; oy: number; filename: string }) {
  const r = dlgRect(k, phone, oy)
  const main = dlgMain(k, r)
  const W = phone ? 390 : 1200, H = phone ? 844 : 760
  return (
    <>
      <Box x={0} y={oy} w={W} h={H} className={k === "share" || k === "sent" ? "bg-black/50" : "bg-black/40"} />
      <Box {...r} className={`flex flex-col rounded-2xl bg-white shadow-xl ${k === "delete" || k === "relink" ? "p-6" : "p-5"}`}>
        {(k === "share" || k === "sent") && (
          <>
            <p className="font-display text-lg">Share by email</p>
            <p className="mt-1 truncate text-xs text-tal-plum-soft">{filename}</p>
            {k === "share" ? (
              <>
                <p className="mb-1 mt-4 text-sm">Recipient&apos;s email</p>
                <div className="flex h-11 items-center rounded-xl border border-tal-line px-3 text-sm ring-2 ring-tal-plum/30"><Typed text={EMAIL_TO} delay={900} speed={55} /></div>
                <p className="mb-1 mt-3 text-sm">Message <span className="text-tal-plum-soft">(optional)</span></p>
                <div className="h-[76px] rounded-xl border border-tal-line px-3 py-2 text-sm leading-5"><Typed text={EMAIL_MSG} delay={2900} speed={35} /></div>
                <p className="mt-2 text-xs text-tal-plum-soft">Sent from The Adulting Life with your name on it. Replies come to your email address.</p>
              </>
            ) : (
              <p className="mt-4 text-sm">Sent to <span className="font-medium">{EMAIL_TO}</span>. The document is attached.</p>
            )}
          </>
        )}
        {k === "relink" && (
          <>
            <p className="mb-2 font-display text-lg">Move this document</p>
            <p className="mb-4 text-sm text-tal-plum-soft">Change which folder or Organiser entry this document is attached to. The file itself stays the same.</p>
            <p className={lbl}>Folder ID</p>
            <div className={`${inputBox} mb-3`}><Typed text="admin.budgets" delay={1000} speed={80} /></div>
            <p className={lbl}>Linked entry ID (optional)</p>
            <div className={`${inputBox} text-tal-plum-soft/60`}>Leave blank for no linked entry</div>
          </>
        )}
        {k === "delete" && (
          <>
            <p className="mb-2 font-display text-lg">Delete this document?</p>
            <p className="mb-4 text-sm text-tal-plum-soft"><span className="break-all font-medium text-tal-plum">{filename}</span> will be permanently removed. Your Organiser entry stays; only the file goes.</p>
          </>
        )}
      </Box>
      {k !== "sent" && (
        <Box x={main.x - 8 - (k === "share" ? 84 : 72)} y={main.y} w={k === "share" ? 84 : 72} h={main.h}
          className={`flex items-center justify-center rounded-xl text-sm ${k === "share" ? "border border-tal-line" : ""}`}>Cancel</Box>
      )}
      <Box {...main} className={`flex items-center justify-center rounded-xl text-sm font-medium text-white ${k === "delete" ? "bg-red-600" : "bg-black"}`}>
        {k === "share" ? "Send" : k === "sent" ? "Done" : k === "relink" ? "Save" : "Delete document"}
      </Box>
    </>
  )
}

// ── The viewer (FileViewerButton's FileViewerModal) with the power bill ──────

// The sample bill, drawn in HTML and marked SAMPLE.
function BillPage({ w }: { w: number }) {
  const s = w / 560
  return (
    <div className="relative overflow-hidden bg-white text-[#1f2937] shadow-lg" style={{ width: w, height: w * 1.414, padding: 36 * s, fontSize: 12 * s }}>
      <div className="flex items-start justify-between">
        <div><p className="font-bold text-emerald-700" style={{ fontSize: 22 * s }}>Brightside Energy</p><p className="text-gray-500">Electricity bill · Tax invoice</p></div>
        <div className="text-right"><p className="text-gray-500">Account 4021 7783</p><p className="text-gray-500">Issued 4 Nov 2026</p></div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4" style={{ marginTop: 28 * s }}>
        <div><p className="text-gray-500">Account holder</p><p className="font-semibold">James Taylor</p><p className="mt-2 text-gray-500">Supply address</p><p>Paddington QLD 4064</p></div>
        <div className="rounded-lg bg-emerald-50 text-right" style={{ padding: 14 * s }}><p className="text-gray-500">Amount due</p><p className="font-bold" style={{ fontSize: 26 * s }}>$214.60</p><p className="text-gray-500">Due 25 Nov 2026</p></div>
      </div>
      <p className="font-semibold" style={{ marginTop: 28 * s }}>Billing period 1 Oct – 31 Oct 2026 (31 days)</p>
      {[["General usage 512 kWh", "$158.72"], ["Supply charge 31 days", "$36.27"], ["GST", "$19.61"]].map(([a, b]) => (
        <div key={a} className="flex justify-between border-b border-gray-200" style={{ paddingTop: 8 * s, paddingBottom: 8 * s }}><span>{a}</span><span>{b}</span></div>
      ))}
      <div className="flex items-end gap-1" style={{ marginTop: 28 * s, height: 90 * s }}>
        {[52, 61, 58, 70, 66, 74, 69, 63, 57, 60, 64, 71].map((v, k) => <span key={k} className="flex-1 rounded-t bg-emerald-200" style={{ height: `${v}%` }} />)}
      </div>
      <p className="text-gray-500" style={{ marginTop: 6 * s }}>Your usage over the last 12 months</p>
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] font-black tracking-widest text-red-500/15" style={{ fontSize: 92 * s }}>SAMPLE</span>
    </div>
  )
}
const V_BAR = { download: { x: 846, y: 8, w: 112, h: 40 }, share: { x: 964, y: 8, w: 86, h: 40 }, ext: { x: 1056, y: 8, w: 40, h: 40 }, close: { x: 1102, y: 8, w: 86, h: 40 } }
const PV_BAR = { download: { x: 240, y: 52, w: 42, h: 40 }, share: { x: 288, y: 52, w: 42, h: 40 }, close: { x: 336, y: 52, w: 42, h: 40 } }
function Viewer({ phone, share }: { phone: boolean; share?: boolean }) {
  const btn = "flex items-center justify-center gap-1.5 rounded-lg bg-white/10 text-sm text-white"
  if (phone) {
    return (
      <div className="absolute left-0 top-0 w-full bg-neutral-900" style={{ height: 844 }}>
        <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between bg-black px-7 text-sm font-semibold text-white"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
        <Box x={0} y={44} w={390} h={56} className="flex items-center bg-black px-3 text-sm font-medium text-white"><span className="w-[220px] truncate">{DOCS[D_BILL].name}</span></Box>
        <Box {...PV_BAR.download} className={btn}><DownloadIcon /></Box>
        <Box {...PV_BAR.share} className={btn}><MailIcon size={18} /></Box>
        <Box {...PV_BAR.close} className={btn}><CloseIcon /></Box>
        {/* PdfPagesView: each page drawn in turn */}
        <Box x={12} y={116} w={366} h={540}><BillPage w={366} /></Box>
        <Box x={12} y={656} w={366} h={30} className="text-center text-xs leading-[30px] text-white/50">Page 1 of 1</Box>
        {share && <Dialog k="share" phone oy={0} filename={DOCS[D_BILL].name} />}
      </div>
    )
  }
  return (
    <div className="absolute left-0 top-0 w-full bg-neutral-900" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={56} className="flex items-center bg-black px-3 text-sm font-medium text-white">{DOCS[D_BILL].name}</Box>
      <Box {...V_BAR.download} className={btn}><DownloadIcon />Download</Box>
      <Box {...V_BAR.share} className={btn}><MailIcon size={18} />Share</Box>
      <Box {...V_BAR.ext} className={btn}><ExternalIcon /></Box>
      <Box {...V_BAR.close} className={btn}><CloseIcon />Close</Box>
      {/* The browser's own PDF viewer, in the frame */}
      <Box x={0} y={56} w={1200} h={704} className="bg-[#525659]" />
      <Box x={0} y={56} w={1200} h={40} className="flex items-center justify-between bg-[#323639] px-4 text-xs text-white/80"><span>{DOCS[D_BILL].name}</span><span>1 / 1 &nbsp;&nbsp; − 100% +</span><span>⤓ &nbsp; ⎙</span></Box>
      <Box x={320} y={112} w={560} h={792}><BillPage w={560} /></Box>
      {share && <Dialog k="share" phone={false} oy={0} filename={DOCS[D_BILL].name} />}
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
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const ADD_ACTIONS = ["Add record", "Upload document", "Scan document", "Add reminder"]
const ADD_MENU = { x: 656, y: 60, w: 192, h: 160 }
const addItem = (k: number) => ({ x: ADD_MENU.x + 4, y: ADD_MENU.y + 8 + k * 36, w: ADD_MENU.w - 8, h: 36 })
const FAB_Y = 680
const FAB_R = 1176

function DShell({ children, addOpen, h = 760, nav = NAV_DOCS, fabs }: { children: ReactNode; addOpen?: boolean; h?: number; nav?: number; fabs?: boolean }) {
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
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
      {fabs && <Fabs y={FAB_Y} right={FAB_R} />}
      {addOpen && (
        <Box {...ADD_MENU} className="rounded-xl border border-tal-line bg-white py-2 shadow-lg">
          {ADD_ACTIONS.map((a) => <p key={a} className="flex h-9 items-center px-4 text-sm">{a}</p>)}
        </Box>
      )}
    </div>
  )
}

// ── The Documents page (documents/page.tsx) ──────────────────────────────────

const COLW = 280
const colX = (i: number) => L + 16 + i * (COLW + 12)
const fIn = (i: number, row: number, w = COLW) => ({ x: colX(i), y: 204 + row * 72 + 20, w, h: 40 })
const D = {
  crumb: { x: L, y: 72, w: 80, h: 20 },
  head: { x: L, y: 104, w: CW, h: 64 },
  form: { x: L, y: 188, w: CW, h: 288 },
  search: fIn(0, 0), category: fIn(1, 0), folder: fIn(2, 0),
  entry: fIn(0, 1), type: fIn(1, 1), added: fIn(2, 1),
  expiry: fIn(0, 2, COLW * 2 + 12),
  apply: { x: L + CW - 16 - 98, y: 420, w: 98, h: 40 },
  clear: { x: L + CW - 16 - 98 - 8 - 128, y: 420, w: 128, h: 40 },
  count: { x: L, y: 492, w: 300, h: 20 },
}
const LIST_Y = 524, ROW = 96, ROW_WRAP = 148
const dRowH = (d: Doc) => (dWraps(d) ? ROW_WRAP : ROW)
const dRowsH = (rows: Doc[]) => rows.reduce((s, d) => s + dRowH(d), 0)
// Row n in the full list (rows before the two expiring ones are all ROW high).
const dRow = (n: number): Rect => ({ x: L, y: LIST_Y + dRowsH(DOCS.slice(0, n)), w: CW, h: dRowH(DOCS[n]) })
const dActs = (n: number, busy?: Act) => actRects(false, L + 16, dRow(n).y + 16, CW - 32, busy)
const dName = (n: number) => ({ x: L + 66, y: dRow(n).y + 12, w: 250, h: 28 })
const dFolder = (n: number, w = 200) => ({ x: L + 64, y: dRow(n).y + 60, w, h: 20 })
const dEntry = (n: number, folderW: number, w: number) => ({ x: L + 66 + folderW + 16, y: dRow(n).y + 60, w, h: 20 })
const D_H = LIST_Y + dRowsH(DOCS) + 40

type PageProps = { mode?: Mode; typing?: boolean; open?: Open; busy?: { row: number; a: Act }; dlg?: DlgKind; dlgFile?: string; oy?: number; addOpen?: boolean; fabs?: boolean }

function FilterForm({ phone, mode, typing, open }: { phone: boolean; mode: Mode; typing?: boolean; open?: Open }) {
  const F = phone ? P : D
  const sel = (o: Open) => (o === "category" && mode === "admin" ? OPT_CATEGORY[5] : OPTS[o][0])
  const dateVal = (from: boolean) => (mode === "expiry" ? (from ? "01/12/2026" : "31/12/2026") : null)
  const label = (r: Rect, t: string) => <Box x={r.x} y={r.y - 20} w={r.w} h={16} className="text-xs uppercase leading-4 tracking-wider text-tal-plum-soft">{t}</Box>
  const select = (r: Rect, o: Open) => <Box {...r} className={`${inputBox} justify-between ${open === o ? "ring-2 ring-blue-500" : ""}`}><span className="truncate">{sel(o)}</span><span className="text-xs text-tal-plum-soft">⌄</span></Box>
  const dates = (r: Rect, from?: string | null, to?: string | null) => {
    const w = (r.w - 8) / 2
    return [from, to].map((v, k) => (
      <Box key={k} x={r.x + k * (w + 8)} y={r.y} w={w} h={40} className={`${inputBox} justify-between`}>
        {v ? <span>{v}</span> : <span className="text-tal-plum-soft/50">dd/mm/yyyy</span>}<span className="text-tal-plum-soft/70">▦</span>
      </Box>
    ))
  }
  return (
    <>
      <Box {...F.form} className="rounded-2xl border border-tal-line bg-white" />
      {label(F.search, "Search")}
      <Box {...F.search} className={`${inputBox} ${typing ? "ring-2 ring-tal-plum/30" : ""}`}>
        {typing ? <Typed text={Q} /> : mode === "search" ? Q : <span className="text-tal-plum-soft/50">Filename, folder, entry…</span>}
      </Box>
      {label(F.category, "Category")}{select(F.category, "category")}
      {label(F.folder, "Folder")}{select(F.folder, "folder")}
      {label(F.entry, "Linked entry")}{select(F.entry, "entry")}
      {label(F.type, "Document type")}{select(F.type, "type")}
      {label(F.added, "Date added")}{dates(F.added)}
      {label(F.expiry, "Expiry date")}{dates(F.expiry, dateVal(true), dateVal(false))}
      {filtered(mode) && <Box {...F.clear} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line text-sm"><CloseIcon size={14} />Clear filters</Box>}
      <Box {...F.apply} className="flex items-center justify-center gap-1.5 rounded-xl bg-black text-sm font-medium text-white"><TickIcon />Apply</Box>
      {open && <SelectList r={F[open]} opts={OPTS[open]} sel={open === "category" && mode === "admin" ? 5 : 0} phone={phone} />}
    </>
  )
}

function DDocs({ mode = "all", typing, open, busy, dlg, dlgFile, oy = 0, addOpen, fabs }: PageProps) {
  const rows = rowsOf(mode)
  return (
    <DShell h={D_H} addOpen={addOpen} fabs={fabs}>
      <Box x={L} y={72} w={300} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Dashboard</span><span className="opacity-50">/</span><span>Documents</span></Box>
      <Box x={L} y={104} w={CW} h={36} className="font-display text-3xl">Documents</Box>
      <Box x={L} y={144} w={CW} h={20} className="text-sm text-tal-plum-soft">Every file you&apos;ve uploaded, in one calm library. Filter by folder, entry, type or date.</Box>
      <FilterForm phone={false} mode={mode} typing={typing} open={open} />
      <Box {...D.count} className="text-sm text-tal-plum-soft">{rows.length} of {DOCS.length} documents</Box>
      <Box x={L} y={LIST_Y} w={CW} h={dRowsH(rows)} className="divide-y divide-tal-line overflow-hidden rounded-2xl border border-tal-line bg-white">
        {rows.map((d) => <div key={d.name} style={{ height: dRowH(d) }} />)}
      </Box>
      {rows.map((d, n) => <DocRow key={d.name} d={d} r={{ x: L, y: LIST_Y + dRowsH(rows.slice(0, n)), w: CW, h: dRowH(d) }} phone={false} busy={busy?.row === n ? busy.a : undefined} />)}
      {dlg && <Dialog k={dlg} phone={false} oy={oy} filename={dlgFile ?? ""} />}
    </DShell>
  )
}

// ── A linked entry (records/[category]/r/[id]) ───────────────────────────────

const REC_TITLE = "Home & contents insurance"
const RC = { pill: { x: L + CW - 110, y: 112, w: 110, h: 26 }, expiry: { x: L, y: 240, w: 672, h: 68 }, save: { x: L, y: 584, w: 140, h: 44 } }
function RecFields({ x, y0, w, phone }: { x: number; y0: number; w: number; phone?: boolean }) {
  const box = "flex h-11 items-center rounded-xl border border-tal-line bg-white px-3"
  return (
    <>
      <Box x={x} y={y0} w={w} h={68}><p className="mb-1 text-sm">Title</p><div className={box}>{REC_TITLE}</div></Box>
      <Box x={x} y={y0 + 84} w={w} h={68}><p className="mb-1 text-sm">Expiry date (optional)</p><div className={`${box} w-[190px]`}>15/12/2026</div></Box>
      <Box x={x} y={y0 + 176} w={w} h={92}>
        <p className="mb-1 text-sm">Tags (optional)</p>
        <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-tal-line bg-white p-2"><span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">renewals<span className="text-violet-600">×</span></span></div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="text-tal-plum-soft">Existing:</span>{["glovebox", "wallet", "safe"].map((t) => <span key={t} className="rounded-full border border-tal-line px-2 py-0.5">+ {t}</span>)}</div>
      </Box>
      <Box x={x} y={y0 + 292} w={w} h={112}><p className="mb-1 text-sm">Notes (optional)</p><div className="h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm">Harbourline Insurance, policy HC-558201. Renews 15 December - compare quotes first.</div></Box>
      <Box x={x} y={y0 + 428} w={140} h={44} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save changes</Box>
      <Box x={x + 152} y={y0 + 428} w={96} h={44} className="flex items-center justify-center rounded-xl border border-red-200 text-red-700">Delete</Box>
      <Box x={x} y={y0 + (phone ? 500 : 504)} w={w} h={28} className="font-display text-lg">Audit trail</Box>
    </>
  )
}
function DRecord() {
  return (
    <DShell>
      <Box x={L} y={76} w={CW} h={20} className="flex items-center gap-1.5 text-sm text-tal-plum-soft"><span>Records</span><span className="opacity-60">›</span><span>Admin &amp; Bookkeeping</span><span className="opacity-60">›</span><span className="font-medium text-tal-plum">{REC_TITLE}</span></Box>
      <Box x={L} y={104} w={700} h={44} className="font-display text-3xl">{REC_TITLE}</Box>
      <Box {...RC.pill} className="flex items-center justify-center rounded-full bg-amber-100 text-xs text-amber-800">Expiring soon</Box>
      <RecFields x={L} y0={156} w={672} />
    </DShell>
  )
}

// ── A folder page (records/admin/admin.warranties) ───────────────────────────
// PageForm with the Warranties questions (migration 158), then Documents.

type FolderOpts = { scanning?: boolean; scanned?: boolean; uploaded?: boolean }
const WAR_FIELDS = [
  { l: "Warranty document", t: "file", hint: "Upload the warranty certificate (PDF or photo)", half: 0 },
  { l: "Receipt", t: "file", hint: "Upload the receipt or proof of purchase", half: 1 },
  { l: "Item", t: "text", req: true, hint: "What is the warranty for? e.g. LG dishwasher, Bosch drill" },
  { l: "Date of purchase", t: "date", half: 0 },
  { l: "Amount paid ($)", t: "number", half: 1 },
] as const
const WAR_AI: Record<string, string> = { "Warranty document": DOCS[D_WARRANTY].name, Item: "Westbrook 420L fridge", "Date of purchase": "08/08/2026", "Amount paid ($)": "1649" }
function WarControl({ f, v, phone }: { f: (typeof WAR_FIELDS)[number]; v?: string; phone?: boolean }) {
  const box = "flex h-11 items-center rounded-xl border border-tal-line bg-white px-3 text-sm"
  if (f.t === "file") {
    if (v) return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-violet-300 bg-violet-50/60 px-3 text-sm"><PdfGlyph /><span className="truncate">{v}</span></div>
    )
    return (
      <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-medium text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {phone ? "Upload & scan" : "Upload & scan a file"}
      </span>
    )
  }
  const filled = v ? "border-violet-300 bg-violet-50/60" : ""
  if (f.t === "date") return <div className={`${box} ${filled} justify-between`}>{v ? <span>{v}</span> : <span className="text-tal-plum-soft/50">dd/mm/yyyy</span>}<span className="text-tal-plum-soft/70">▦</span></div>
  return <div className={`${box} ${filled}`}>{v ?? ""}</div>
}
// Positions of everything on the folder page.
function folderLayout(phone: boolean, o: FolderOpts) {
  const x = phone ? 8 : L, w = phone ? 374 : CW
  const picker = phone ? { x: 8, y: 142, w: 170, h: 32 } : { x: L + 364, y: 72, w: 170, h: 32 }
  const head = phone ? { x, y: 186, w, h: 120 } : { x, y: 116, w, h: 72 }
  const top = { x, y: head.y + head.h + 20, w, h: 36 }
  const note = { x, y: top.y + 48, w, h: phone ? 104 : 84 }
  const card = { x, y: note.y + note.h + 16, w, h: 0 }
  const ix = x + 16, iw = w - 32, half = (iw - 16) / 2
  const fields: Rect[] = []
  let y = card.y + 68
  for (let k = 0; k < WAR_FIELDS.length; k++) {
    const f = WAR_FIELDS[k]
    const hasHint = "hint" in f
    const h = 20 + 44 + (hasHint ? (phone ? 36 : 20) : 0)
    if (!phone && "half" in f && f.half === 1) { fields.push({ x: ix + half + 16, y: fields[k - 1].y, w: half, h }); continue }
    if (!phone && k > 0 && fields[k - 1]) y = Math.max(y, fields[k - 1].y + fields[k - 1].h + 16)
    fields.push({ x: ix, y, w: !phone && "half" in f ? half : iw, h })
    y += h + 16
  }
  const last = fields[fields.length - 1]
  card.h = last.y + last.h + 16 - card.y
  const save = { x, y: card.y + card.h + 16, w: 96, h: 44 }
  const addAnother = { x: x + 108, y: save.y, w: 140, h: 44 }
  const docsY = save.y + 44 + 32
  const docsHead = { x, y: docsY, w: phone ? w : 600, h: phone ? 72 : 40 }
  const takePhoto = phone ? { x, y: docsY + 80, w: 118, h: 36 } : { x: x + w - 164 - 8 - 118, y: docsY + 4, w: 118, h: 36 }
  const uploadDoc = { x: takePhoto.x + 118 + 8, y: takePhoto.y, w: 164, h: 36 }
  const fileRowY = takePhoto.y + 36 + (phone ? 12 : 28)
  const files = o.uploaded ? [NEW_FILE, DOCS[D_WARRANTY].name] : [DOCS[D_WARRANTY].name]
  const fileRowH = phone ? 156 : 62
  const fileRow = (n: number) => ({ x, y: fileRowY + n * (fileRowH + 8), w, h: fileRowH })
  // FolderFileList's buttons: Scan, View, Download, Print, Share, share-with, bin (gap-2)
  const fbW = [80, 50, 80, 72, 74, 36, 36]
  const fileBtns = (n: number): Rect[] => {
    const r = fileRow(n)
    const out: Rect[] = []
    if (!phone) {
      let bx = r.x + r.w - 16 - (fbW.reduce((s, v) => s + v, 0) + 8 * (fbW.length - 1))
      for (const bw of fbW) { out.push({ x: bx, y: r.y + 13, w: bw, h: 36 }); bx += bw + 8 }
      return out
    }
    let bx = r.x + 16, by = r.y + 64
    for (const bw of fbW) {
      if (bx + bw > r.x + r.w - 16) { bx = r.x + 16; by += 44 }
      out.push({ x: bx, y: by, w: bw, h: 36 }); bx += bw + 8
    }
    return out
  }
  // Tall enough for the steps that scroll down to the Documents section.
  const h = Math.max(fileRow(files.length - 1).y + fileRowH + 60, docsY - (phone ? 200 : 300) + (phone ? 844 : 760))
  return { x, w, picker, head, top, note, card, fields, save, addAnother, docsHead, takePhoto, uploadDoc, files, fileRow, fileBtns, h }
}
function FolderBody({ phone, o }: { phone: boolean; o: FolderOpts }) {
  const F = folderLayout(phone, o)
  return (
    <>
      <Box x={F.x} y={phone ? 116 : 78} w={phone ? 374 : 360} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Admin &amp; Bookkeeping</span><span className="opacity-50">·</span></Box>
      <Box {...F.picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">Sarah Taylor</span><span className="text-xs">▾</span>
      </Box>
      <Box x={F.picker.x + F.picker.w + 10} y={F.picker.y + 8} w={170} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
      {/* Header */}
      <Box {...F.head} className="rounded-2xl bg-black shadow-md" />
      <Img src={thumbOf("admin.warranties")} x={F.x + (phone ? 12 : 20)} y={F.head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={F.x + (phone ? 76 : 84)} y={F.head.y + 12} w={phone ? 286 : 600} h={48} className="flex items-center font-display text-white" ><span style={{ fontSize: phone ? 20 : 24 }} className="leading-tight">{WARRANTY}</span></Box>
      <Box x={phone ? F.x + 12 : F.x + F.w - 170} y={phone ? F.head.y + 72 : F.head.y + 18} w={150} h={36} className="flex"><ExcelBtn /></Box>
      {/* PageForm */}
      <Box {...F.top} className="flex items-center justify-end gap-2"><PdfBtns phone={phone} /></Box>
      {o.scanned ? (
        <Box {...F.note} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-sm font-medium text-violet-900">AI filled 3 fields — please review before saving.</p>
          <p className="mt-1.5 text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</p>
        </Box>
      ) : (
        <Box {...F.note} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900"><span className="text-amber-600"><WarnIcon /></span>1 required field still empty</p>
          <p className="ml-6 mt-0.5 text-xs leading-4 text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
          <div className="ml-6 mt-2 flex gap-1.5"><span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-900">Item</span></div>
        </Box>
      )}
      <Box {...F.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={F.card.x + 16} y={F.card.y + 16} w={F.card.w - 32} h={36} className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span>
        <span className="flex items-center gap-2">{!phone && <PdfBtns />}<span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700"><BinIcon /></span></span>
      </Box>
      {WAR_FIELDS.map((f, k) => (
        <Box key={f.l} {...F.fields[k]}>
          <p className="mb-1 text-xs uppercase leading-4 tracking-wider text-tal-plum-soft">{f.l}{"req" in f && f.req && <span className="text-red-500">*</span>}</p>
          <WarControl f={f} v={o.scanned ? WAR_AI[f.l] : undefined} phone={phone} />
          {"hint" in f && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
        </Box>
      ))}
      <Box {...F.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
      <Box {...F.addAnother} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
      {/* Documents */}
      <Box {...F.docsHead}>
        <p className="font-display">Documents</p>
        <p className="mt-0.5 text-xs text-tal-plum-soft">Everything in this folder. Add anything else that goes with it — e.g. visas, travel insurance or itineraries alongside a passport.</p>
      </Box>
      <Box {...F.takePhoto} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><CameraIcon />Take photo</Box>
      <Box {...F.uploadDoc} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><UploadIcon />Upload Document</Box>
      {F.files.map((name, n) => {
        const r = F.fileRow(n), b = F.fileBtns(n)
        const fb = "flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-tal-line bg-white text-xs font-medium"
        const scanning = o.scanning && name === DOCS[D_WARRANTY].name
        return (
          <div key={name}>
            <Box {...r} className={`rounded-xl border bg-white ${o.uploaded && n === 0 ? "border-emerald-300" : "border-tal-line"}`} />
            <Box x={r.x + 16} y={r.y + 13} w={phone ? 300 : 330} h={36} className="flex items-center gap-3">
              <KindBadge k="pdf" label="PDF" />
              <div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="text-xs text-tal-plum-soft">{n === 0 && o.uploaded ? "23 Nov 2026" : "8 Aug 2026"}</p></div>
            </Box>
            <Box {...b[0]} className={`flex items-center justify-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 text-sm font-medium text-violet-800 ${scanning ? "opacity-60" : ""}`}>✨ {scanning ? "Scanning…" : "Scan"}</Box>
            <Box {...b[1]} className="flex items-center justify-center rounded-lg bg-black text-xs font-medium text-white">View</Box>
            <Box {...b[2]} className={fb}>Download</Box>
            <Box {...b[3]} className={fb}><PrintIcon />Print</Box>
            <Box {...b[4]} className={fb}><MailIcon />Share</Box>
            <Box {...b[5]} className="flex"><PersonPlus /></Box>
            <Box {...b[6]} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-red-700"><BinIcon /></Box>
          </div>
        )
      })}
    </>
  )
}
const DF = folderLayout(false, {})
const DF_UP = folderLayout(false, { uploaded: true })

// ── Upload / Scan a document (records/upload, records/scan + FolderPickerGrid) ──

const PK_TOP = 200
const PK_CARD_W = (CW - 16) / 3
function pickerLayout() {
  const secY: Record<CatId, number> = {} as Record<CatId, number>
  const card: Record<string, Rect> = {}
  let y = PK_TOP
  for (const c of CAT_IDS) {
    secY[c] = y
    FOLDERS[c].forEach(([id], k) => { card[id] = { x: L + (k % 3) * (PK_CARD_W + 8), y: y + 36 + Math.floor(k / 3) * 74, w: PK_CARD_W, h: 66 } })
    y += 36 + Math.ceil(FOLDERS[c].length / 3) * 74 + 16
  }
  return { secY, card, h: y + 40 }
}
const PK = pickerLayout()
const PK_BANNER = { x: L, y: PK_TOP - 8, w: CW, h: 48 }
function DPicker({ kind, busy }: { kind: "upload" | "scan"; busy?: boolean }) {
  const scan = kind === "scan"
  const top = busy ? 56 : 0
  return (
    <DShell h={PK.h + top} nav={NAV_ORG}>
      <Box x={L} y={72} w={400} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Dashboard</span><span className="opacity-50">·</span><span>{scan ? "Scan a document" : "Upload a document"}</span></Box>
      <Box x={L} y={104} w={CW} h={76} className={`rounded-2xl text-white shadow-md ${scan ? "bg-black" : "bg-gradient-to-br from-emerald-700 to-emerald-900"}`} />
      <Img src={`/thumbnails/dashboard/${scan ? "scan" : "upload"}-document.png`} x={L + 20} y={120} w={44} />
      <Box x={L + 80} y={114} w={CW - 100} h={60} className="text-white">
        <p className="font-display text-2xl leading-tight">{scan ? "Scan a document" : "Upload a document"}</p>
        <p className={`mt-1 text-sm ${scan ? "text-white/70" : "text-white/80"}`}>
          {scan ? "Pick the folder this document belongs to, then choose the photo or PDF. We'll extract the fields with AI and prefill a new record for you to review." : "Pick the folder this document belongs to and we'll save it there. You can have it read later with Scan, next to the document in that folder."}
        </p>
      </Box>
      {busy && (
        <Box {...PK_BANNER} className={`flex items-center gap-3 rounded-2xl border px-4 text-sm ${scan ? "border-violet-200 bg-violet-50 text-violet-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${scan ? "border-violet-300 border-t-violet-700" : "border-emerald-300 border-t-emerald-700"}`} />
          {scan ? <span><strong>{WARRANTY}:</strong> Extracting fields with AI…</span> : <span>Uploading “{NEW_FILE}” to {WARRANTY}…</span>}
        </Box>
      )}
      {CAT_IDS.map((c) => (
        <div key={c}>
          <Box x={L} y={PK.secY[c] + top} w={400} h={28} className="font-display text-lg">{CAT_LABEL[c]}</Box>
          {FOLDERS[c].map(([id, name]) => {
            const r = PK.card[id]
            return (
              <Box key={id} x={r.x} y={r.y + top} w={r.w} h={r.h} className={`flex items-center gap-3 rounded-xl border border-tal-line bg-white p-3 ${busy ? "opacity-60" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbOf(id)} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-tal-cream-soft object-cover" />
                <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                <span className="text-tal-plum-soft/60">→</span>
              </Box>
            )
          })}
        </div>
      ))}
    </DShell>
  )
}

// ── New record from a scan (records/admin/new?fromScan=1 + RecordEditor) ─────

const NR_X = L + (CW + 24) / 2
const NR_W = (CW - 24) / 2
const NR = { preview: { x: L, y: 152, w: NR_W, h: 520 }, banner: { x: NR_X, y: 152, w: NR_W, h: 46 }, create: { x: NR_X, y: 894, w: 96, h: 44 } }
const NR_FIELDS: [string, string, number?][] = [["Title", "Dishwasher warranty - Westbrook"], ["Expiry date (optional)", "14/11/2028", 190], ["Item", "Westbrook DW60 dishwasher"], ["Date of purchase", "14/11/2026"], ["Amount paid ($)", "1199"]]
const nrField = (k: number) => ({ x: NR_X, y: 222 + k * 84, w: NR_W, h: 68 })
function DNewRec() {
  return (
    <DShell h={1040} nav={NAV_ORG}>
      <Box x={L} y={76} w={300} h={20} className="text-sm text-tal-plum-soft">← Admin &amp; Bookkeeping</Box>
      <Box x={L} y={98} w={600} h={40} className="font-display text-3xl">New record</Box>
      {/* ScanSourcePreview */}
      <Box {...NR.preview} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={L} y={152} w={NR_W} h={52} className="flex items-center justify-between border-b border-tal-line bg-tal-cream-soft px-3">
        <div><p className="text-xs uppercase tracking-wide text-tal-plum-soft">Source document</p><p className="text-sm">{NEW_FILE}</p></div><span className="text-xs text-tal-plum-soft">Open ↗</span>
      </Box>
      <Box x={L + 1} y={204} w={NR_W - 2} h={467} className="flex items-center justify-center bg-tal-cream-soft/50">
        <div className="relative h-[420px] w-[300px] overflow-hidden bg-white p-6 text-[11px] text-gray-700 shadow">
          <p className="text-lg font-bold text-sky-800">Westbrook Appliances</p>
          <p className="text-gray-500">Certificate of Warranty</p>
          <div className="mt-5 space-y-2">
            {[["Product", "DW60 dishwasher"], ["Serial no.", "WB-DW60-118274"], ["Purchased", "14 November 2026"], ["Price paid", "$1,199.00"], ["Warranty", "2 years parts & labour"], ["Expires", "14 November 2028"], ["Owner", "Sarah Taylor"]].map(([a, b]) => (
              <div key={a} className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">{a}</span><span className="font-medium">{b}</span></div>
            ))}
          </div>
          <p className="mt-5 text-gray-400">Keep this certificate with your receipt. Call 1800 000 000 to make a claim.</p>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] text-5xl font-black tracking-widest text-red-500/15">SAMPLE</span>
        </div>
      </Box>
      {/* RecordEditor, prefilled */}
      <Box {...NR.banner} className="flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900"><span>✨</span>AI-filled — review and save.</Box>
      {NR_FIELDS.map(([l, v, w], k) => (
        <Box key={l} {...nrField(k)}>
          <p className="mb-1 text-sm">{l}</p>
          <div className="flex h-11 items-center rounded-xl border border-tal-line bg-white px-3" style={{ width: w ?? "100%" }}>{v}</div>
        </Box>
      ))}
      <Box x={NR_X} y={642} w={NR_W} h={92}>
        <p className="mb-1 text-sm">Tags (optional)</p>
        <div className="flex min-h-12 items-center rounded-xl border border-tal-line bg-white p-2 px-3 text-sm text-tal-plum-soft/60">e.g. wallet, glovebox, safe</div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="text-tal-plum-soft">Existing:</span>{["renewals", "glovebox", "safe"].map((t) => <span key={t} className="rounded-full border border-tal-line px-2 py-0.5">+ {t}</span>)}</div>
      </Box>
      <Box x={NR_X} y={758} w={NR_W} h={112}><p className="mb-1 text-sm">Notes (optional)</p><div className="h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm">2 years parts &amp; labour. Serial WB-DW60-118274.</div></Box>
      <Box {...NR.create} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Create</Box>
    </DShell>
  )
}

// ── Computer screens and steps ───────────────────────────────────────────────

const LIST_SCROLL = 300
const D_SCREENS: Record<string, ReactNode> = {
  docs: <DDocs />,
  dtyping: <DDocs typing />,
  dsearch: <DDocs mode="search" />,
  dcat: <DDocs open="category" />,
  dfolder: <DDocs mode="admin" open="folder" />,
  dentry: <DDocs mode="admin" open="entry" />,
  dtype: <DDocs mode="admin" open="type" />,
  dexpiry: <DDocs mode="expiry" />,
  dview: <Viewer phone={false} />,
  dviewshare: <Viewer phone={false} share />,
  ddown: <DDocs busy={{ row: D_BILL, a: "Download" }} />,
  dprint: <DDocs busy={{ row: D_BILL, a: "Print" }} />,
  dshare: <DDocs dlg="share" dlgFile={DOCS[D_BILL].name} oy={LIST_SCROLL} />,
  dsent: <DDocs dlg="sent" dlgFile={DOCS[D_BILL].name} oy={LIST_SCROLL} />,
  dreplace: <DDocs busy={{ row: D_BILL, a: "Replace" }} />,
  drelink: <DDocs dlg="relink" dlgFile={DOCS[D_BUDGET].name} oy={LIST_SCROLL} />,
  drelinked: <DDocs mode="relinked" />,
  ddelete: <DDocs dlg="delete" dlgFile={DOCS[D_BILL].name} oy={LIST_SCROLL} />,
  dadd: <DDocs addOpen />,
  dfabs: <DDocs fabs />,
  record: <DRecord />,
  folder: <DShell h={DF.h} nav={NAV_ORG}><FolderBody phone={false} o={{}} /></DShell>,
  fscanning: <DShell h={DF.h} nav={NAV_ORG}><FolderBody phone={false} o={{ scanning: true }} /></DShell>,
  fscanned: <DShell h={DF.h} nav={NAV_ORG}><FolderBody phone={false} o={{ scanned: true }} /></DShell>,
  fuploaded: <DShell h={DF_UP.h} nav={NAV_ORG}><FolderBody phone={false} o={{ uploaded: true }} /></DShell>,
  upload: <DPicker kind="upload" />,
  uploading: <DPicker kind="upload" busy />,
  scan: <DPicker kind="scan" />,
  scanning: <DPicker kind="scan" busy />,
  newrec: <DNewRec />,
}
const BASE = "app.theadultinglife.com.au"
const U_DOCS = `${BASE}/documents`
const U_SEARCH = `${U_DOCS}?q=${Q}`
const U_ADMIN = `${U_DOCS}?category=admin`
const U_EXPIRY = `${U_DOCS}?expiryFrom=2026-12-01&expiryTo=2026-12-31`
const U_REC = `${BASE}/records/admin/r/4b2e`
const U_FOLDER = `${BASE}/records/admin/admin.warranties`
const U_UPLOAD = `${BASE}/records/upload`
const U_SCAN = `${BASE}/records/scan`
const U_NEW = `${BASE}/records/admin/new?subcategory=admin.warranties&fromScan=1`

const billActs = dActs(D_BILL)
const warCard = PK.card["admin.warranties"]
const D_STEPS: WalkStep[] = [
  { screen: "docs", url: U_DOCS, caption: "Documents", detail: "Every file anyone in the family has uploaded, in one calm library - whichever folder it went into. It's in the sidebar, under the Organiser.", focus: { x: 720, y: 300, scale: 1.05 }, ring: { x: 12, y: navY(NAV_DOCS), w: 216, h: 37 }, duration: 6000 },
  { screen: "docs", url: U_DOCS, caption: "Back to the dashboard", detail: "The Dashboard link at the top takes you home. Below it, the filters - fill in any of them and press Apply.", focus: { x: 520, y: 200, scale: 1.6 }, ring: pad(D.crumb), duration: 5000 },
  // Search
  { screen: "dtyping", url: U_DOCS, caption: "Search", detail: "Type part of a filename, a folder, a linked entry or a person's name. Here: \"insurance\".", focus: { x: 480, y: 250, scale: 1.7 }, ring: pad(D.search), duration: 5500 },
  { screen: "dtyping", url: U_DOCS, caption: "Apply", detail: "Nothing changes until you press Apply - so you can set several filters first.", focus: { x: 1000, y: 400, scale: 1.6 }, ring: pad(D.apply), click: mid(D.apply), duration: 4500 },
  { screen: "dsearch", url: U_SEARCH, scroll: 160, caption: "2 of 7 documents", detail: "The home insurance policy (in Home Insurance) and the RAV4 certificate (in Vehicle Insurance Policies). Each shows its expiry date, because it's linked to an entry that has one.", focus: { x: 720, y: 600, scale: 1.15 }, ring: { x: L - 4, y: D.count.y - 4, w: CW + 8, h: 2 * ROW_WRAP + 40 }, duration: 7000 },
  { screen: "dsearch", url: U_SEARCH, scroll: 160, caption: "Click the linked entry", detail: "The second link on a row is the Organiser entry the file belongs to.", focus: { x: 560, y: dRow(0).y + 60, scale: 1.7 }, ring: pad(dEntry(0, 104, 160)), click: mid(dEntry(0, 104, 160)), duration: 5000 },
  { screen: "record", url: U_REC, caption: "Home & contents insurance", detail: "The entry itself: title, expiry date (15 Dec - so it's Expiring soon), tags and notes. Change the date when it renews and Save changes.", focus: { x: 620, y: 300, scale: 1.15 }, ring: pad(RC.expiry), duration: 7000 },
  { screen: "dsearch", url: U_SEARCH, caption: "Clear filters", detail: "Shows once any filter is on. One click and you're back to everything.", focus: { x: 980, y: 420, scale: 1.6 }, ring: pad(D.clear), click: mid(D.clear), duration: 5000 },
  // Dropdowns
  { screen: "dcat", url: U_DOCS, caption: "Category", detail: "Personal, Health, Education, Employment or Admin & Bookkeeping. Pick Admin & Bookkeeping and Apply.", focus: { x: 720, y: 330, scale: 1.4 }, ring: pad(D.category), click: { x: D.category.x + 80, y: D.category.y + 44 + 5 * 26 + 18 }, duration: 6000 },
  { screen: "dfolder", url: U_ADMIN, caption: "Folder", detail: "Now lists that category's folders - Bank Statements, Loans, Home Insurance and the rest. 4 of 7 documents are in Admin & Bookkeeping.", focus: { x: 900, y: 400, scale: 1.25 }, ring: pad(D.folder), duration: 6500 },
  { screen: "dentry", url: U_ADMIN, caption: "Linked entry", detail: "Just the files attached to one Organiser entry - say, everything for the home insurance.", focus: { x: 480, y: 360, scale: 1.5 }, ring: pad(D.entry), duration: 5500 },
  { screen: "dtype", url: U_ADMIN, caption: "Document type", detail: "PDF, Image (photos and scans) or Other (spreadsheets, Word files and so on).", focus: { x: 720, y: 360, scale: 1.5 }, ring: pad(D.type), duration: 5500 },
  { screen: "docs", url: U_DOCS, caption: "Date added", detail: "From and to - handy for \"what did we upload at tax time?\".", focus: { x: 1010, y: 320, scale: 1.7 }, ring: pad(D.added), duration: 5000 },
  { screen: "dexpiry", url: U_EXPIRY, caption: "Expiry date", detail: "Files whose entry expires between two dates. 1-31 December finds the home insurance and the RAV4 insurance - both renew next month.", focus: { x: 620, y: 400, scale: 1.3 }, ring: pad(span(D.expiry, D.count)), duration: 7000 },
  // The list
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "7 of 7 documents", detail: "Newest first. The tag shows the type: red PDF, blue IMAGE, grey OTHER.", focus: { x: 720, y: 760, scale: 1.05 }, ring: { x: L - 4, y: D.count.y - 4, w: CW + 8, h: dRowsH(DOCS) + 40 }, duration: 6500 },
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "What each row tells you", detail: "Size, the date it was added, its expiry (if it's linked to an entry with one) and whose it is - here James's October power bill, in Electricity & Gas Bills.", focus: { x: 480, y: dRow(0).y + 48, scale: 1.8 }, ring: { x: L + 12, y: dRow(0).y + 10, w: 340, h: 74 }, duration: 6500 },
  // Viewer
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Click the name to open it", detail: "The document opens right here - no download needed.", focus: { x: 480, y: dRow(0).y + 30, scale: 1.8 }, ring: pad(dName(0)), click: mid(dName(0)), duration: 4500 },
  { screen: "dview", url: U_DOCS, caption: "The viewer", detail: "PDFs open in your browser's own viewer, photos full size. Esc or Close takes you back.", focus: { x: 600, y: 380, scale: 1.05 }, duration: 6000 },
  { screen: "dview", url: U_DOCS, caption: "Download, Share, new tab, Close", detail: "Save a copy, email it, or open it in its own browser tab - all from the top bar.", focus: { x: 1000, y: 120, scale: 1.8 }, ring: pad(span(V_BAR.download, V_BAR.close)), click: mid(V_BAR.share), duration: 6000 },
  { screen: "dviewshare", url: U_DOCS, caption: "Share by email - from the viewer", detail: "The same form as the Share button on the row - see it below.", focus: { x: 600, y: 380, scale: 1.25 }, ring: dlgRect("share", false, 0), duration: 5500 },
  // Row actions
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Buttons on every row", detail: "View, Download, Print and Share - plus Replace, Relink and Delete. Big, plain buttons, easy to hit on an iPad.", focus: { x: 900, y: dRow(0).y + 40, scale: 1.5 }, ring: pad(span(billActs.View, billActs.Delete)), duration: 6000 },
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "View", detail: "Opens the same viewer as clicking the name.", focus: { x: 800, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(billActs.View), click: mid(billActs.View), duration: 4000 },
  { screen: "ddown", url: U_DOCS, scroll: LIST_SCROLL, caption: "Download", detail: "Saves the file to your computer (on an iPhone or iPad: Save to Files).", focus: { x: 800, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(dActs(D_BILL, "Download").Download), click: mid(dActs(D_BILL, "Download").Download), duration: 4500 },
  { screen: "dprint", url: U_DOCS, scroll: LIST_SCROLL, caption: "Print", detail: "Prints the original document, exactly as it was uploaded - your printer dialog opens.", focus: { x: 820, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(dActs(D_BILL, "Print").Print), click: mid(dActs(D_BILL, "Print").Print), duration: 5000 },
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Share", detail: "Emails the document to anyone.", focus: { x: 860, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(billActs.Share), click: mid(billActs.Share), duration: 4000 },
  { screen: "dshare", url: U_DOCS, scroll: LIST_SCROLL, caption: "Recipient and a message", detail: "Sarah sends the power bill to her sister Emma. It goes from The Adulting Life with Sarah's name on it, and replies come to Sarah.", focus: { x: 600, y: LIST_SCROLL + 380, scale: 1.3 }, ring: dlgRect("share", false, LIST_SCROLL), click: mid(dlgMain("share", dlgRect("share", false, LIST_SCROLL))), duration: 9000 },
  { screen: "dsent", url: U_DOCS, scroll: LIST_SCROLL, caption: "Sent", detail: "The document is attached. Too big to attach? Emma gets a private link that works for 7 days instead.", focus: { x: 600, y: LIST_SCROLL + 380, scale: 1.4 }, ring: dlgRect("sent", false, LIST_SCROLL), click: mid(dlgMain("sent", dlgRect("sent", false, LIST_SCROLL))), duration: 6000 },
  { screen: "dreplace", url: U_DOCS, scroll: LIST_SCROLL, caption: "Replace", detail: "Pick a newer file and it takes this one's place - same folder, same entry. Good for a clearer scan or an updated policy.", focus: { x: 960, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(dActs(D_BILL, "Replace").Replace), click: mid(dActs(D_BILL, "Replace").Replace), duration: 5500 },
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Not linked to a folder?", detail: "The family budget spreadsheet isn't in a folder yet. Relink moves it.", focus: { x: 720, y: dRow(D_BUDGET).y + 48, scale: 1.4 }, ring: pad(span(dFolder(D_BUDGET, 150), dActs(D_BUDGET).Relink)), click: mid(dActs(D_BUDGET).Relink), duration: 5500 },
  { screen: "drelink", url: U_DOCS, scroll: LIST_SCROLL, caption: "Move this document", detail: "Type the folder it belongs in (admin.budgets is Budgets), and an entry if you like. The file itself stays the same.", focus: { x: 600, y: LIST_SCROLL + 380, scale: 1.35 }, ring: dlgRect("relink", false, LIST_SCROLL), click: mid(dlgMain("relink", dlgRect("relink", false, LIST_SCROLL))), duration: 7500 },
  { screen: "drelinked", url: U_DOCS, scroll: LIST_SCROLL, caption: "Now it's in Budgets", detail: "Click the folder name on any row to open that folder.", focus: { x: 520, y: dRow(D_BUDGET).y + 60, scale: 1.8 }, ring: pad(dFolder(D_BUDGET, 70)), duration: 5000 },
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Delete", detail: "Asks first.", focus: { x: 1100, y: dRow(0).y + 40, scale: 1.9 }, ring: pad(billActs.Delete), click: mid(billActs.Delete), duration: 4000 },
  { screen: "ddelete", url: U_DOCS, scroll: LIST_SCROLL, caption: "Delete this document?", detail: "The file goes for good, but the Organiser entry it was attached to stays. Cancel if you change your mind.", focus: { x: 600, y: LIST_SCROLL + 380, scale: 1.45 }, ring: dlgRect("delete", false, LIST_SCROLL), duration: 6000 },
  // The folder
  { screen: "docs", url: U_DOCS, scroll: LIST_SCROLL, caption: "Open the folder it's in", detail: "The fridge warranty is in Warranties on devices & tools.", focus: { x: 520, y: dRow(D_WARRANTY).y + 60, scale: 1.8 }, ring: pad(dFolder(D_WARRANTY, 190)), click: mid(dFolder(D_WARRANTY, 190)), duration: 4500 },
  { screen: "folder", url: U_FOLDER, caption: "Warranties on devices & tools", detail: "Sarah's warranties. The person button switches to James's, Mia's or Leo's. Export to Excel keeps a list.", focus: { x: 720, y: 160, scale: 1.3 }, ring: pad(span(DF.picker, DF.head)), duration: 6000 },
  { screen: "folder", url: U_FOLDER, caption: "The folder's own questions", detail: "Warranty document, Receipt, Item, Date of purchase and Amount paid. Item is required, so it isn't complete yet.", focus: { x: 720, y: DF.card.y + 100, scale: 1.05 }, ring: pad(span(DF.note, DF.card)), duration: 7000 },
  { screen: "folder", url: U_FOLDER, scroll: DF.docsHead.y - 300, caption: "Documents, and two ways to add one", detail: "Take photo uses your camera; Upload Document picks a file. Everything in this folder is listed here.", focus: { x: 720, y: DF.docsHead.y + 40, scale: 1.3 }, ring: pad(span(DF.docsHead, DF.uploadDoc)), duration: 6000 },
  { screen: "folder", url: U_FOLDER, scroll: DF.docsHead.y - 300, caption: "✨ Scan - have AI read it", detail: "Reads the document and fills in the details. The first time, it asks before sending anything to AI.", focus: { x: 800, y: DF.fileRow(0).y + 30, scale: 1.6 }, ring: pad(DF.fileBtns(0)[0]), click: mid(DF.fileBtns(0)[0]), duration: 5500 },
  { screen: "fscanning", url: U_FOLDER, scroll: DF.docsHead.y - 300, caption: "Scanning…", detail: "A few seconds while AI reads the warranty.", focus: { x: 800, y: DF.fileRow(0).y + 30, scale: 1.6 }, ring: pad(DF.fileBtns(0)[0]), duration: 3500 },
  { screen: "fscanned", url: U_FOLDER, caption: "AI filled 3 fields", detail: "Item, date of purchase and amount paid - and the warranty is attached. Check them against the document, then Save.", focus: { x: 720, y: DF.card.y + 140, scale: 1.05 }, ring: pad(span(DF.note, DF.save)), click: mid(DF.save), duration: 8000 },
  // Add menu: Upload and Scan
  { screen: "dadd", url: U_DOCS, caption: "+ Add, in the header", detail: "On every page: Add record, Upload document, Scan document or Add reminder. Upload document first.", focus: { x: 700, y: 140, scale: 1.7 }, ring: pad(span(ADD, ADD_MENU)), click: mid(addItem(1)), duration: 6000 },
  { screen: "upload", url: U_UPLOAD, caption: "Upload a document", detail: "Pick the folder it belongs in, then choose the file. Every folder, grouped by category.", focus: { x: 720, y: 330, scale: 1.1 }, ring: pad({ x: L, y: 104, w: CW, h: 76 }), duration: 6000 },
  { screen: "upload", url: U_UPLOAD, scroll: PK.secY.admin - 100, caption: "Pick Warranties on devices & tools", detail: "Then choose the dishwasher warranty from the computer.", focus: { x: warCard.x + warCard.w / 2, y: warCard.y + 33, scale: 1.5 }, ring: pad(warCard), click: mid(warCard), duration: 5500 },
  { screen: "uploading", url: U_UPLOAD, caption: "Uploading…", detail: "Saved straight into the folder.", focus: { x: 720, y: PK_BANNER.y + 24, scale: 1.4 }, ring: pad(PK_BANNER), duration: 4000 },
  { screen: "fuploaded", url: U_FOLDER, scroll: DF_UP.docsHead.y - 300, caption: "It's in the folder", detail: "And on the Documents page. Have it read any time with ✨ Scan beside it.", focus: { x: 720, y: DF_UP.fileRow(0).y + 30, scale: 1.25 }, ring: pad(DF_UP.fileRow(0)), duration: 6000 },
  { screen: "dadd", url: U_DOCS, caption: "+ Add > Scan document", detail: "Uploads it and has AI read it in one go.", focus: { x: 700, y: 140, scale: 1.7 }, ring: pad(addItem(2)), click: mid(addItem(2)), duration: 4500 },
  { screen: "scan", url: U_SCAN, scroll: PK.secY.admin - 100, caption: "Scan a document", detail: "Pick the folder, then a photo or PDF (JPEG, PNG, WebP, HEIC or PDF, up to 20MB). A driver's licence asks for the front, then the back.", focus: { x: warCard.x + warCard.w / 2, y: warCard.y + 33, scale: 1.4 }, ring: pad(warCard), click: mid(warCard), duration: 7000 },
  { screen: "scanning", url: U_SCAN, caption: "Extracting fields with AI…", detail: "It uploads the document, then reads it.", focus: { x: 720, y: PK_BANNER.y + 24, scale: 1.4 }, ring: pad(PK_BANNER), duration: 4500 },
  { screen: "newrec", url: U_NEW, caption: "A new record, filled in for you", detail: "The document on the left, what AI read on the right - title, expiry, item, date and price. If it's not sure, it says so and asks you to double-check.", focus: { x: 720, y: 420, scale: 1.08 }, ring: pad(span(NR.preview, NR.banner)), duration: 8000 },
  { screen: "newrec", url: U_NEW, scroll: 280, caption: "Check it, then Create", detail: "Add tags (wallet, glovebox, safe) or notes. The expiry date becomes a reminder.", focus: { x: 900, y: 800, scale: 1.2 }, ring: pad(NR.create), click: mid(NR.create), duration: 6000 },
  // Header and round buttons
  { screen: "dfabs", url: U_DOCS, caption: "Ask TAL AI, reminders and your account", detail: "TAL AI is your built-in guide. The bell opens Reminders. Your name opens the account menu.", focus: { x: 1000, y: 200, scale: 1.55 }, ring: { x: ASK.x, y: ASK.y, w: USER.x + USER.w - ASK.x, h: 40 }, duration: 6000 },
  { screen: "dfabs", url: U_DOCS, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 1080, y: 640, scale: 1.8 }, ring: { x: FAB_R - 128, y: FAB_Y, w: 128, h: 56 }, click: { x: FAB_R - 100, y: FAB_Y + 28 }, duration: 7000 },
]

// ═════════════════════════════════════════════════════════════════════════════
// PHONE (390 x 844)
// ═════════════════════════════════════════════════════════════════════════════

const PW = 390
const P_FAB_Y = 764
const P_FAB_R = 366
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
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
      <Box x={218} y={56} w={40} h={40} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box x={262} y={58} w={64} h={40} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
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

// ── Documents on a phone (single column; the actions wrap under each file) ───

const pIn = (k: number) => ({ x: 24, y: 264 + k * 72 + 20, w: 342, h: 40 })
const P = {
  crumb: { x: 8, y: 116, w: 80, h: 20 },
  form: { x: 8, y: 248, w: 374, h: 576 },
  search: pIn(0), category: pIn(1), folder: pIn(2), entry: pIn(3), type: pIn(4), added: pIn(5), expiry: pIn(6),
  apply: { x: 268, y: 768, w: 98, h: 40 },
  clear: { x: 132, y: 768, w: 128, h: 40 },
  count: { x: 8, y: 840, w: 300, h: 20 },
}
const P_LIST_Y = 872, P_ROW = 204
const pRow = (n: number): Rect => ({ x: 8, y: P_LIST_Y + n * P_ROW, w: 374, h: P_ROW })
const pActs = (n: number, busy?: Act) => actRects(true, 24, pRow(n).y + 112, 342, busy)
const pName = (n: number) => ({ x: 72, y: pRow(n).y + 12, w: 260, h: 28 })
const pFolder = (n: number, w = 200) => ({ x: 70, y: pRow(n).y + 78, w, h: 20 })
const pScrollRow = (n: number) => pRow(n).y - 300
const pDocsH = (m: Mode) => P_LIST_Y + rowsOf(m).length * P_ROW + 40

function PDocs({ mode = "all", typing, open, busy, dlg, dlgFile, oy = 0 }: PageProps) {
  const rows = rowsOf(mode)
  return (
    <PPage h={Math.max(pDocsH(mode), oy + 844)}>
      <Box x={8} y={116} w={300} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Dashboard</span><span className="opacity-50">/</span><span>Documents</span></Box>
      <Box x={8} y={144} w={374} h={36} className="font-display text-3xl">Documents</Box>
      <Box x={8} y={184} w={374} h={40} className="text-sm leading-5 text-tal-plum-soft">Every file you&apos;ve uploaded, in one calm library. Filter by folder, entry, type or date.</Box>
      <FilterForm phone mode={mode} typing={typing} open={open} />
      <Box {...P.count} className="text-sm text-tal-plum-soft">{rows.length} of {DOCS.length} documents</Box>
      <Box x={8} y={P_LIST_Y} w={374} h={rows.length * P_ROW} className="divide-y divide-tal-line overflow-hidden rounded-2xl border border-tal-line bg-white">
        {rows.map((d) => <div key={d.name} style={{ height: P_ROW }} />)}
      </Box>
      {rows.map((d, n) => <DocRow key={d.name} d={d} r={pRow(n)} phone busy={busy?.row === n ? busy.a : undefined} />)}
      {dlg && <Dialog k={dlg} phone oy={oy} filename={dlgFile ?? ""} />}
    </PPage>
  )
}
function PRecord() {
  return (
    <PPage>
      <Box x={8} y={120} w={374} h={20} className="flex items-center gap-1.5 truncate text-sm text-tal-plum-soft"><span>Records</span><span className="opacity-60">›</span><span>Admin &amp; Bookkeeping</span><span className="opacity-60">›</span></Box>
      <Box x={8} y={146} w={374} h={40} className="font-display text-2xl leading-tight">{REC_TITLE}</Box>
      <Box x={8} y={192} w={110} h={26} className="flex items-center justify-center rounded-full bg-amber-100 text-xs text-amber-800">Expiring soon</Box>
      <RecFields x={8} y0={236} w={374} phone />
    </PPage>
  )
}
const PF = folderLayout(true, {})
const PF_SCAN_Y = Math.max(0, PF.top.y - 40)

const P_SCREENS: Record<string, ReactNode> = {
  docs: <PDocs />,
  ptyping: <PDocs typing />,
  psearch: <PDocs mode="search" />,
  pcat: <PDocs open="category" />,
  pfolder: <PDocs mode="admin" open="folder" />,
  pentry: <PDocs mode="admin" open="entry" />,
  ptype: <PDocs mode="admin" open="type" />,
  pexpiry: <PDocs mode="expiry" />,
  pview: <Viewer phone />,
  pviewshare: <Viewer phone share />,
  pdown: <PDocs busy={{ row: D_BILL, a: "Download" }} />,
  pprint: <PDocs busy={{ row: D_BILL, a: "Print" }} />,
  pshare: <PDocs dlg="share" dlgFile={DOCS[D_BILL].name} oy={pScrollRow(D_BILL)} />,
  psent: <PDocs dlg="sent" dlgFile={DOCS[D_BILL].name} oy={pScrollRow(D_BILL)} />,
  preplace: <PDocs busy={{ row: D_BILL, a: "Replace" }} />,
  prelink: <PDocs dlg="relink" dlgFile={DOCS[D_BUDGET].name} oy={pScrollRow(D_BUDGET)} />,
  prelinked: <PDocs mode="relinked" />,
  pdelete: <PDocs dlg="delete" dlgFile={DOCS[D_BILL].name} oy={pScrollRow(D_BILL)} />,
  record: <PRecord />,
  folder: <PPage h={PF.h}><FolderBody phone o={{}} /></PPage>,
  fscanning: <PPage h={PF.h}><FolderBody phone o={{ scanning: true }} /></PPage>,
  fscanned: <PPage h={PF.h}><FolderBody phone o={{ scanned: true }} /></PPage>,
  fabs: <PPage fabs><Box x={8} y={116} w={300} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft"><span>Dashboard</span><span className="opacity-50">/</span><span>Documents</span></Box><Box x={8} y={144} w={374} h={36} className="font-display text-3xl">Documents</Box><Box x={8} y={184} w={374} h={40} className="text-sm leading-5 text-tal-plum-soft">Every file you&apos;ve uploaded, in one calm library. Filter by folder, entry, type or date.</Box><FilterForm phone mode="all" /></PPage>,
}

const pBill = pActs(D_BILL)
const sBill = pScrollRow(D_BILL)
const sBudget = pScrollRow(D_BUDGET)
const sWar = pScrollRow(D_WARRANTY)
const P_STEPS: WalkStep[] = [
  { screen: "docs", url: U_DOCS, caption: "Documents", detail: "Every file anyone in the family has uploaded, in one calm library - whichever folder it went into. Open it from ☰.", focus: { x: 195, y: 300, scale: 1.02 }, ring: pad({ x: 8, y: 144, w: 374, h: 80 }), duration: 6000 },
  { screen: "docs", url: U_DOCS, caption: "Back to the dashboard", detail: "Dashboard at the top takes you home. Below are the filters - fill in any and tap Apply.", focus: { x: 150, y: 200, scale: 1.6 }, ring: pad(P.crumb), duration: 5000 },
  { screen: "ptyping", url: U_DOCS, caption: "Search", detail: "Part of a filename, a folder, a linked entry or a person's name. Here: \"insurance\".", focus: { x: 195, y: 300, scale: 1.4 }, ring: pad(P.search), duration: 5500 },
  { screen: "ptyping", url: U_DOCS, scroll: 300, caption: "Apply", detail: "Nothing changes until you tap Apply - so you can set several filters first.", focus: { x: 300, y: 780, scale: 1.5 }, ring: pad(P.apply), click: mid(P.apply), duration: 4500 },
  { screen: "psearch", url: U_SEARCH, scroll: 740, caption: "2 of 7 documents", detail: "The home insurance policy and the RAV4 certificate - each with its expiry date, because it's linked to an entry that has one.", focus: { x: 195, y: 1150, scale: 1.02 }, ring: { x: 4, y: P.count.y - 4, w: 382, h: 2 * P_ROW + 40 }, duration: 7000 },
  { screen: "psearch", url: U_SEARCH, scroll: 740, caption: "Tap the linked entry", detail: "The second link on a row is the Organiser entry the file belongs to.", focus: { x: 195, y: pRow(0).y + 90, scale: 1.6 }, ring: pad({ x: 186, y: pRow(0).y + 78, w: 160, h: 20 }), click: { x: 266, y: pRow(0).y + 88 }, duration: 5000 },
  { screen: "record", url: U_REC, caption: "Home & contents insurance", detail: "The entry itself: title, expiry date (Expiring soon), tags and notes. Change the date when it renews and Save changes.", focus: { x: 195, y: 420, scale: 1.05 }, ring: pad({ x: 8, y: 320, w: 374, h: 68 }), duration: 7000 },
  { screen: "psearch", url: U_SEARCH, scroll: 300, caption: "Clear filters", detail: "Shows once any filter is on. One tap and you're back to everything.", focus: { x: 195, y: 780, scale: 1.5 }, ring: pad(P.clear), click: mid(P.clear), duration: 5000 },
  { screen: "pcat", url: U_DOCS, scroll: 120, caption: "Category", detail: "Personal, Health, Education, Employment or Admin & Bookkeeping. Choose Admin & Bookkeeping and Apply.", focus: { x: 195, y: 520, scale: 1.1 }, ring: pad(P.category), click: { x: 160, y: P.category.y + 44 + 5 * 40 + 24 }, duration: 6000 },
  { screen: "pfolder", url: U_ADMIN, scroll: 180, caption: "Folder", detail: "Now lists that category's folders - Bank Statements, Loans, Home Insurance and the rest.", focus: { x: 195, y: 600, scale: 1.05 }, ring: pad(P.folder), duration: 6000 },
  { screen: "pentry", url: U_ADMIN, scroll: 250, caption: "Linked entry", detail: "Just the files attached to one Organiser entry.", focus: { x: 195, y: 620, scale: 1.2 }, ring: pad(P.entry), duration: 5000 },
  { screen: "ptype", url: U_ADMIN, scroll: 320, caption: "Document type", detail: "PDF, Image (photos and scans) or Other (spreadsheets, Word files and so on).", focus: { x: 195, y: 680, scale: 1.2 }, ring: pad(P.type), duration: 5000 },
  { screen: "pexpiry", url: U_EXPIRY, scroll: 360, caption: "Date added and Expiry date", detail: "From and to. Expiring 1-31 December finds the home and RAV4 insurance - both renew next month.", focus: { x: 195, y: 700, scale: 1.25 }, ring: pad(span(P.added, P.expiry)), duration: 7000 },
  // The list
  { screen: "docs", url: U_DOCS, scroll: 800, caption: "7 of 7 documents", detail: "Newest first. The tag shows the type: red PDF, blue IMAGE, grey OTHER.", focus: { x: 195, y: 1200, scale: 1.02 }, ring: { x: 4, y: P.count.y - 4, w: 382, h: P_ROW * 2 + 40 }, duration: 6000 },
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "What each row tells you", detail: "Size, date added, expiry (if it's linked to an entry with one) and whose it is - James's October power bill, in Electricity & Gas Bills.", focus: { x: 195, y: pRow(0).y + 56, scale: 1.5 }, ring: { x: 20, y: pRow(0).y + 10, w: 350, h: 92 }, duration: 6500 },
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "Tap the name to open it", detail: "It opens right here - no download needed.", focus: { x: 195, y: pRow(0).y + 30, scale: 1.6 }, ring: pad(pName(0)), click: mid(pName(0)), duration: 4500 },
  { screen: "pview", url: U_DOCS, caption: "The viewer", detail: "On a phone or iPad, PDFs are drawn page by page so every page shows. Photos open full size.", focus: { x: 195, y: 420, scale: 1.02 }, duration: 6000 },
  { screen: "pview", url: U_DOCS, caption: "Download, Share, Close", detail: "Save a copy, email it, or close the viewer - icons in the top bar.", focus: { x: 290, y: 120, scale: 1.8 }, ring: pad(span(PV_BAR.download, PV_BAR.close)), click: mid(PV_BAR.share), duration: 5500 },
  { screen: "pviewshare", url: U_DOCS, caption: "Share by email - from the viewer", detail: "The same form as the Share button on each row.", focus: { x: 195, y: 420, scale: 1.1 }, ring: dlgRect("share", true, 0), duration: 5500 },
  // Row actions
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "Buttons under every file", detail: "View, Download, Print, Share - then Replace, Relink and Delete.", focus: { x: 195, y: pRow(0).y + 150, scale: 1.5 }, ring: pad(span(pBill.View, pBill.Delete)), duration: 5500 },
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "View", detail: "Opens the same viewer as tapping the name.", focus: { x: 120, y: pRow(0).y + 150, scale: 1.8 }, ring: pad(pBill.View), click: mid(pBill.View), duration: 4000 },
  { screen: "pdown", url: U_DOCS, scroll: sBill, caption: "Download", detail: "On an iPhone or iPad: Save to Files.", focus: { x: 150, y: pRow(0).y + 150, scale: 1.8 }, ring: pad(pActs(D_BILL, "Download").Download), click: mid(pActs(D_BILL, "Download").Download), duration: 4500 },
  { screen: "pprint", url: U_DOCS, scroll: sBill, caption: "Print", detail: "The original, exactly as uploaded. On a phone the share sheet opens - choose Print.", focus: { x: 220, y: pRow(0).y + 150, scale: 1.8 }, ring: pad(pActs(D_BILL, "Print").Print), click: mid(pActs(D_BILL, "Print").Print), duration: 5000 },
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "Share", detail: "Emails the document to anyone.", focus: { x: 280, y: pRow(0).y + 150, scale: 1.8 }, ring: pad(pBill.Share), click: mid(pBill.Share), duration: 4000 },
  { screen: "pshare", url: U_DOCS, scroll: sBill, caption: "Recipient and a message", detail: "Sarah sends the power bill to her sister Emma. It goes with Sarah's name on it; replies come to Sarah.", focus: { x: 195, y: sBill + 422, scale: 1.05 }, ring: dlgRect("share", true, sBill), click: mid(dlgMain("share", dlgRect("share", true, sBill))), duration: 9000 },
  { screen: "psent", url: U_DOCS, scroll: sBill, caption: "Sent", detail: "The document is attached. Too big? Emma gets a private link that works for 7 days.", focus: { x: 195, y: sBill + 422, scale: 1.15 }, ring: dlgRect("sent", true, sBill), click: mid(dlgMain("sent", dlgRect("sent", true, sBill))), duration: 6000 },
  { screen: "preplace", url: U_DOCS, scroll: sBill, caption: "Replace", detail: "Pick a newer file and it takes this one's place - same folder, same entry.", focus: { x: 120, y: pRow(0).y + 166, scale: 1.8 }, ring: pad(pActs(D_BILL, "Replace").Replace), click: mid(pActs(D_BILL, "Replace").Replace), duration: 5000 },
  { screen: "docs", url: U_DOCS, scroll: sBudget, caption: "Not linked to a folder?", detail: "The family budget isn't in a folder yet. Relink moves it.", focus: { x: 195, y: pRow(D_BUDGET).y + 120, scale: 1.35 }, ring: pad(span(pFolder(D_BUDGET, 150), pActs(D_BUDGET).Relink)), click: mid(pActs(D_BUDGET).Relink), duration: 5500 },
  { screen: "prelink", url: U_DOCS, scroll: sBudget, caption: "Move this document", detail: "Type the folder (admin.budgets is Budgets), and an entry if you like. The file stays the same.", focus: { x: 195, y: sBudget + 422, scale: 1.05 }, ring: dlgRect("relink", true, sBudget), click: mid(dlgMain("relink", dlgRect("relink", true, sBudget))), duration: 7500 },
  { screen: "prelinked", url: U_DOCS, scroll: sBudget, caption: "Now it's in Budgets", detail: "Tap the folder name on any row to open that folder.", focus: { x: 195, y: pRow(D_BUDGET).y + 88, scale: 1.6 }, ring: pad(pFolder(D_BUDGET, 70)), duration: 5000 },
  { screen: "docs", url: U_DOCS, scroll: sBill, caption: "Delete", detail: "Asks first.", focus: { x: 210, y: pRow(0).y + 166, scale: 1.8 }, ring: pad(pBill.Delete), click: mid(pBill.Delete), duration: 4000 },
  { screen: "pdelete", url: U_DOCS, scroll: sBill, caption: "Delete this document?", detail: "The file goes for good, but the Organiser entry stays. Cancel if you change your mind.", focus: { x: 195, y: sBill + 422, scale: 1.2 }, ring: dlgRect("delete", true, sBill), duration: 6000 },
  // The folder, and scanning
  { screen: "docs", url: U_DOCS, scroll: sWar, caption: "Open the folder it's in", detail: "The fridge warranty is in Warranties on devices & tools.", focus: { x: 195, y: pRow(D_WARRANTY).y + 88, scale: 1.6 }, ring: pad(pFolder(D_WARRANTY, 190)), click: mid(pFolder(D_WARRANTY, 190)), duration: 4500 },
  { screen: "folder", url: U_FOLDER, caption: "Warranties on devices & tools", detail: "Sarah's warranties. The person button switches to James's, Mia's or Leo's.", focus: { x: 195, y: 240, scale: 1.2 }, ring: pad(span(PF.picker, PF.head)), duration: 6000 },
  { screen: "folder", url: U_FOLDER, scroll: PF_SCAN_Y, caption: "The folder's own questions", detail: "Warranty document, Receipt, Item, Date of purchase and Amount paid. Item is required, so it isn't complete yet.", focus: { x: 195, y: PF.card.y + 160, scale: 1.02 }, ring: pad(span(PF.note, { ...PF.card, h: 320 })), duration: 7000 },
  { screen: "folder", url: U_FOLDER, scroll: PF.docsHead.y - 200, caption: "Documents: Take photo or Upload", detail: "Take photo opens your camera; Upload Document picks a file or photo you already have.", focus: { x: 195, y: PF.docsHead.y + 80, scale: 1.3 }, ring: pad(span(PF.docsHead, PF.uploadDoc)), duration: 6000 },
  { screen: "folder", url: U_FOLDER, scroll: PF.docsHead.y - 200, caption: "✨ Scan - have AI read it", detail: "Reads the document and fills in the details. The first time, it asks before sending anything to AI.", focus: { x: 195, y: PF.fileRow(0).y + 80, scale: 1.4 }, ring: pad(PF.fileBtns(0)[0]), click: mid(PF.fileBtns(0)[0]), duration: 5500 },
  { screen: "fscanning", url: U_FOLDER, scroll: PF.docsHead.y - 200, caption: "Scanning…", detail: "A few seconds while AI reads the warranty.", focus: { x: 195, y: PF.fileRow(0).y + 80, scale: 1.4 }, ring: pad(PF.fileBtns(0)[0]), duration: 3500 },
  { screen: "fscanned", url: U_FOLDER, scroll: PF_SCAN_Y, caption: "AI filled 3 fields", detail: "Item, date of purchase and amount paid - and the warranty is attached. Check them, then Save.", focus: { x: 195, y: PF.card.y + 200, scale: 1.02 }, ring: pad(span(PF.note, { ...PF.card, h: 380 })), duration: 8000 },
  { screen: "fscanned", url: U_FOLDER, scroll: PF.save.y - 500, caption: "Save", detail: "The folder turns green once Item is filled. + Add another for the next warranty.", focus: { x: 195, y: PF.save.y, scale: 1.4 }, ring: pad(span(PF.save, PF.addAnother)), click: mid(PF.save), duration: 5500 },
  // Header and round buttons
  { screen: "fabs", url: U_DOCS, caption: "TAL AI, reminders, account and menu", detail: "TAL AI is your built-in guide. The bell opens Reminders, your picture opens the account menu, and ☰ opens every other page.", focus: { x: 250, y: 160, scale: 1.6 }, ring: { x: P_ASK.x - 4, y: 54, w: P_MENU.x + P_MENU.w - P_ASK.x + 8, h: 48 }, duration: 6500 },
  { screen: "fabs", url: U_DOCS, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: { x: 300, y: 780, scale: 1.5 }, ring: { x: P_FAB_R - 128, y: P_FAB_Y, w: 128, h: 56 }, click: { x: P_FAB_R - 100, y: P_FAB_Y + 28 }, duration: 7000 },
]

export default function DocumentsPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer music="/audio/upbeat-music.mp3" key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "Documents (phone)" : "Documents (computer)"} url={U_DOCS} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Documents", subtitle: "Every file the family has uploaded, in one calm library" }} />
  )
}
