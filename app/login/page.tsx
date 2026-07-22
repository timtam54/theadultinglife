"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { usePublicAudit } from "@/hooks/usePublicAudit";

type Mode = "oauth" | "email" | "check-email" | "provider-conflict";
type Provider = "google" | "microsoft" | "apple";

// Temporarily hide email/password sign-in until SMTP is configured.
// Flip to true to restore.
const EMAIL_SIGNIN_ENABLED = false;

const providerLabels: Record<Provider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  apple: "Apple",
};

const errorCopy: Record<string, string> = {
  state_mismatch: "That sign-in link expired. Please try again.",
  missing_code: "Sign-in didn't complete. Please try again.",
  oauth_failed: "We couldn't sign you in with that provider. Try again.",
  provider_unconfigured:
    "That sign-in method isn't set up yet. Use email or another provider.",
};

// Warm neutral lifestyle placeholder — replace when Donna sends the real hero shot.
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.12 2.58-2.38 3.38v2.82h3.85c2.26-2.09 3.58-5.17 3.58-8.44z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.85-2.82c-1.07.72-2.44 1.14-4.09 1.14-3.14 0-5.8-2.12-6.75-4.98H1.28v3.12C3.25 21.31 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.43c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.75H1.28C.47 8.36 0 10.13 0 12s.47 3.64 1.28 5.25l3.97-2.82z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.28 6.75l3.97 3.12C6.2 6.87 8.86 4.75 12 4.75z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M17.05 12.04c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.08-3.98-1.05-2.05.03-3.94 1.19-5 3.03-2.13 3.69-.55 9.15 1.53 12.15 1.02 1.47 2.23 3.12 3.82 3.06 1.54-.06 2.12-.99 3.98-.99 1.86 0 2.38.99 4 .96 1.65-.03 2.7-1.5 3.71-2.98 1.17-1.71 1.65-3.37 1.67-3.46-.04-.02-3.2-1.23-3.23-4.85zM14 3.7c.85-1.03 1.42-2.46 1.27-3.88-1.22.05-2.7.81-3.58 1.84-.79.91-1.48 2.37-1.29 3.76 1.36.11 2.75-.69 3.6-1.72z" />
    </svg>
  );
}

function BulletIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-tal-cream text-tal-plum flex items-center justify-center">
      {children}
    </span>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  usePublicAudit("/login");
  const [mode, setMode] = useState<Mode>("oauth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conflictProvider, setConflictProvider] = useState<Provider | null>(null);

  useEffect(() => {
    const err = params.get("error");
    if (err && errorCopy[err]) {
      setFormError(errorCopy[err]);
    }
  }, [params]);

  const oauthHref = (p: Provider) => `/api/auth/${p}`;

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      if (!password) {
        await sendSetupEmail("setup");
        return;
      }
      const res = await fetch("/api/auth/password/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        provider?: Provider;
      };
      if (res.ok && json.status === "ok") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (json.status === "needs_setup") {
        await sendSetupEmail("setup");
        return;
      }
      if (json.status === "provider_conflict" && json.provider) {
        setConflictProvider(json.provider);
        setMode("provider-conflict");
        return;
      }
      if (json.status === "rate_limited") {
        setFormError("Too many attempts. Please wait a minute and try again.");
        return;
      }
      setFormError("Email or password isn't right.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendSetupEmail(kind: "setup" | "forgot") {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        provider?: Provider;
      };
      if (json.status === "provider_conflict" && json.provider) {
        setConflictProvider(json.provider);
        setMode("provider-conflict");
        return;
      }
      if (res.ok) {
        setMode("check-email");
        return;
      }
      if (json.status === "rate_limited") {
        setFormError("Too many attempts. Please wait a minute and try again.");
        return;
      }
      setFormError("Please enter a valid email address.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      void kind;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tal-cream-soft via-tal-cream to-[#f3d9b8]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-2 lg:items-start rounded-3xl overflow-hidden shadow-sm border border-tal-line bg-white">
          {/* Left panel — brand + story */}
          <div className="bg-tal-cream-soft p-8 lg:p-12 flex flex-col">
            <BrandLogo className="h-14 w-auto self-start mb-8 lg:mb-10" priority />

            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-tal-plum leading-tight mb-6 lg:mb-8">
              Organise your life.
              <br />
              Reduce the stress.
            </h1>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <BulletIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </BulletIcon>
                <span className="text-tal-plum-dark text-sm lg:text-base pt-1">
                  Store all your important information in one secure place.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <BulletIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                    <path d="M8 7h8M8 11h8M8 15h5" />
                  </svg>
                </BulletIcon>
                <span className="text-tal-plum-dark text-sm lg:text-base pt-1">
                  Learn practical life skills with step-by-step guidance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <BulletIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </BulletIcon>
                <span className="text-tal-plum-dark text-sm lg:text-base pt-1">
                  Stay on top of renewals, reminders and important dates.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <BulletIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </BulletIcon>
                <span className="text-tal-plum-dark text-sm lg:text-base pt-1">
                  Your data is private, secure and always in your control.
                </span>
              </li>
            </ul>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE_URL}
              alt="Someone organising their home life"
              className="rounded-2xl w-full h-48 lg:h-56 object-cover mt-auto"
            />
          </div>

          {/* Right panel — sign in */}
          <div className="bg-white p-8 lg:px-12 lg:py-10">
            <div className="max-w-sm w-full mx-auto">
              <div className="text-center mb-6">
                <div className="mx-auto w-10 h-10 rounded-full bg-tal-cream flex items-center justify-center mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4c373c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M6 6c2 2 4 3 6 3s4-1 6-3M6 12c2 2 4 3 6 3s4-1 6-3M6 18c2 2 4 3 6 3s4-1 6-3" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-semibold text-tal-plum">
                  Welcome
                </h2>
                <p className="text-tal-plum-soft text-sm mt-1">Let&apos;s get you organised.</p>
              </div>

              {mode === "oauth" && (
                <>
                  <div className="space-y-3">
                    <a
                      href={oauthHref("google")}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </a>
                    <a
                      href={oauthHref("microsoft")}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                    >
                      <MicrosoftIcon />
                      Continue with Microsoft
                    </a>
                    <a
                      href={oauthHref("apple")}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                    >
                      <AppleIcon />
                      Continue with Apple
                    </a>
                  </div>

                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-tal-line" />
                    <span className="px-3 text-xs uppercase tracking-wide text-tal-plum-soft">
                      or
                    </span>
                    <div className="flex-1 h-px bg-tal-line" />
                  </div>

                  {EMAIL_SIGNIN_ENABLED ? (
                    <button
                      type="button"
                      onClick={() => setMode("email")}
                      className="w-full h-12 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition"
                    >
                      Continue with email
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Email sign-in coming soon"
                      className="w-full h-12 rounded-xl border border-tal-line bg-white text-tal-plum-soft font-medium cursor-not-allowed"
                    >
                      Continue with email
                    </button>
                  )}

                  {formError && (
                    <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                      {formError}
                    </p>
                  )}

                  <p className="text-center text-xs text-tal-plum-soft mt-6">
                    By continuing you agree to our{" "}
                    <span className="underline">Terms &amp; Conditions</span> and{" "}
                    <span className="underline">Privacy Policy</span>.
                  </p>

                  <ul className="mt-6 pt-6 border-t border-tal-line space-y-2.5">
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 flex-shrink-0 rounded-full bg-tal-cream flex items-center justify-center text-tal-plum">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                        </svg>
                      </span>
                      <span className="text-sm text-tal-plum-dark">Australian owned and operated</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 flex-shrink-0 rounded-full bg-tal-cream flex items-center justify-center text-tal-plum">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 10h1a3 3 0 0 1 0 6h-1M6 10H5a3 3 0 0 0 0 6h1M6 10a6 6 0 0 1 12 0v6H6z" />
                        </svg>
                      </span>
                      <span className="text-sm text-tal-plum-dark">Secure cloud storage</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 flex-shrink-0 rounded-full bg-tal-cream flex items-center justify-center text-tal-plum">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="10" width="16" height="11" rx="2" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      <span className="text-sm text-tal-plum-dark">Built for privacy</span>
                    </li>
                  </ul>
                </>
              )}

              {mode === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm mb-1 text-tal-plum-dark">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl border border-tal-line px-3 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm mb-1 text-tal-plum-dark">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-tal-line px-3 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
                    />
                    <p className="text-xs text-tal-plum-soft mt-1">
                      New here, or don&apos;t have a password yet? Leave this blank
                      — we&apos;ll email you a link to create one.
                    </p>
                  </div>

                  {formError && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition disabled:opacity-60"
                  >
                    {submitting ? "Please wait…" : "Continue"}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("oauth");
                        setFormError(null);
                      }}
                      className="text-tal-plum-soft hover:text-tal-plum"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendSetupEmail("forgot")}
                      disabled={submitting || !email}
                      className="text-tal-plum hover:underline disabled:opacity-50"
                    >
                      Forgot password
                    </button>
                  </div>
                </form>
              )}

              {mode === "check-email" && (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-lg font-semibold text-tal-plum">
                    Check your email
                  </h3>
                  <p className="text-tal-plum-soft">
                    We&apos;ve sent a link to <strong>{email}</strong> to set or
                    reset your password. The link expires soon — please check your
                    inbox (and spam folder).
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("email")}
                    className="text-sm text-tal-plum-soft hover:text-tal-plum"
                  >
                    Back
                  </button>
                </div>
              )}

              {mode === "provider-conflict" && conflictProvider && (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-lg font-semibold text-tal-plum">
                    Use {providerLabels[conflictProvider]} to sign in
                  </h3>
                  <p className="text-tal-plum-soft">
                    <strong>{email}</strong> is already linked to{" "}
                    {providerLabels[conflictProvider]}.
                  </p>
                  <a
                    href={oauthHref(conflictProvider)}
                    className="inline-block h-12 leading-12 px-6 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition"
                  >
                    Continue with {providerLabels[conflictProvider]}
                  </a>
                  <div>
                    <button
                      type="button"
                      onClick={() => setMode("oauth")}
                      className="text-sm text-tal-plum-soft hover:text-tal-plum"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
