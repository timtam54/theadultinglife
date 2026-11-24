"use client"

// "Safe and yours" walkthrough (browser) for the public /demo page: hand-built
// copies of the real screens with the Taylor family's sample data - no sign-in,
// no API calls. The PIN lock (AppLockGate, with Face ID) -> Settings: "Download
// your organiser" (CompleteExportButton / api/export/complete: branded PDF +
// Excel + every document, zipped, link emailed for 24 hours) -> "What you've
// shared" (SharingMatrix, revoke) -> AI and your data -> App PIN and Face ID ->
// Privacy requests and Delete account (DeleteAccountSection, 30 days to change
// your mind) -> Security & Privacy. Canvas 1200 x 760 (see WalkthroughPlayer);
// Settings scrolls. If a real screen changes, update the matching screen here.

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle, ArrowRight, Bell, Bot, CheckCircle2, Cloud, CreditCard, Delete, Download, Eye, FileArchive, FileSpreadsheet, FileText,
  Folder, Home, KeyRound, Lock, Map, Receipt, ScanFace, Send, Settings, ShieldCheck, Sparkles,
} from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

// ── Building blocks ──────────────────────────────────────────────────────────

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)

const NAV: { t: string; i: ReactNode; badge?: string }[] = [
  { t: "Dashboard", i: <Home className="h-[18px] w-[18px]" /> },
  { t: "Setup guide", i: <Sparkles className="h-[18px] w-[18px]" /> },
  { t: "The Adulting Life Organiser", i: <Folder className="h-[18px] w-[18px]" /> },
  { t: "Documents", i: <FileText className="h-[18px] w-[18px]" /> },
  { t: "Receipts", i: <Receipt className="h-[18px] w-[18px]" />, badge: "New" },
  { t: "Peace of Mind Planner", i: <FileText className="h-[18px] w-[18px]" /> },
  { t: "Learn", i: <Send className="h-[18px] w-[18px]" />, badge: "New" },
  { t: "TAL AI", i: <Bot className="h-[18px] w-[18px]" /> },
  { t: "Tasks", i: <CheckCircle2 className="h-[18px] w-[18px]" /> },
  { t: "Reminders", i: <Bell className="h-[18px] w-[18px]" /> },
  { t: "Emergency", i: <AlertTriangle className="h-[18px] w-[18px]" /> },
  { t: "Settings", i: <Settings className="h-[18px] w-[18px]" /> },
  { t: "Subscription", i: <CreditCard className="h-[18px] w-[18px]" /> },
  { t: "Maps", i: <Map className="h-[18px] w-[18px]" /> },
]

/** The app frame: black sidebar (w-64) + cream header (h-16), as in app/(app)/layout.tsx. */
function Shell({ active, h = 760, children }: { active: string; h?: number; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={256} h={h} className="bg-black text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons-pwa/icon-192.png" alt="" className="absolute left-[92px] top-5 h-[72px] w-[72px] rounded-xl" />
        <div className="absolute left-0 top-[100px] w-full text-center text-[11px] leading-snug text-white/60">
          Your life. Organised.<br />Your future. Secured.
          <div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div>
        </div>
        {NAV.map((n, k) => (
          <div key={n.t} className={`absolute left-3 flex h-9 w-[232px] items-center gap-3 rounded-xl px-3 text-sm ${n.t === active ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`} style={{ top: 168 + k * 39 }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{n.i}</span>
            <span className="flex-1 truncate">{n.t}</span>
            {n.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${n.t === active ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
          </div>
        ))}
      </Box>
      <Box x={256} y={0} w={944} h={64} className="flex items-center gap-2 border-b border-tal-line bg-tal-cream-soft px-6">
        <div className="flex h-10 w-[340px] items-center rounded-full border border-tal-line bg-white pl-9 text-sm text-tal-plum-soft">Search your organiser…</div>
        <div className="flex h-10 items-center gap-1.5 rounded-full border border-tal-line bg-white px-4 text-sm font-medium">+ Add</div>
        <div className="flex-1" />
        <div className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"><Sparkles className="h-4 w-4" />Ask TAL AI</div>
        <div className="relative flex h-10 w-10 items-center justify-center"><Bell className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">3</span></div>
        <div className="flex items-center gap-2 pl-1 pr-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">S</span><span className="text-sm">Hi Sarah</span><span className="text-xs text-tal-plum-soft">▾</span></div>
      </Box>
      {children}
    </div>
  )
}

/** A Settings section card: white, rounded-2xl, p-6, with a font-display heading. */
const Section = ({ y, h, title, intro, children, danger }: { y: number; h: number; title: string; intro?: ReactNode; children?: ReactNode; danger?: boolean }) => (
  <Box x={288} y={y} w={880} h={h} className={`rounded-2xl border p-6 ${danger ? "border-red-300 bg-red-50/40" : "border-tal-line bg-white"}`}>
    <div className={`mb-1 font-display text-xl ${danger ? "text-red-800" : ""}`}>{title}</div>
    {intro && <p className={`mb-4 text-sm ${danger ? "text-red-900/80" : "text-tal-plum-soft"}`}>{intro}</p>}
    {children}
  </Box>
)
const Btn = ({ children, dark, className = "" }: { children: ReactNode; dark?: boolean; className?: string }) => (
  <span className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium ${dark ? "bg-black text-white" : "border border-tal-line bg-white"} ${className}`}>{children}</span>
)

// ── 1. The PIN lock ──────────────────────────────────────────────────────────

// Card (max-w-xs, p-6) centred on the canvas; keys are 3 columns in 272px.
const CX = 440, CY = 55
const keyX = (c: number) => CX + 24 + c * (248 / 3 + 12)
const keyY = (r: number) => CY + 304 + r * 68
function LockScreen({ dots = 0 }: { dots?: number }) {
  return (
    <div className="absolute inset-0 bg-tal-cream-soft font-sans text-tal-plum">
      <Box x={CX} y={CY} w={320} h={650} className="rounded-3xl bg-white shadow-2xl">
        <Box x={132} y={24} w={56} h={56} className="flex items-center justify-center rounded-full bg-tal-plum text-white"><Lock className="h-6 w-6" /></Box>
        <Box x={24} y={92} w={272} h={70} className="text-center">
          <div className="font-display text-2xl leading-tight">Enter your PIN</div>
          <p className="mt-1 text-xs text-tal-plum-soft">The Adulting Life is locked. Enter your 4-digit PIN to unlock.</p>
        </Box>
        <Box x={24} y={180} w={272} h={48} className="flex items-center justify-center gap-2 rounded-2xl bg-black text-sm font-medium text-white"><ScanFace className="h-[18px] w-[18px]" />Unlock with Face ID</Box>
        <Box x={24} y={234} w={272} h={16} className="text-center text-[11px] text-tal-plum-soft">or enter your PIN</Box>
        <Box x={24} y={270} w={272} h={14} className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((d) => <span key={d} className={`h-3.5 w-3.5 rounded-full ${d < dots ? "bg-tal-plum" : "border border-tal-line bg-tal-cream-soft"}`} />)}
        </Box>
      </Box>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d, k) => (
        <Box key={d} x={keyX(k % 3)} y={keyY(Math.floor(k / 3))} w={248 / 3} h={56} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold">{d}</Box>
      ))}
      <Box x={keyX(0)} y={keyY(3)} w={248 / 3} h={56} className="flex items-center justify-center rounded-2xl bg-white text-tal-plum-soft"><Delete className="h-5 w-5" /></Box>
      <Box x={keyX(1)} y={keyY(3)} w={248 / 3} h={56} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold">0</Box>
      <Box x={keyX(2)} y={keyY(3)} w={248 / 3} h={56} className="flex items-center justify-center rounded-2xl bg-tal-plum text-white"><ArrowRight className="h-5 w-5" /></Box>
      <Box x={CX + 24} y={CY + 584} w={272} h={44} className="text-center">
        <div className="text-sm font-medium">Forgot PIN?</div>
        <div className="mt-1 text-xs text-tal-plum-soft underline underline-offset-2">Sign out</div>
      </Box>
    </div>
  )
}

// ── 2. Settings (tall) ───────────────────────────────────────────────────────

const SET_H = 3510
type Export = "idle" | "done"
const PEOPLE = [{ n: "James Taylor", e: "james.taylor@example.com" }, { n: "Emma Clarke", e: "emma.clarke@example.com" }]
const SHARED: [string, string, boolean, boolean][] = [
  ["Letter to Mia & Leo", "Peace of Mind Planner · Letters", true, true],
  ["Funeral wishes", "Peace of Mind Planner", true, true],
  ["Will & funeral instructions", "Personal", false, true],
  ["Home insurance — Harbourside Insurance", "Home insurance", true, true],
]
// Sharing table: inside the section at (312, 564); item column 352, then 240 per person.
const TBL_Y = 564, ROW_Y = (r: number) => TBL_Y + 92 + r * 56

function SettingsPage({ exp = "idle", revoked, modal }: { exp?: Export; revoked?: boolean; modal?: boolean }) {
  return (
    <Shell active="Settings" h={SET_H}>
      <Box x={288} y={72} w={880} h={64} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Settings</span>
        <span className="font-display text-2xl leading-tight">Your account</span>
      </Box>

      <Section y={152} h={284} title="Download your organiser"
        intro="One download with everything in your family's organiser: a PDF laid out like the Organiser, an Excel workbook with a tab for every folder, and all your uploaded documents, scans and receipt photos in matching folders. It comes as a .zip file.">
        <Btn dark><Download className="h-4 w-4" />Download complete organiser</Btn>
        {exp === "done" && (
          <p className="mt-3 text-sm">Your download has started (48.6 MB, 63 documents). If it didn&apos;t, <span className="underline">download it here</span>. We&apos;ve also emailed you the link — it works for 24 hours.</p>
        )}
        <p className="mt-4 text-xs text-tal-plum-soft">Need the raw data for another app? <span className="underline">Download a technical backup (.json)</span>. It doesn&apos;t include the documents themselves.</p>
      </Section>

      <Section y={452} h={480} title="What you've shared">
        <Box x={704} y={22} w={152} h={36} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Share all with…</Box>
        <p className="mb-4 text-sm text-tal-plum-soft">Every item you&apos;ve shared, and who can see it. Click a green <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">view</span> badge to revoke access, or a dash to grant access to someone already listed.</p>
      </Section>
      <Box x={312} y={TBL_Y} w={832} h={316} className="overflow-hidden rounded-2xl border border-tal-line bg-white text-sm">
        <div className="flex h-[92px] bg-tal-cream-soft">
          <div className="flex w-[352px] items-center px-4 font-medium">Shared item</div>
          {PEOPLE.map((p) => (
            <div key={p.n} className="flex w-[240px] flex-col items-center justify-center">
              <div className="font-medium leading-tight">{p.n}</div>
              <div className="text-[10px] text-tal-plum-soft">{p.e}</div>
              <div className="mt-1.5 flex gap-1">
                <span className="flex h-8 items-center gap-1 rounded-xl border border-tal-line bg-white px-2 text-xs"><FileText className="h-3.5 w-3.5" />Download PDF</span>
                <span className="flex h-8 items-center gap-1 rounded-xl border border-tal-line bg-white px-2 text-xs"><Send className="h-3.5 w-3.5" />Share PDF</span>
              </div>
            </div>
          ))}
        </div>
        {SHARED.map(([item, sub, james, emma0], r) => {
          const emma = emma0 && !(revoked && r === 3)
          return (
            <div key={item} className="flex h-14 items-center border-t border-tal-line/60">
              <div className="w-[352px] px-4"><div className="leading-tight">{item}</div><div className="text-[11px] text-tal-plum-soft">{sub}</div></div>
              {[james, emma].map((on, c) => (
                <div key={c} className="flex w-[240px] justify-center">
                  {on
                    ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">✓ view</span>
                    : <span className="text-lg text-tal-plum-soft/50">—</span>}
                </div>
              ))}
            </div>
          )
        })}
      </Box>
      <Box x={312} y={892} w={832} h={16} className="text-xs text-tal-plum-soft">Click <span className="font-medium text-emerald-700">view</span> to revoke. Click <span className="font-medium">—</span> to add access.</Box>

      <Section y={948} h={364} title="AI and your data"
        intro="Some features in The Adulting Life use AI to save you time. Think reading receipts, extracting details from documents, tidying up wording and turning your voice into text. Here's what you need to know:">
        <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-tal-plum-soft">
          <li>AI features send the specific thing you&apos;re working on (a receipt photo, a document scan, a paragraph of text or a voice recording) to OpenAI, which powers those features.</li>
          <li>Nothing is sent to AI without your explicit consent. The first time you use each feature we ask you to confirm.</li>
          <li>OpenAI doesn&apos;t keep your input to train their models. They process it, return a result, and drop it.</li>
          <li>You can always type details in by hand and skip AI entirely.</li>
          <li>TAL AI (the chat) provides general guidance and wording help. Not legal, financial, tax or medical advice.</li>
        </ul>
        <Btn>Reset AI consents</Btn>
      </Section>

      <Section y={1328} h={176} title="Setup guide" intro="Restart the Setup guide from the beginning. This only resets your progress through the guide. Your records, uploads, and everything else in your account stay exactly where they are.">
        <Btn>Restart setup guide</Btn>
      </Section>

      <Section y={1520} h={272} title="App PIN"
        intro="A 4-digit lock every time you open the app, plus after 15 minutes of inactivity. We email you whenever it's changed. Your sign-in (Google, Apple or Microsoft) is still needed once for the underlying account — the PIN is a second layer that only unlocks this device.">
        <div className="mb-1 text-sm"><span className="font-medium">App PIN is on.</span> You&apos;ll be asked for it every time you open the app and after 15 minutes of inactivity.</div>
        <div className="mb-3 text-xs text-tal-plum-soft">Set 2 Oct 2026</div>
        <Btn>Change PIN</Btn>
      </Section>

      <Section y={1808} h={340} title="Face ID"
        intro="Unlock the app with your face or fingerprint instead of typing your PIN. Turn it on separately on each phone or computer. Your device checks your face — The Adulting Life never sees or stores it. Your PIN still works as well.">
        <div className="mb-4 divide-y divide-tal-line rounded-xl border border-tal-line">
          {[["iPhone", "Turned on 2 Oct 2026 · last used 17 Nov 2026"], ["Mac", "Turned on 9 Oct 2026 · last used 14 Nov 2026"]].map(([d, s]) => (
            <div key={d} className="flex h-16 items-center justify-between px-4">
              <div><div className="text-sm font-medium">{d}</div><div className="text-xs text-tal-plum-soft">{s}</div></div>
              <span className="flex h-9 items-center rounded-lg border border-tal-line px-3 text-sm text-red-700">Remove</span>
            </div>
          ))}
        </div>
        <Btn dark><ScanFace className="h-4 w-4" />Turn on Touch ID for this device</Btn>
      </Section>

      <Section y={2164} h={208} title="Interactive tours" intro="Guided walkthroughs of the app. Replay any time — no data changes.">
        <div className="flex gap-2"><Btn>Take the tour again</Btn><Btn>Planner tour</Btn></div>
      </Section>
      <Section y={2388} h={176} title="Install on your phone" intro="Install The Adulting Life as an app on your home screen — one tap to open, works offline for what you've already viewed, and looks like any other app on your phone." />
      <Section y={2580} h={176} title="Microphone & voice input" intro="Anywhere the app has a Notes field, you can tap the microphone to talk instead of type. If your microphone isn't working or you've accidentally blocked it, use the guide below to enable it on your device or browser." />

      <Section y={2772} h={352} title="Privacy requests"
        intro="Ask us to access, correct, export or delete your personal information, or make a privacy complaint. Most requests you can action yourself in the app. This form is for anything you need us to do for you.">
        <div className="mb-1 text-xs uppercase tracking-widest text-tal-plum-soft">Type of request</div>
        <div className="mb-3 flex h-11 items-center rounded-xl border border-tal-line px-3 text-sm">Access my data ▾</div>
        <div className="mb-1 text-xs uppercase tracking-widest text-tal-plum-soft">Tell us more (optional)</div>
        <div className="mb-4 h-16 rounded-xl border border-tal-line px-3 py-2 text-sm text-tal-plum-soft/60">Any details that will help us action your request.</div>
        <Btn dark>Send request</Btn>
      </Section>

      <Section y={3140} h={354} danger title="Delete account"
        intro="Deletes your Adulting Life account and, after 30 days, everything stored for your family group, including every family member's records, uploads and Peace of Mind Planner content.">
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-red-900/70">
          <li>You&apos;re signed out immediately.</li>
          <li>Your account is scheduled to be permanently deleted <b>30 days from now</b>, along with everything belonging to your family group: records, uploads, Peace of Mind Planner content, receipts, tasks, reminders.</li>
          <li><b>You can change your mind for the full 30 days.</b> Sign back in during that window and click <em>Cancel deletion</em> on the red banner at the top of every page. Nothing is lost.</li>
          <li>After 30 days the deletion is permanent and cannot be undone.</li>
          <li>Grantees who&apos;ve been shared items by you keep access until the 30-day purge.</li>
          <li>Some records may be retained if Australian law requires it (billing history, etc.).</li>
        </ul>
        <span className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white">Delete my account</span>
      </Section>

      {modal && (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <Box x={376} y={688} w={448} h={184} className="rounded-2xl bg-white p-5 shadow-2xl">
            <div className="font-display text-lg">Revoke access?</div>
            <p className="mt-1 text-sm text-tal-plum-soft"><span className="font-medium text-tal-plum">Emma Clarke</span> will lose access to <span className="font-medium text-tal-plum">Home insurance — Harbourside Insurance</span>. You can grant access again any time.</p>
            <Box x={238} y={128} w={80} h={36} className="flex items-center justify-center rounded-lg border border-tal-line text-sm">Cancel</Box>
            <Box x={326} y={128} w={102} h={36} className="flex items-center justify-center rounded-lg bg-red-600 text-sm font-medium text-white">Yes, revoke</Box>
          </Box>
        </>
      )}
    </Shell>
  )
}

/** What's inside the downloaded zip (api/export/complete). */
function ZipContents() {
  const rows: [ReactNode, string, string, number][] = [
    [<FileText key="p" className="h-4 w-4 text-red-600" />, "My Organiser.pdf", "Branded, laid out like the Organiser", 0],
    [<FileSpreadsheet key="x" className="h-4 w-4 text-emerald-700" />, "My Organiser.xlsx", "One workbook, a tab per folder", 0],
    [<Folder key="d" className="h-4 w-4 text-sky-600" />, "Documents", "Every upload, scan and receipt photo", 0],
    [<Folder key="1" className="h-4 w-4 text-sky-600" />, "Personal", "Passports, licences, birth certificates…", 1],
    [<Folder key="2" className="h-4 w-4 text-sky-600" />, "Health", "Medicare cards, scripts, reports…", 1],
    [<Folder key="3" className="h-4 w-4 text-sky-600" />, "Education", "", 1],
    [<Folder key="4" className="h-4 w-4 text-sky-600" />, "Employment", "", 1],
    [<Folder key="5" className="h-4 w-4 text-sky-600" />, "Admin & Bookkeeping", "Insurance, loans, budgets…", 1],
    [<Folder key="6" className="h-4 w-4 text-sky-600" />, "Receipts / 2026-27", "", 1],
  ]
  return (
    <>
      <SettingsPage exp="done" />
      <motion.div className="absolute overflow-hidden rounded-xl border border-gray-300 bg-white font-sans text-gray-900 shadow-2xl" style={{ left: 660, top: 96, width: 500, height: 410 }}
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="flex h-12 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 text-sm font-medium">
          <FileArchive className="h-5 w-5 text-amber-600" />The Adulting Life - My Organiser - 2026-11-17.zip<span className="ml-auto text-xs font-normal text-gray-500">48.6 MB</span>
        </div>
        {rows.map(([icon, name, note, depth]) => (
          <div key={name} className="flex h-10 items-center gap-2 border-b border-gray-100 pr-4 text-sm" style={{ paddingLeft: 16 + depth * 24 }}>
            {icon}<span className="font-medium">{name}</span><span className="ml-auto truncate text-xs text-gray-500">{note}</span>
          </div>
        ))}
      </motion.div>
    </>
  )
}

// ── 3. Security & Privacy ────────────────────────────────────────────────────

const INFO: { t: string; b: string; i: ReactNode; tone: string; icon: string }[] = [
  { t: "Encrypted in storage", b: "Everything you upload — documents, photos, form entries — is stored on managed infrastructure and encrypted at rest. Files and records sit behind per-user access rules, so another account can't reach into yours.", i: <Lock className="h-5 w-5" />, tone: "bg-emerald-50 ring-emerald-100", icon: "bg-emerald-100 text-emerald-700" },
  { t: "Only you (and who you invite)", b: "Your family group starts with just you. If you add family members, you choose who is a member and what they can see. No one at The Adulting Life reads your records.", i: <Eye className="h-5 w-5" />, tone: "bg-violet-50 ring-violet-100", icon: "bg-violet-100 text-violet-700" },
  { t: "Backed up automatically", b: "Data is backed up by our infrastructure provider so an accidental loss on your device doesn't mean losing your records. You can also print or export an emergency page anytime.", i: <Cloud className="h-5 w-5" />, tone: "bg-sky-50 ring-sky-100", icon: "bg-sky-100 text-sky-700" },
  { t: "You stay in control", b: "You sign in with Google, Microsoft or Apple, and only your app PIN or Face ID opens the app. Delete individual records at any time, and if you want to leave, you can download everything and delete your account.", i: <KeyRound className="h-5 w-5" />, tone: "bg-amber-50 ring-amber-100", icon: "bg-amber-100 text-amber-700" },
]
function SecurityPage() {
  return (
    <Shell active="">
      <Box x={288} y={74} w={880} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft">The Adulting Life Organiser<span className="text-tal-plum-soft/50">/</span>Security &amp; Privacy</Box>
      <Box x={288} y={104} w={880} h={80} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
        <div><div className="font-display text-2xl leading-tight">Security &amp; Privacy</div><div className="text-sm text-tal-plum-soft">How your information is protected — and what stays under your control.</div></div>
      </Box>
      {INFO.map((c, k) => (
        <Box key={c.t} x={288 + (k % 2) * 448} y={200 + Math.floor(k / 2) * 186} w={432} h={170} className={`rounded-2xl p-5 ring-1 ${c.tone}`}>
          <div className="mb-2 flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>{c.i}</span><span className="mt-1 font-display text-lg leading-tight">{c.t}</span></div>
          <p className="text-sm leading-relaxed text-tal-plum-soft">{c.b}</p>
        </Box>
      ))}
      <Box x={288} y={574} w={880} h={160} className="rounded-2xl border border-tal-line bg-white p-6">
        <div className="mb-3 font-display text-xl">Quick actions</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4"><div className="font-medium">PIN, Face ID &amp; account settings</div><p className="mt-1 text-xs text-tal-plum-soft">Change your app PIN, Face ID and your details.</p></div>
          <div className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4"><div className="font-medium">Emergency page (print or share)</div><p className="mt-1 text-xs text-tal-plum-soft">One page with everything a paramedic or trusted person needs.</p></div>
        </div>
      </Box>
    </Shell>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const SCREENS: Record<string, ReactNode> = {
  lock: <LockScreen />,
  lock3: <LockScreen dots={3} />,
  settings: <SettingsPage />,
  zip: <ZipContents />,
  shared: <SettingsPage exp="done" />,
  revoke: <SettingsPage exp="done" modal />,
  revoked: <SettingsPage exp="done" revoked />,
  security: <SecurityPage />,
}

const U = "app.theadultinglife.com.au"
const STEPS: WalkStep[] = [
  { screen: "lock", url: `${U}/dashboard`, caption: "Locked until you unlock it", detail: "Everyone who signs in sets a 4-digit PIN. The app locks every time it's opened, and after 15 minutes idle.",
    focus: { x: 600, y: 380, scale: 1.1 }, ring: { x: CX, y: CY, w: 320, h: 650 }, duration: 7000 },
  { screen: "lock3", url: `${U}/dashboard`, caption: "Enter your PIN", detail: "Nothing in the app shows until it's right. Too many wrong tries and it locks - \"Forgot PIN?\" emails a reset link.",
    focus: { x: 600, y: 440, scale: 1.4 }, click: { x: keyX(0) + 41, y: keyY(2) + 28 }, duration: 6500 },
  { screen: "lock", url: `${U}/dashboard`, caption: "Or use Face ID", detail: "Your device checks your face - The Adulting Life never sees or stores it.",
    focus: { x: 600, y: 270, scale: 1.6 }, ring: { x: CX + 24, y: CY + 180, w: 272, h: 48 }, click: { x: 600, y: CY + 204 }, duration: 6000 },
  { screen: "settings", url: `${U}/settings`, caption: "Download your organiser", detail: "Everything in one go: a branded PDF laid out like the Organiser, an Excel workbook, and every document you've uploaded.",
    focus: { x: 620, y: 300, scale: 1.4 }, ring: { x: 312, y: 264, w: 262, h: 40 }, click: { x: 443, y: 284 }, duration: 7000 },
  { screen: "zip", url: `${U}/settings`, caption: "One .zip with all of it", detail: "The PDF, the workbook and your documents in folders that match the Organiser. The link is emailed to you too, and works for 24 hours.",
    focus: { x: 760, y: 320, scale: 1.25 }, duration: 8000 },
  { screen: "shared", url: `${U}/settings`, scroll: 380, caption: "See everything you've shared", detail: "Every item you've shared, and who can see it - James and Emma, Sarah's sister and next of kin.",
    focus: { x: 728, y: 700, scale: 1.15 }, ring: { x: 312, y: TBL_Y, w: 832, h: 316 }, duration: 7000 },
  { screen: "shared", url: `${U}/settings`, scroll: 380, caption: "Change your mind any time", detail: "Click a green view badge to take access away.",
    focus: { x: 780, y: ROW_Y(3) + 28, scale: 1.3 }, ring: { x: 994, y: ROW_Y(3) + 14, w: 60, h: 28 }, click: { x: 1024, y: ROW_Y(3) + 28 }, duration: 5500 },
  { screen: "revoke", url: `${U}/settings`, scroll: 380, caption: "Revoke access?", detail: "Emma will lose access to the home insurance. You can grant it again any time.",
    focus: { x: 600, y: 780, scale: 1.5 }, ring: { x: 702, y: 816, w: 102, h: 36 }, click: { x: 753, y: 834 }, duration: 6000 },
  { screen: "revoked", url: `${U}/settings`, scroll: 900, caption: "AI only with your say-so", detail: "Nothing is sent to AI without your consent, it isn't used to train models, and you can always type things in yourself.",
    focus: { x: 728, y: 1130, scale: 1.2 }, ring: { x: 288, y: 948, w: 880, h: 364 }, duration: 7500 },
  { screen: "revoked", url: `${U}/settings`, scroll: 1480, caption: "Your PIN and Face ID, your way", detail: "Change your PIN (we email you when it changes) and see each device with Face ID turned on - remove one any time.",
    focus: { x: 728, y: 1840, scale: 1.1 }, ring: { x: 288, y: 1520, w: 880, h: 628 }, duration: 7500 },
  { screen: "revoked", url: `${U}/settings`, scroll: 2750, caption: "Leave whenever you like", detail: "Privacy requests go straight to us. Delete your account and everything goes after 30 days - change your mind in that time and nothing is lost.",
    focus: { x: 728, y: 3200, scale: 1.1 }, ring: { x: 288, y: 3140, w: 880, h: 354 }, duration: 8000 },
  { screen: "security", url: `${U}/security`, caption: "Your information stays yours", detail: "Encrypted in storage, backed up, and only seen by the people you choose. No one at The Adulting Life reads your records.",
    focus: { x: 728, y: 380, scale: 1.15 }, ring: { x: 736, y: 200, w: 432, h: 170 }, duration: 8000 },
]

export default function SafeWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/upbeat-music.mp3" steps={STEPS} screens={SCREENS} title="Safe and yours" autoStart={autoStart} url={`${U}/settings`}
      intro={{ title: "Safe, and yours", subtitle: "A PIN and Face ID lock, one-click download of everything, and you decide who sees what." }} />
  )
}
