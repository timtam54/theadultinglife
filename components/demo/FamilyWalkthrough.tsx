"use client"

// "Your family, all in one place" walkthrough (browser) for the public /demo
// page: hand-built copies of the real screens with a made-up family's sample
// data (the Taylors, Brisbane) - no sign-in, no API calls. Family Members folder
// (components/FamilyUsersPanel: "+ Add user" -> "Add user to family") -> the
// Organiser (app/(app)/records) -> a section's matrix (components/CategoryMatrix)
// -> a family member's folder with the person picker (components/UserPicker).
// Sidebar / header copy app/(app)/layout.tsx and components/AppSidebar.tsx.
// Positions are canvas px (1200 x 760, see WalkthroughPlayer).
// If one of those pages changes, update the matching screen here.

import type { ReactNode } from "react"
import {
  Bell, BookOpen, CheckSquare, Compass, CreditCard, FileText, FolderOpen, Heart, Home, Map as MapIcon, Receipt, Settings, Siren, Sparkles,
} from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

const Box = ({ x, y, w, h, children, className = "" }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h }}>{children}</div>
)
const Img = ({ src, x, y, size, className = "rounded-xl" }: { src: string; x: number; y: number; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute bg-white object-cover ${className}`} style={{ left: x, top: y, width: size, height: size }} />
)

// ── Shell: sidebar + header (AppSidebar / (app)/layout) ──────────────────────

const NAV = [
  { t: "Dashboard", i: Home }, { t: "Setup guide", i: Compass }, { t: "The Adulting Life Organiser", i: FolderOpen },
  { t: "Documents", i: FileText }, { t: "Receipts", i: Receipt, badge: "New" }, { t: "Peace of Mind Planner", i: Heart },
  { t: "Learn", i: BookOpen, badge: "New" }, { t: "TAL AI", i: Sparkles }, { t: "Tasks", i: CheckSquare },
  { t: "Reminders", i: Bell }, { t: "Emergency", i: Siren }, { t: "Settings", i: Settings }, { t: "Subscription", i: CreditCard }, { t: "Maps", i: MapIcon },
]
const L = 272 // left edge of the page content
const CW = 896 // content width
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-tal-cream-soft font-sans text-tal-plum">
      <Box x={0} y={0} w={240} h={760} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={84} y={18} size={72} />
      <Box x={0} y={98} w={240} h={40} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.</Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={146 + k * 43} w={216} h={38}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === 2 ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <n.i className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-black">{n.badge}</span>}
        </Box>
      ))}
      <Box x={240} y={0} w={960} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box x={264} y={12} w={340} h={40} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-4 text-sm text-tal-plum-soft">⌕ Search your organiser</Box>
      <Box x={614} y={12} w={84} h={40} className="flex items-center justify-center rounded-full border border-tal-line bg-white text-sm font-medium">+ Add</Box>
      <Box x={866} y={12} w={128} h={40} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><Sparkles className="h-4 w-4" />Ask TAL AI</Box>
      <Box x={1004} y={12} w={40} h={40} className="flex items-center justify-center"><Bell className="h-5 w-5" /></Box>
      <Box x={1050} y={14} w={130} h={36} className="flex items-center gap-2 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-tal-cream font-medium">S</span>Hi Sarah <span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
    </div>
  )
}
const Crumbs = ({ children }: { children: ReactNode }) => <Box x={L} y={78} w={CW} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft">{children}</Box>
const FolderHeader = ({ thumb, title, hint }: { thumb: string; title: string; hint?: string }) => (
  <>
    <Box x={L} y={108} w={CW} h={72} className="rounded-2xl bg-black shadow-md" />
    <Img src={thumb} x={L + 20} y={120} size={48} className="rounded-xl ring-2 ring-white/20" />
    <Box x={L + 84} y={124} w={600} h={44} className="text-white"><p className="font-display text-2xl leading-tight">{title}</p>{hint && <p className="mt-0.5 truncate text-xs text-white/70">{hint}</p>}</Box>
  </>
)

// ── 1. Family Members folder (FamilyUsersPanel) ──────────────────────────────

type Person = { name: string; kind: "adult" | "child"; email?: string; primary?: boolean }
const SARAH: Person = { name: "Sarah Taylor", kind: "adult", email: "sarah.taylor@example.com", primary: true }
const JAMES: Person = { name: "James Taylor", kind: "adult", email: "james.taylor@example.com" }
const MIA: Person = { name: "Mia Taylor", kind: "child" }
const LEO: Person = { name: "Leo Taylor", kind: "child" }
const rowY = (n: number) => 300 + n * 68
function Family({ people, done }: { people: Person[]; done?: boolean }) {
  const promptY = rowY(people.length) + 8
  return (
    <Shell>
      <Crumbs><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span></Crumbs>
      <FolderHeader thumb="/thumbnails/subcategories/personal.family_contacts.png" title="Family Members" hint="Everyone you're organising for - partner, kids and anyone else." />
      <Box x={L} y={202} w={640} h={86}>
        <p className="font-display">People in this family</p>
        <p className="mt-1 text-sm text-tal-plum-soft">Add the people who are important in your life, along with their key personal details. This could include your partner, children or other family members.</p>
      </Box>
      <Box x={L + CW - 340} y={202} w={130} h={36} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm">Download PDF</Box>
      <Box x={L + CW - 202} y={202} w={94} h={36} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm">Share PDF</Box>
      <Box x={L + CW - 100} y={202} w={100} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">+ Add user</Box>
      {people.map((p, n) => (
        <Box key={p.name} x={L} y={rowY(n)} w={CW} h={60} className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4">
          <div>
            <p className="font-medium">{p.name}{p.primary && <span className="ml-2 rounded bg-tal-cream-soft px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Primary login</span>}</p>
            <p className="mt-0.5 text-xs text-tal-plum-soft">{p.kind}{p.email ? ` · ${p.email}` : ""}</p>
          </div>
          <span className="text-tal-plum-soft">›</span>
        </Box>
      ))}
      {done ? (
        <Box x={L} y={promptY} w={CW} h={52} className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50/60 px-4 text-sm">
          You&apos;ve marked your family list as complete.<span className="rounded-xl px-3 py-1">Undo</span>
        </Box>
      ) : (
        <>
          <Box x={L} y={promptY} w={CW} h={88} className="rounded-xl border border-tal-line bg-tal-cream-soft p-4 text-sm">
            {people.length === 1 ? "Is it just you in your family? Or do you have more members to add?" : "Have you added everyone in your family? Or are there more members to add?"}
          </Box>
          <Box x={L + 16} y={promptY + 40} w={190} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">{people.length === 1 ? "Yes, just me" : "Yes, everyone is added"}</Box>
          <Box x={L + 214} y={promptY + 40} w={140} h={36} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">No, add another</Box>
        </>
      )}
    </Shell>
  )
}

// "Add user to family" pop-up
const MX = 240, MY = 34, MW = 720
const Field = ({ y, label, value, hint, placeholder }: { y: number; label: string; value?: string; hint?: string; placeholder?: string }) => (
  <>
    <Box x={MX + 24} y={MY + y} w={MW - 48} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">{label}</Box>
    <Box x={MX + 24} y={MY + y + 18} w={MW - 48} h={44} className={`flex items-center rounded-xl border border-tal-line bg-white px-3 text-sm ${value ? "" : "text-tal-plum-soft/60"}`}>{value ?? placeholder}</Box>
    {hint && <Box x={MX + 24} y={MY + y + 66} w={MW - 48} h={32} className="text-xs leading-snug text-tal-plum-soft">{hint}</Box>}
  </>
)
function AddUser({ p, birthday, people }: { p: Person; birthday: string; people: Person[] }) {
  const [first, last] = p.name.split(" ")
  return (
    <>
      <Family people={people} />
      <div className="absolute inset-0 bg-black/40" />
      <Box x={MX} y={MY} w={MW} h={692} className="rounded-2xl bg-white shadow-lg" />
      <Box x={MX} y={MY} w={MW} h={64} className="border-b border-tal-line px-6 pt-5 font-display text-lg">Add user to family</Box>
      <Box x={MX + MW - 52} y={MY + 16} w={32} h={32} className="flex items-center justify-center text-tal-plum-soft">✕</Box>
      <Field y={80} label="First name" value={first} hint="Use the name that matches this person's official ID (passport, driver's licence, birth certificate). Nicknames can be added later on individual forms if needed." />
      <Field y={196} label="Last name" value={last} />
      <Field y={270} label="Birthday" value={birthday} />
      <Box x={MX + 24} y={MY + 344} w={MW - 48} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Kind</Box>
      {(["adult", "child"] as const).map((k, n) => (
        <Box key={k} x={MX + 24 + n * 340} y={MY + 362} w={332} h={44}
          className={`flex items-center justify-center rounded-xl border text-sm font-medium ${p.kind === k ? "border-tal-plum bg-tal-plum text-white shadow-sm" : "border-tal-line bg-white"}`}>
          {k === "adult" ? "Adult" : "Child"}
          <span className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white ${p.kind === k ? "bg-white text-tal-plum" : "bg-tal-plum text-white"}`}>i</span>
        </Box>
      ))}
      <Box x={MX + 24} y={MY + 412} w={MW - 48} h={18} className="text-xs text-tal-plum-soft">ⓘ Calculated from birthday · tap the other option to override.</Box>
      <Field y={440} label="Email (optional — for later login)" value={p.email} placeholder="jane@example.com" />
      <Box x={MX + 24} y={MY + 520} w={MW - 48} h={1} className="bg-tal-line" />
      <Box x={MX + 24} y={MY + 534} w={MW - 48} h={16} className="text-[10px] font-semibold uppercase tracking-widest text-tal-plum-soft">Profile details <span className="font-normal normal-case tracking-normal">— used to pre-fill forms across the app</span></Box>
      <Box x={MX + 24} y={MY + 558} w={332} h={44} className="flex items-center rounded-xl border border-tal-line px-3 text-sm text-tal-plum-soft/60">Mobile phone</Box>
      <Box x={MX + 364} y={MY + 558} w={332} h={44} className="flex items-center rounded-xl border border-tal-line px-3 text-sm text-tal-plum-soft/60">Home phone</Box>
      <Box x={MX} y={MY + 624} w={MW} h={68} className="rounded-b-2xl border-t border-tal-line bg-white" />
      <Box x={MX + MW - 190} y={MY + 640} w={80} h={36} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>
      <Box x={MX + MW - 100} y={MY + 640} w={76} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </>
  )
}

// ── 2. The Organiser (records/page) ──────────────────────────────────────────

const CATS = [
  { id: "personal", t: "Personal", d: "IDs, birth certificates, wills and important personal information.", done: 6, total: 22, tone: "bg-violet-50 ring-violet-100", bar: "bg-violet-500", pill: "bg-violet-100 text-violet-800" },
  { id: "health", t: "Health", d: "Medical records, health insurance, medications and doctors.", done: 4, total: 17, tone: "bg-amber-50 ring-amber-100", bar: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { id: "education", t: "Education", d: "Certificates, transcripts, resumes and study records.", done: 2, total: 9, tone: "bg-sky-50 ring-sky-100", bar: "bg-sky-500", pill: "bg-sky-100 text-sky-800" },
  { id: "employment", t: "Employment", d: "Work contracts, tax details, super and payslips.", done: 3, total: 8, tone: "bg-rose-50 ring-rose-100", bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800" },
  { id: "admin", t: "Admin & Bookkeeping", d: "Finances, accounts, utility bills, insurance and paperwork.", done: 7, total: 21, tone: "bg-emerald-50 ring-emerald-100", bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-800" },
]
const catX = (n: number) => L + (n % 3) * 304
const catY = (n: number) => 176 + Math.floor(n / 3) * 166
function Organiser() {
  return (
    <Shell>
      <Img src="/thumbnails/dashboard/records-documents.png" x={L} y={82} size={36} />
      <Box x={L + 46} y={80} w={560} h={32} className="font-display text-2xl leading-tight">The Adulting Life Organiser</Box>
      <Box x={L + 46} y={110} w={560} h={20} className="text-sm text-tal-plum-soft">All your important information, organised in one place.</Box>
      <Box x={L + CW - 268} y={82} w={150} h={36} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-sm text-tal-plum-soft">⌕ Search records</Box>
      <Box x={L + CW - 110} y={82} w={110} h={36} className="flex items-center justify-center rounded-lg bg-black text-sm font-medium text-white">+ Add Record</Box>
      <Box x={L} y={140} w={400} h={28} className="font-display text-xl">Choose a category</Box>
      {CATS.map((c, n) => {
        const pct = Math.round((c.done / c.total) * 100)
        return (
          <Box key={c.id} x={catX(n)} y={catY(n)} w={288} h={150} className={`flex flex-col rounded-2xl p-5 ring-1 ${c.tone}`}>
            <div className="mb-3 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/thumbnails/categories/${c.id}.png`} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
              <div className="min-w-0"><p className="font-display text-lg leading-tight">{c.t}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{c.d}</p></div>
            </div>
            <div className="mt-auto">
              <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-tal-plum-soft">{c.done} of {c.total} folders complete</span><span className={`rounded-full px-2 py-0.5 font-medium ${c.pill}`}>{pct}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} /></div>
            </div>
          </Box>
        )
      })}
      {[
        { v: "5 Categories", s: "Organised for you", c: "bg-violet-50 ring-violet-100" },
        { v: "22 of 77 folders", s: "14 in progress", c: "bg-sky-50 ring-sky-100" },
        { v: "Secure & private", s: "Only you can access", c: "bg-emerald-50 ring-emerald-100" },
        { v: "Always backed up", s: "Your data is safe", c: "bg-amber-50 ring-amber-100" },
      ].map((s, n) => (
        <Box key={s.v} x={L + n * 228} y={516} w={212} h={66} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${s.c}`}>
          <span className="h-10 w-10 shrink-0 rounded-xl bg-white/70" />
          <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-tight">{s.v}</p><p className="mt-0.5 text-[11px] text-tal-plum-soft">{s.s}</p></div><span className="text-tal-plum-soft/70">→</span>
        </Box>
      ))}
      <Box x={L} y={604} w={CW} h={64} className="flex items-center gap-4 rounded-2xl border border-tal-line bg-tal-cream-soft px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">?</span>
        <div className="flex-1"><p className="font-medium">New to The Adulting Life Organiser?</p><p className="text-xs text-tal-plum-soft">Not sure where to start? We can help.</p></div>
        <span className="rounded-lg border border-tal-line bg-white px-3 py-1.5 text-sm">Getting Started Guide →</span>
      </Box>
    </Shell>
  )
}

// ── 3. Personal - the matrix (CategoryMatrix) ────────────────────────────────

type Cell = "done" | "started" | "empty" | "na"
const PEOPLE = [
  { n: "Sarah Taylor", k: "adult · primary" }, { n: "James Taylor", k: "adult" }, { n: "Mia Taylor", k: "child" }, { n: "Leo Taylor", k: "child" },
]
const ROWS: { name: string; thumb: string; cells?: Cell[]; family?: boolean; users?: boolean; planner?: boolean; ai?: boolean }[] = [
  { name: "Family Members", thumb: "family_contacts", family: true, users: true },
  { name: "Emergency Contacts", thumb: "emergency_contacts", cells: ["done", "done", "started", "started"], planner: true },
  { name: "Birth Certificates", thumb: "birth_certificates", cells: ["done", "done", "done", "done"], planner: true },
  { name: "Passport & Travel Documents", thumb: "passport_travel", cells: ["started", "done", "empty", "empty"] },
  { name: "Travel Documents", thumb: "passport_travel", cells: ["empty", "empty", "empty", "empty"] },
  { name: "Driver's Licence", thumb: "drivers_licence", cells: ["done", "done", "na", "na"] },
  { name: "Marriage Certificate", thumb: "marriage_certificate", cells: ["done", "done", "na", "na"], planner: true },
  { name: "Electoral Roll Number & Registered Address", thumb: "electoral_roll", cells: ["done", "done", "na", "na"] },
  { name: "Will & Funeral Instructions", thumb: "will_funeral", cells: ["started", "empty", "na", "na"], planner: true },
  { name: "Power of Attorney Details", thumb: "power_of_attorney", cells: ["empty", "empty", "na", "na"], planner: true },
  { name: "Custom — Device Access Details", thumb: "device_access", cells: ["done", "started", "empty", "empty"], planner: true },
]
const COL_AI = L + 380, COL_PL = L + 430, COL_U = L + 510, UW = 96.5
const colX = (u: number) => COL_U + u * UW
const mRowY = (n: number) => 262 + n * 40
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
function Matrix() {
  return (
    <Shell>
      <Crumbs><span>The Adulting Life Organiser</span><span className="opacity-50">/</span><span>Personal</span></Crumbs>
      <Box x={L} y={106} w={CW} h={60} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/thumbnails/categories/personal.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">The Adulting Life Organiser</span>
        <span className="font-display text-2xl">Personal</span>
        <span className="ml-auto inline-flex gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs">
          <span className="rounded-full px-3 py-1.5 text-white/85">List</span><span className="rounded-full px-3 py-1.5 text-white/85">Grid</span><span className="rounded-full bg-white px-3 py-1.5 font-medium text-black">Matrix</span>
        </span>
        <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-black">+ New Folder</span>
      </Box>
      <Box x={L} y={178} w={CW} h={20} className="flex items-center justify-between text-xs text-tal-plum-soft">
        <span className="flex gap-3">
          <span><b className="rounded bg-green-50 px-1 text-green-700">✓</b> complete</span><span><b className="rounded bg-amber-50 px-1 text-amber-700">◐</b> in progress</span>
          <span><b className="rounded bg-red-50 px-1 text-red-700">✗</b> empty</span><span>— not applicable</span><span>♡ shareable in Planner</span><span>✦ AI can help you plan this</span>
        </span>
        <span className="font-medium text-tal-plum">22 folders in this section <span className="text-tal-plum-soft">· scroll for more</span></span>
      </Box>
      <Box x={L} y={206} w={CW} h={540} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={L} y={206} w={CW} h={56} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      <Box x={L + 16} y={226} w={200} h={20} className="text-sm font-medium text-tal-plum-soft">Folder</Box>
      <Box x={COL_AI} y={216} w={50} h={40} className="text-center text-sm font-medium">AI<p className="text-[10px] uppercase tracking-widest text-tal-plum-soft">help</p></Box>
      <Box x={COL_PL} y={216} w={80} h={40} className="text-center text-sm font-medium">Planner<p className="text-[10px] uppercase tracking-widest text-tal-plum-soft">shareable</p></Box>
      {PEOPLE.map((p, u) => (
        <Box key={p.n} x={colX(u)} y={216} w={UW} h={40} className="whitespace-nowrap text-center text-sm font-medium">{p.n}<p className="text-[9px] uppercase tracking-wider text-tal-plum-soft">{p.k}</p></Box>
      ))}
      {ROWS.map((r, n) => (
        <div key={r.name}>
          <Box x={L} y={mRowY(n)} w={CW} h={40} className={n ? "border-t border-tal-line" : ""} />
          <Box x={L + 12} y={mRowY(n)} w={366} h={40} className="flex items-center gap-2 text-sm">
            <span className="w-6 text-right text-xs tabular-nums text-tal-plum-soft">{n + 1}.</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/thumbnails/subcategories/personal.${r.thumb}.png`} alt="" className="h-7 w-7 shrink-0 rounded-md bg-white object-cover ring-1 ring-tal-line" />
            <span className="truncate">{r.name}</span>
            {r.users && <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft">· users</span>}
          </Box>
          <Box x={COL_AI} y={mRowY(n)} w={50} h={40} className="flex items-center justify-center text-violet-600">{r.ai ? "✦" : ""}</Box>
          <Box x={COL_PL} y={mRowY(n)} w={80} h={40} className="flex items-center justify-center">{r.planner ? "♡" : ""}</Box>
          {r.family ? (
            <Box x={COL_U} y={mRowY(n) + 1} w={UW * 4} h={39} className="flex items-center justify-center gap-2 bg-green-50">
              <span className="font-bold text-green-700">✓</span><span className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">· shared with family</span>
            </Box>
          ) : r.cells!.map((c, u) => (
            <Box key={u} x={colX(u)} y={mRowY(n) + 1} w={UW} h={39} className={`flex items-center justify-center ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
          ))}
        </div>
      ))}
    </Shell>
  )
}

// ── 4. A family member's folder (records/[category]/[subcategory] + UserPicker)

const FAM_STATUS = [
  { n: "Sarah Taylor", k: "adult · primary · Started", bg: "bg-amber-50" },
  { n: "James Taylor", k: "adult · Complete", bg: "bg-emerald-50" },
  { n: "Mia Taylor", k: "child", bg: "bg-tal-cream-soft", active: true },
  { n: "Leo Taylor", k: "child", bg: "" },
]
const PICK_X = L + 330
function MiaPassport({ picker }: { picker?: boolean }) {
  return (
    <Shell>
      <Crumbs>
        <span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span><span className="opacity-50">·</span>
      </Crumbs>
      <Box x={PICK_X} y={72} w={150} h={34} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span>Mia Taylor<span className="text-xs">▾</span>
      </Box>
      <Box x={PICK_X + 160} y={80} w={200} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
      <FolderHeader thumb="/thumbnails/subcategories/personal.passport_travel.png" title="Passport & Travel Documents" />
      <Box x={L + CW - 150} y={126} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium text-tal-plum">Export to Excel</Box>
      <Box x={L} y={198} w={CW} h={56} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 px-4 text-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>
        Your passport details, one entry per current + past passport. Attach a scan for easy reference and to speed up applications.
      </Box>
      <Box x={L} y={270} w={CW} h={70} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-900">⚠ 11 required fields still empty</p>
        <p className="mt-0.5 text-xs text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
      </Box>
      <Box x={L} y={358} w={CW} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Passport document</Box>
      <Box x={L} y={378} w={196} h={44} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white shadow-sm">⌗ Upload &amp; scan a file</Box>
      <Box x={L + 206} y={382} w={180} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</Box>
      <Box x={L} y={428} w={CW} h={16} className="text-xs text-tal-plum-soft">Upload a scan or photo of the passport data page (PDF or image).</Box>
      {[
        [["Type*", 2], ["Code of issuing State*", 2], ["Document No.*", 4]],
        [["Family name / Surname*", 8]],
        [["Given names*", 8]],
        [["Date of birth*", 4], ["Sex*", 2]],
      ].map((row, r) => {
        let col = 0
        return row.map(([label, span]) => {
          const x = L + (col / 8) * CW
          col += span as number
          return (
            <Box key={label as string} x={x} y={462 + r * 72} w={((span as number) / 8) * CW - 16} h={64}>
              <p className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">{(label as string).replace("*", "")}<span className="text-red-500">*</span></p>
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
    </Shell>
  )
}

const SCREENS: Record<string, ReactNode> = {
  fam1: <Family people={[SARAH]} />,
  addjames: <AddUser p={JAMES} birthday="12/03/1986" people={[SARAH]} />,
  addmia: <AddUser p={MIA} birthday="21/06/2011" people={[SARAH, JAMES]} />,
  fam4: <Family people={[SARAH, JAMES, MIA, LEO]} />,
  famdone: <Family people={[SARAH, JAMES, MIA, LEO]} done />,
  organiser: <Organiser />,
  matrix: <Matrix />,
  mia: <MiaPassport />,
  miapick: <MiaPassport picker />,
}

const U_FAM = "app.theadultinglife.com.au/records/personal/personal.family_members"
const U_MATRIX = "app.theadultinglife.com.au/records/personal"
const U_MIA = "app.theadultinglife.com.au/records/personal/personal.passport_travel?user=mia"
const passportRow = 3, licenceRow = 5

const STEPS: WalkStep[] = [
  { screen: "fam1", url: U_FAM, caption: "Start with your family", detail: "Organiser → Personal → Family Members. You're already in, as the primary login.",
    focus: { x: 720, y: 300, scale: 1.4 }, ring: { x: L + CW - 100, y: 202, w: 100, h: 36 }, click: { x: L + CW - 50, y: 220 }, duration: 6500 },
  { screen: "addjames", url: U_FAM, caption: "Add your partner", detail: "Name as it is on their ID, birthday, and an email if they'll sign in too.",
    focus: { x: 600, y: 260, scale: 1.35 }, duration: 6500 },
  { screen: "addjames", url: U_FAM, caption: "Adult or child - worked out for you", detail: "From the birthday. Adults get the full profile form; children a simpler one.",
    focus: { x: 600, y: 420, scale: 1.5 }, ring: { x: MX + 24, y: MY + 362, w: MW - 48, h: 70 }, duration: 6500 },
  { screen: "addjames", url: U_FAM, caption: "Save", focus: { x: 800, y: 600, scale: 1.4 }, ring: { x: MX + MW - 100, y: MY + 640, w: 76, h: 36 }, click: { x: MX + MW - 62, y: MY + 658 }, duration: 4500 },
  { screen: "addmia", url: U_FAM, caption: "Then the kids", detail: "Mia is 15 and Leo is 11 - Child is picked from their birthdays. No email needed.",
    focus: { x: 600, y: 420, scale: 1.4 }, ring: { x: MX + 24, y: MY + 270, w: MW - 48, h: 162 }, duration: 6500 },
  { screen: "fam4", url: U_FAM, caption: "The whole family, in one list", detail: "Tap anyone to update their details - they pre-fill forms right across the app.",
    focus: { x: 720, y: 420, scale: 1.25 }, ring: { x: L, y: rowY(0), w: CW, h: 4 * 68 - 8 }, duration: 6000 },
  { screen: "fam4", url: U_FAM, caption: "Everyone's added", focus: { x: 600, y: 600, scale: 1.4 }, ring: { x: L + 16, y: rowY(4) + 48, w: 190, h: 36 }, click: { x: L + 111, y: rowY(4) + 66 }, duration: 4500 },
  { screen: "famdone", url: U_FAM, caption: "Now open the Organiser", detail: "It's in the sidebar.",
    focus: { x: 300, y: 300, scale: 1.4 }, ring: { x: 12, y: 146 + 2 * 43, w: 216, h: 38 }, click: { x: 120, y: 146 + 2 * 43 + 19 }, duration: 4500 },
  { screen: "organiser", url: "app.theadultinglife.com.au/records", caption: "Five sections, for the whole family", detail: "Personal, Health, Education, Employment and Admin - and how far along each one is.",
    focus: { x: 720, y: 330, scale: 1.2 }, ring: { x: catX(0), y: catY(0), w: 288, h: 150 }, click: { x: catX(0) + 144, y: catY(0) + 40 }, duration: 7000 },
  { screen: "matrix", url: U_MATRIX, caption: "Everyone gets their own folders", detail: "One column per person - Sarah, James, Mia and Leo.",
    focus: { x: 940, y: 300, scale: 1.45 }, ring: { x: COL_U, y: 210, w: UW * 4, h: 50 }, duration: 6500 },
  { screen: "matrix", url: U_MATRIX, caption: "Done, started or still to do", detail: "Green is complete, amber is started, red is empty. James's passport is done; the kids' aren't.",
    focus: { x: 800, y: mRowY(passportRow) + 20, scale: 1.4 }, ring: { x: L, y: mRowY(passportRow), w: CW, h: 40 }, duration: 7000 },
  { screen: "matrix", url: U_MATRIX, caption: "Only what applies", detail: "A dash means it doesn't apply yet - a driver's licence is from 16, so not for Mia or Leo.",
    focus: { x: 800, y: mRowY(licenceRow) + 20, scale: 1.4 }, ring: { x: colX(2), y: mRowY(licenceRow), w: UW * 2, h: 40 }, duration: 6500 },
  { screen: "matrix", url: U_MATRIX, caption: "Open anyone's folder in one click", detail: "Click Mia's passport square.",
    focus: { x: 900, y: mRowY(passportRow) + 20, scale: 1.6 }, ring: { x: colX(2), y: mRowY(passportRow), w: UW, h: 40 }, click: { x: colX(2) + UW / 2, y: mRowY(passportRow) + 20 }, duration: 5000 },
  { screen: "mia", url: U_MIA, caption: "Mia's Passport folder", detail: "Same form, just for Mia - and it shows what's still missing. Scan her passport and it fills in.",
    focus: { x: 620, y: 300, scale: 1.25 }, ring: { x: PICK_X, y: 72, w: 150, h: 34 }, duration: 7000 },
  { screen: "miapick", url: U_MIA, caption: "Switch person in one tap", detail: "James's is complete, Sarah's is started - pick anyone to see theirs.",
    focus: { x: 560, y: 220, scale: 1.6 }, ring: { x: PICK_X, y: 112, w: 256, h: 216 }, duration: 6500 },
]

export default function FamilyWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer steps={STEPS} screens={SCREENS} title="Your family, all in one place" autoStart={autoStart} url={U_FAM}
      intro={{ title: "Your family, all in one place", subtitle: "Add your partner and kids - everyone gets their own folders, and you can see what's done at a glance." }} />
  )
}
