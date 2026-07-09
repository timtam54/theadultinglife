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
      // silence unused-var warning
      void kind;
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-tal-cream-soft px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto h-16 w-auto" priority />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tal-line p-8">
          <h2 className="font-display text-2xl font-semibold text-tal-plum text-center mb-6">
            Welcome
          </h2>

          {mode === "oauth" && (
            <>
              <div className="space-y-3">
                <a
                  href={oauthHref("google")}
                  className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                >
                  Continue with Google
                </a>
                <a
                  href={oauthHref("microsoft")}
                  className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                >
                  Continue with Microsoft
                </a>
                <a
                  href={oauthHref("apple")}
                  className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-tal-line bg-white hover:bg-tal-cream-soft transition text-tal-plum-dark font-medium"
                >
                  Continue with Apple
                </a>
              </div>

              {EMAIL_SIGNIN_ENABLED && (
                <>
                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-tal-line" />
                    <span className="px-3 text-xs uppercase tracking-wide text-tal-plum-soft">
                      or
                    </span>
                    <div className="flex-1 h-px bg-tal-line" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMode("email")}
                    className="w-full h-12 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition"
                  >
                    Continue with email
                  </button>
                </>
              )}

              {formError && (
                <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                  {formError}
                </p>
              )}
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

        <p className="text-center text-xs text-tal-plum-soft mt-6">
          By continuing you agree to our terms &amp; privacy policy.
        </p>
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
