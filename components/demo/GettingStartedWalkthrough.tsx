"use client"

// "Getting started" walkthrough (phone) for the public /demo page: hand-built
// copies of the real screens with a made-up family's sample data (Sarah Taylor,
// Brisbane) - no sign-in, no API calls. Sign in (app/login) -> Terms & Privacy
// pop-ups (components/legal/LegalConsentGate) -> "Before you start" 18+ check
// (app/confirm-age) -> Hello step of the Setup Guide (app/welcome) -> choose a
// PIN and Face ID (components/security/AppPinSetupGate + PinDialog) -> the
// dashboard (app/(app)/dashboard). The order matches the real app: the PIN is
// asked for when you first go into the app itself, after the welcome.
// Canvas 390 x 844 (see WalkthroughPlayer); login, welcome and dashboard scroll.
// If one of those pages changes, update the matching screen here.

import type { CSSProperties, ReactNode } from "react"
import { motion } from "framer-motion"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

const W = 390
const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)
const Phone = ({ children, h = 844, className = "bg-tal-cream-soft" }: { children: ReactNode; h?: number; className?: string }) => (
  <div className={`absolute left-0 top-0 w-full font-sans text-tal-plum ${className}`} style={{ height: h }}>{children}</div>
)
const StatusBar = ({ light }: { light?: boolean }) => (
  <Box x={0} y={0} w={W} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${light ? "text-white" : "text-tal-plum-dark"}`}>
    <span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span>
  </Box>
)
const Icon = ({ x, y, size }: { x: number; y: number; size: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/icons-pwa/icon-192.png" alt="" className="absolute rounded-xl shadow-sm" style={{ left: x, top: y, width: size, height: size }} />
)
const Tick = ({ on }: { on?: boolean }) => (
  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-black bg-black text-white" : "border-tal-line bg-white"}`}>
    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
  </span>
)

// ── 1. Sign in (app/login) ───────────────────────────────────────────────────

const LOGIN_H = 1300
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.12 2.58-2.38 3.38v2.82h3.85c2.26-2.09 3.58-5.17 3.58-8.44z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.85-2.82c-1.07.72-2.44 1.14-4.09 1.14-3.14 0-5.8-2.12-6.75-4.98H1.28v3.12C3.25 21.31 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.25 14.43c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.75H1.28C.47 8.36 0 10.13 0 12s.47 3.64 1.28 5.25l3.97-2.82z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.28 6.75l3.97 3.12C6.2 6.87 8.86 4.75 12 4.75z" />
  </svg>
)
const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M13 1h10v10H13z" /><path fill="#00A4EF" d="M1 13h10v10H1z" /><path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
)
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="currentColor">
    <path d="M17.05 12.04c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.08-3.98-1.05-2.05.03-3.94 1.19-5 3.03-2.13 3.69-.55 9.15 1.53 12.15 1.02 1.47 2.23 3.12 3.82 3.06 1.54-.06 2.12-.99 3.98-.99 1.86 0 2.38.99 4 .96 1.65-.03 2.7-1.5 3.71-2.98 1.17-1.71 1.65-3.37 1.67-3.46-.04-.02-3.2-1.23-3.23-4.85zM14 3.7c.85-1.03 1.42-2.46 1.27-3.88-1.22.05-2.7.81-3.58 1.84-.79.91-1.48 2.37-1.29 3.76 1.36.11 2.75-.69 3.6-1.72z" />
  </svg>
)
const LOGIN_BUTTONS = [
  { t: "Continue with Google", i: <GoogleIcon />, y: 872 },
  { t: "Continue with Microsoft", i: <MicrosoftIcon />, y: 932 },
  { t: "Continue with Apple", i: <AppleIcon />, y: 992 },
]
function Login() {
  return (
    <Phone h={LOGIN_H} className="bg-gradient-to-br from-tal-cream-soft via-tal-cream to-[#f3d9b8]">
      <StatusBar />
      <Box x={12} y={52} w={366} h={1236} className="overflow-hidden rounded-3xl border border-tal-line bg-white shadow-sm" />
      <Box x={13} y={53} w={364} h={646} className="rounded-t-3xl bg-tal-cream-soft" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Logo.png" alt="The Adulting Life" className="absolute object-contain" style={{ left: 85, top: 80, width: 220, height: 78 }} />
      <Box x={40} y={182} w={320} h={80} className="font-display text-[28px] font-semibold leading-tight">Organise your life.<br />Reduce the stress.</Box>
      <Box x={40} y={266} w={320} h={26} className="text-[15px] italic text-tal-plum-soft">Life feels overwhelming… but you&apos;re in the right place.</Box>
      {[
        "Store all your important information in one secure place.",
        "Learn practical life skills with step-by-step guidance.",
        "Stay on top of renewals, reminders and important dates.",
        "Your data is private, secure and always in your control.",
      ].map((t, n) => (
        <Box key={t} x={40} y={318 + n * 52} w={316} h={44} className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-cream text-tal-plum">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l5 5 9-11" /></svg>
          </span>
          <span className="pt-1 text-sm leading-snug text-tal-plum-dark">{t}</span>
        </Box>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/loginhero.png" alt="" className="absolute rounded-2xl object-cover object-top" style={{ left: 40, top: 532, width: 310, height: 140 }} />

      <Icon x={163} y={726} size={64} />
      <Box x={20} y={800} w={350} h={32} className="text-center font-display text-2xl font-semibold">Welcome</Box>
      <Box x={20} y={834} w={350} h={22} className="text-center text-sm text-tal-plum-soft">Let&apos;s get you organised.</Box>
      {LOGIN_BUTTONS.map((b) => (
        <Box key={b.t} x={44} y={b.y} w={302} h={48} className="flex items-center justify-center gap-3 rounded-xl border border-tal-line bg-white font-medium text-tal-plum-dark">{b.i}{b.t}</Box>
      ))}
      <Box x={44} y={1060} w={302} h={36} className="text-center text-xs text-tal-plum-soft">By continuing you agree to our <u>Terms &amp; Conditions</u> and <u>Privacy Policy</u>.</Box>
      <Box x={44} y={1112} w={302} h={1} className="bg-tal-line" />
      {["Australian owned and operated", "Secure cloud storage", "Built for privacy"].map((t, n) => (
        <Box key={t} x={44} y={1134 + n * 42} w={302} h={32} className="flex items-center gap-3 text-sm text-tal-plum-dark">
          <span className="h-8 w-8 rounded-full bg-tal-cream" />{t}
        </Box>
      ))}
    </Phone>
  )
}

// ── 2. Terms & Privacy (components/legal/LegalConsentGate) ───────────────────

const DX = 16, DY = 80, DW = 358
function Consent({ kind, checked }: { kind: "terms" | "privacy"; checked?: boolean }) {
  const terms = kind === "terms"
  return (
    <Phone>
      <StatusBar light />
      <div className="absolute inset-0 bg-black/60" />
      <Box x={DX} y={DY} w={DW} h={690} className="overflow-hidden rounded-2xl bg-white shadow-2xl" />
      <Box x={DX} y={DY} w={DW} h={122} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft px-6 py-4">
        <p className="font-display text-2xl leading-tight">{terms ? "Terms & Conditions" : "Privacy Policy"}</p>
        <p className="mt-1 text-sm text-tal-plum-soft">
          {terms ? "Before you use The Adulting Life, please read and accept the Terms & Conditions." : "Please read and accept the Privacy Policy — it explains how your information is stored and used."}
        </p>
      </Box>
      <Box x={DX + 24} y={DY + 140} w={DW - 48} h={400} className="space-y-3 overflow-hidden text-[13px] leading-relaxed">
        {terms ? (
          <>
            <p>Welcome to The Adulting Life. By creating an account or using our service, you agree to these Terms &amp; Conditions. Please read them carefully.</p>
            <p className="font-display text-base font-semibold">1. Your account</p>
            <p>You must be at least 18 years old to use The Adulting Life. You are responsible for keeping your login credentials secure and for all activity on your account.</p>
            <p className="font-display text-base font-semibold">2. Your content</p>
            <p>You retain ownership of everything you upload: documents, form answers, notes, files. We do not sell your content and we do not use it to train third-party models.</p>
          </>
        ) : (
          <>
            <p>Your privacy matters to us. This policy explains what we collect, why, where it is stored and the choices you have.</p>
            <p className="font-display text-base font-semibold">What we collect</p>
            <p>The details you enter and the documents you upload for you and your family, plus your name and email from the account you sign in with.</p>
            <p className="font-display text-base font-semibold">Who can see it</p>
            <p>Only you, and the people you choose to share specific folders or items with. You can take sharing away at any time.</p>
          </>
        )}
      </Box>
      <Box x={DX} y={DY + 560} w={DW} h={130} className="rounded-b-2xl border-t border-tal-line bg-white" />
      <Box x={DX + 24} y={DY + 580} w={DW - 48} h={40} className="flex items-start gap-3 text-sm leading-snug">
        <span className="mt-0.5"><Tick on={checked} /></span>
        {terms ? "I have read and agree to the Terms & Conditions." : "I have read and agree to the Privacy Policy."}
      </Box>
      <Box x={DX + DW - 24 - 186} y={DY + 630} w={186} h={44} className={`flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white ${checked ? "" : "opacity-40"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Accept and continue
      </Box>
    </Phone>
  )
}

// ── 3. Before you start (app/confirm-age) ────────────────────────────────────

function ConfirmAge({ checked }: { checked?: boolean }) {
  return (
    <Phone className="bg-gradient-to-br from-tal-cream-soft via-tal-cream to-[#f3d9b8]">
      <StatusBar />
      <Icon x={151} y={110} size={88} />
      <Box x={20} y={232} w={350} h={348} className="rounded-3xl border border-tal-line bg-white shadow-sm" />
      <Box x={52} y={264} w={286} h={34} className="font-display text-2xl">Before you start</Box>
      <Box x={52} y={306} w={286} h={64} className="text-sm text-tal-plum-soft">The Adulting Life is for adults. We just need to confirm your age before you begin setting up your account.</Box>
      <Box x={52} y={386} w={286} h={24} className="flex items-center gap-3 text-sm"><Tick on={checked} />I confirm that I am 18 years of age or older.</Box>
      <Box x={52} y={432} w={286} h={44} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${checked ? "" : "opacity-60"}`}>Continue</Box>
      <Box x={52} y={500} w={286} h={50} className="text-[11px] text-tal-plum-soft">You only need to do this once. Children and other family members you add later don&apos;t need to confirm.</Box>
    </Phone>
  )
}

// ── 4. Hello step of the Setup Guide (app/welcome) ───────────────────────────

const WEL_H = 1420
const TILES = [
  { t: "Setup Guide", b: "Your starting point. Walks you through each Organiser section step-by-step.", a: "bg-violet-50 ring-violet-100", img: "/thumbnails/welcome/setup-guide.webp" },
  { t: "The Adulting Life Organiser", b: "The heart of the app. Personal, Health, Education, Employment and Admin folders.", a: "bg-amber-50 ring-amber-100", img: "/thumbnails/welcome/organiser.webp" },
  { t: "Peace of Mind Planner", b: "For the things that matter most. Letters, wishes, funeral plans and last words.", a: "bg-emerald-50 ring-emerald-100", img: "/thumbnails/learn/peace-of-mind-planner.webp" },
  { t: "Sharing", b: "You choose what — and who. Grant access to specific folders or items. Revoke any time.", a: "bg-sky-50 ring-sky-100", img: "/thumbnails/welcome/sharing.webp" },
]
function Welcome() {
  return (
    <Phone h={WEL_H}>
      <StatusBar />
      <Box x={0} y={44} w={W} h={64} className="border-b border-tal-line/60 bg-white/60" />
      <Icon x={14} y={58} size={36} />
      <Box x={224} y={58} w={152} h={36} className="flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Exit to Dashboard
      </Box>
      <Box x={20} y={128} w={350} h={28} className="flex items-center justify-between">
        {Array.from({ length: 8 }, (_, n) => (
          <span key={n} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${n === 0 ? "bg-black text-white" : "bg-white text-tal-plum-soft ring-1 ring-tal-line"}`}>{n + 1}</span>
        ))}
      </Box>
      <Box x={12} y={176} w={366} h={1196} className="rounded-3xl bg-white shadow-sm ring-1 ring-tal-line" />
      <Box x={28} y={196} w={334} h={16} className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">Step 1 of 8 · 0 done</Box>
      <Box x={28} y={214} w={334} h={76} className="font-display text-3xl leading-tight">Welcome to The Adulting Life</Box>
      <Box x={28} y={296} w={334} h={48} className="text-tal-plum-soft">A quick tour of what&apos;s inside and where to start. About 60 seconds.</Box>
      <Box x={28} y={364} w={334} h={100} className="leading-relaxed">Hi Sarah 👋 The Adulting Life is where all your important household information lives — organised, secure, and ready when you or your family need it.</Box>
      {/* How it fits together: Setup -> Organiser -> Planner -> Sharing */}
      <Box x={28} y={484} w={334} h={150} className="rounded-2xl bg-tal-cream-soft ring-1 ring-tal-line" />
      {["Setup Guide", "Organiser", "Planner", "Sharing"].map((t, n) => (
        <Box key={t} x={40 + (n % 2) * 166} y={500 + Math.floor(n / 2) * 66} w={144} h={52} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium shadow-sm ring-1 ring-tal-line">{t}</Box>
      ))}
      <Box x={184} y={516} w={22} h={20} className="text-center text-tal-plum-soft">→</Box>
      <Box x={184} y={582} w={22} h={20} className="text-center text-tal-plum-soft">→</Box>
      <motion.span className="absolute h-2.5 w-2.5 rounded-full bg-violet-500" style={{ top: 521 }} initial={{ left: 186 }} animate={{ left: [186, 202, 186] }} transition={{ duration: 2, repeat: Infinity }} />
      {TILES.map((t, n) => (
        <Box key={t.t} x={28} y={654 + n * 98} w={334} h={88} className={`flex items-start gap-3 rounded-2xl p-3 ring-1 ${t.a}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.img} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover" />
          <div className="min-w-0"><p className="font-display leading-tight">{t.t}</p><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{t.b}</p></div>
        </Box>
      ))}
      <Box x={28} y={1058} w={334} h={70} className="rounded-xl border border-tal-line bg-tal-cream/70 px-4 py-3 text-sm"><b className="font-medium">Where to start:</b> the Setup Guide. It walks you through everything, one bite-size step at a time.</Box>
      <Box x={28} y={1140} w={334} h={110} className="flex items-start gap-3 rounded-xl bg-black p-4 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">✺</span>
        <div><p className="font-medium">Ask TAL AI — your built-in guide</p><p className="mt-1.5 text-xs leading-relaxed text-white/75">Anywhere in the app, tap Ask TAL AI (top right) and ask anything — &ldquo;What&apos;s a TFN?&rdquo;</p></div>
      </Box>
      <Box x={28} y={1276} w={176} h={44} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white">Show me around →</Box>
      <Box x={28} y={1330} w={200} h={28} className="flex items-center text-sm text-tal-plum-soft">Skip and explore on my own</Box>
    </Phone>
  )
}

// ── 5. App PIN + Face ID (AppPinSetupGate / PinDialog) ───────────────────────

const PX = 35, PY = 190
const keyX = (c: number) => PX + 24 + c * 94.7
const keyY = (r: number) => PY + 176 + r * 68
function Pin({ confirm, filled }: { confirm?: boolean; filled: number }) {
  return (
    <Phone>
      <StatusBar light />
      <div className="absolute inset-0 bg-black/60" />
      <Box x={PX} y={PY} w={320} h={460} className="rounded-3xl bg-white shadow-2xl" />
      <Box x={PX + 24} y={PY + 24} w={272} h={26} className="text-center font-display text-lg leading-tight">{confirm ? "Confirm your PIN" : "Choose a 4-digit PIN"}</Box>
      <Box x={PX + 24} y={PY + 54} w={272} h={70} className="text-center text-xs text-tal-plum-soft">
        {confirm ? "You'll be asked for this every time you open the app." : "To keep your information safe, set a PIN for The Adulting Life. You'll be asked for it every time you open the app."}
      </Box>
      <Box x={PX + 24} y={PY + 136} w={272} h={14} className="flex items-center justify-center gap-3">
        {[0, 1, 2, 3].map((n) => <span key={n} className={`inline-block h-3.5 w-3.5 rounded-full ${n < filled ? "bg-tal-plum" : "border border-tal-line bg-tal-cream-soft"}`} />)}
      </Box>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d, n) => (
        <Box key={d} x={keyX(n % 3)} y={keyY(Math.floor(n / 3))} w={83} h={56} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold">{d}</Box>
      ))}
      <Box x={keyX(0)} y={keyY(3)} w={83} h={56} className="flex items-center justify-center text-tal-plum-soft">⌫</Box>
      <Box x={keyX(1)} y={keyY(3)} w={83} h={56} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold">0</Box>
      <Box x={0} y={790} w={W} h={20} className="text-center text-xs text-white/90 underline underline-offset-2">Sign out</Box>
    </Phone>
  )
}
function FaceId({ scanning }: { scanning?: boolean }) {
  return (
    <Phone>
      <StatusBar />
      <Box x={PX} y={270} w={320} h={290} className="rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="font-display text-xl leading-tight">Unlock with Face ID?</p>
        <p className="mt-2 text-sm text-tal-plum-soft">Your PIN is set. You can also unlock The Adulting Life on this device with Face ID — your PIN still works too.</p>
      </Box>
      <Box x={PX + 24} y={440} w={272} h={48} className="flex items-center justify-center rounded-2xl bg-black text-sm font-medium text-white">{scanning ? "Waiting for your device…" : "Turn on Face ID"}</Box>
      <Box x={PX + 24} y={500} w={272} h={30} className="flex items-center justify-center text-sm text-tal-plum-soft underline underline-offset-2">Not now</Box>
      {scanning && (
        <motion.div className="absolute flex flex-col items-center justify-center gap-2 rounded-3xl bg-gray-900/85 text-white" style={{ left: 120, top: 120, width: 150, height: 130 }}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0" /></svg>
          <span className="text-sm">Face ID</span>
        </motion.div>
      )}
    </Phone>
  )
}

// ── 6. Dashboard (app/(app)/dashboard) ───────────────────────────────────────

const DASH_H = 1620
const STATS = [
  { label: "Records & Documents", sub: "Stored securely", v: 0, bg: "bg-violet-50 ring-violet-100", img: "records-documents" },
  { label: "Things expiring soon", sub: "View reminders", v: 0, bg: "bg-amber-50 ring-amber-100", img: "expiring-soon" },
  { label: "Tasks to complete", sub: "Keep it up!", v: 6, bg: "bg-sky-50 ring-sky-100", img: "tasks" },
  { label: "All good", sub: "Add records to track", v: 0, bg: "bg-emerald-50 ring-emerald-100", img: "all-good" },
]
const SECTIONS = [
  { id: "personal", label: "Personal", missing: 24, bg: "bg-violet-50 ring-violet-100" },
  { id: "health", label: "Health", missing: 17, bg: "bg-amber-50 ring-amber-100" },
  { id: "education", label: "Education", missing: 9, bg: "bg-sky-50 ring-sky-100" },
  { id: "employment", label: "Employment", missing: 8, bg: "bg-rose-50 ring-rose-100" },
  { id: "admin", label: "Admin & Bookkeeping", missing: 21, bg: "bg-emerald-50 ring-emerald-100" },
]
function MobileHeader() {
  return (
    <>
      <Box x={0} y={44} w={W} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Icon x={14} y={58} size={36} />
      <Box x={144} y={60} w={96} h={36} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white">✺ Ask TAL AI</Box>
      <Box x={244} y={58} w={40} h={40} className="flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </Box>
      <Box x={288} y={58} w={52} h={40} className="flex items-center gap-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tal-cream text-sm font-medium">S</span><span className="text-xs text-tal-plum-soft">▾</span>
      </Box>
      <Box x={342} y={58} w={40} h={40} className="flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}
function Dashboard() {
  return (
    <Phone h={DASH_H}>
      <StatusBar /><MobileHeader />
      <Box x={10} y={124} w={370} h={34} className="font-display text-2xl leading-tight">Hi Sarah.</Box>
      <Box x={10} y={160} w={370} h={22} className="text-tal-plum-soft">6 tasks are waiting.</Box>
      <Box x={8} y={198} w={374} h={104} className="flex items-start gap-3 rounded-2xl bg-red-600 p-4 text-white shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2 3 20h18L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>
        </span>
        <div><p className="text-[10px] font-medium uppercase tracking-widest text-white/80">In case of emergency</p><p className="font-medium leading-snug">Your emergency information</p><p className="mt-1 text-xs text-white/85">Contacts, medications, insurance and will, on one page ready when it&apos;s needed.</p></div>
      </Box>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/thumbnails/banners/dashboard.jpg" alt="" className="absolute rounded-2xl border border-tal-line object-cover" style={{ left: 8, top: 318, width: 374, height: 94 }} />
      <Box x={8} y={444} w={374} h={92} className="flex items-center gap-4 rounded-2xl bg-black p-5 text-white shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">→</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug"><span className="mr-2 text-[10px] font-medium uppercase tracking-widest text-white/80">Setup guide</span>You&apos;re 1 of 8 steps in</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-white" style={{ width: "13%" }} /></div>
        </div>
        <span>→</span>
      </Box>
      <Box x={8} y={552} w={374} h={96} className="flex flex-col justify-center rounded-2xl bg-tal-cream p-5">
        <p className="mb-0.5 text-sm font-medium">✨ You&apos;re doing great!</p>
        <p className="mb-2 text-xs text-tal-plum-soft">You&apos;ve completed 0% of your Organiser</p>
        <div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-white" /><span className="text-xs font-medium">0%</span></div>
      </Box>
      {STATS.map((s, n) => (
        <Box key={s.label} x={8} y={680 + n * 96} w={374} h={80} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${s.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/dashboard/${s.img}.webp`} alt="" className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
          <div className="min-w-0 flex-1"><p className="font-medium leading-tight">{s.label}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{s.sub}</p></div>
          <div className="flex flex-col items-end"><span className="font-display text-2xl leading-none">{s.v}</span><span className="mt-1 text-xs text-tal-plum-soft">→</span></div>
        </Box>
      ))}
      <Box x={8} y={1080} w={374} h={514} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={32} y={1104} w={326} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Organiser Overview</span><span className="text-sm text-tal-plum-soft">View all sections →</span></Box>
      {SECTIONS.map((s, n) => (
        <Box key={s.id} x={32} y={1148 + n * 86} w={326} h={74} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${s.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/categories/${s.id}.webp`} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-tight">{s.label}</p><div className="mt-1.5 h-1.5 rounded-full bg-white" /><p className="mt-1 text-[11px] text-tal-plum-soft">⚠ {s.missing} missing</p></div>
          <span className="font-display text-3xl leading-none">0</span>
        </Box>
      ))}
    </Phone>
  )
}

const SCREENS: Record<string, ReactNode> = {
  login: <Login />,
  terms: <Consent kind="terms" />,
  termsok: <Consent kind="terms" checked />,
  privacy: <Consent kind="privacy" checked />,
  age: <ConfirmAge />,
  ageok: <ConfirmAge checked />,
  welcome: <Welcome />,
  pin: <Pin filled={2} />,
  pinconfirm: <Pin confirm filled={4} />,
  faceid: <FaceId />,
  faceidscan: <FaceId scanning />,
  dash: <Dashboard />,
}

const STEPS: WalkStep[] = [
  { screen: "login", caption: "Welcome to The Adulting Life", detail: "Everything important for you and your family, in one secure place.", focus: { x: 195, y: 300, scale: 1.08 }, duration: 5500 },
  { screen: "login", caption: "Sign in with an account you already have", detail: "Google, Microsoft or Apple - no new password to remember.", scroll: 440, focus: { x: 195, y: 940, scale: 1.2 }, ring: { x: 44, y: 872, w: 302, h: 48 }, click: { x: 195, y: 896 }, duration: 6500 },
  { screen: "terms", caption: "Read the Terms & Conditions", detail: "Tick the box to say you've read them.", focus: { x: 195, y: 560, scale: 1.1 }, ring: { x: DX + 18, y: DY + 574, w: DW - 36, h: 48 }, click: { x: DX + 36, y: DY + 592 }, duration: 6000 },
  { screen: "termsok", caption: "Accept and continue", focus: { x: 250, y: 660, scale: 1.3 }, ring: { x: DX + DW - 210, y: DY + 630, w: 186, h: 44 }, click: { x: DX + DW - 117, y: DY + 652 }, duration: 4500 },
  { screen: "privacy", caption: "Then the Privacy Policy", detail: "What's stored, where, and who can see it - only you and the people you choose.", focus: { x: 195, y: 500, scale: 1.05 }, ring: { x: DX + DW - 210, y: DY + 630, w: 186, h: 44 }, click: { x: DX + DW - 117, y: DY + 652 }, duration: 6500 },
  { screen: "age", caption: "Confirm you're 18 or over", detail: "Only the account holder does this, once. Kids you add later don't need to.", focus: { x: 195, y: 410, scale: 1.25 }, ring: { x: 46, y: 380, w: 298, h: 36 }, click: { x: 62, y: 398 }, duration: 6500 },
  { screen: "ageok", caption: "Continue", focus: { x: 195, y: 430, scale: 1.25 }, ring: { x: 52, y: 432, w: 286, h: 44 }, click: { x: 195, y: 454 }, duration: 4000 },
  { screen: "welcome", caption: "A 60-second welcome", detail: "How the Setup Guide, the Organiser, the Planner and Sharing fit together.", scroll: 160, focus: { x: 195, y: 560, scale: 1.05 }, duration: 7000 },
  { screen: "welcome", caption: "Start the Setup Guide now - or later", detail: "It waits on your dashboard, one bite-size step at a time.", scroll: 576, focus: { x: 195, y: 1250, scale: 1.15 }, ring: { x: 22, y: 1326, w: 212, h: 36 }, click: { x: 110, y: 1344 }, duration: 6500 },
  { screen: "pin", caption: "Choose a 4-digit PIN", detail: "Your information is locked whenever you're not using the app.", focus: { x: 195, y: 420, scale: 1.12 }, ring: { x: keyX(2), y: keyY(1), w: 83, h: 56 }, click: { x: keyX(2) + 41, y: keyY(1) + 28 }, duration: 6500 },
  { screen: "pinconfirm", caption: "Type it again to confirm", detail: "You'll be asked for it each time you open the app, and after 15 minutes idle.", focus: { x: 195, y: 340, scale: 1.25 }, ring: { x: PX + 24, y: PY + 128, w: 272, h: 30 }, duration: 6000 },
  { screen: "faceid", caption: "Or unlock with Face ID", detail: "Optional - your PIN still works too.", focus: { x: 195, y: 420, scale: 1.2 }, ring: { x: PX + 24, y: 440, w: 272, h: 48 }, click: { x: 195, y: 464 }, duration: 5500 },
  { screen: "faceidscan", caption: "One glance and you're in", focus: { x: 195, y: 330, scale: 1.1 }, duration: 4000 },
  { screen: "dash", caption: "Your life at a glance", detail: "Hi Sarah. The emergency page, your Setup Guide progress and what's waiting - all on one screen.", focus: { x: 195, y: 400, scale: 1.05 }, duration: 7500 },
  { screen: "dash", caption: "What's expiring, what's left to do", detail: "Records, renewals and tasks at a glance - tap any card to open it.", scroll: 640, focus: { x: 195, y: 830, scale: 1.08 }, ring: { x: 8, y: 680, w: 374, h: 368 }, duration: 6500 },
  { screen: "dash", caption: "Your Organiser, section by section", detail: "Personal, Health, Education, Employment and Admin - watch the bars fill up as you go.", scroll: 776, focus: { x: 195, y: 1340, scale: 1.05 }, duration: 7000 },
]

export default function GettingStartedWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/demo-music.mp3" device="phone" steps={STEPS} screens={SCREENS} title="Getting started" autoStart={autoStart}
      intro={{ title: "Getting started", subtitle: "Sign in, set your PIN and see your life at a glance - in about a minute." }} />
  )
}
