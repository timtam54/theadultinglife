"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

function SetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      const res = await fetch("/api/auth/password/check-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        email?: string;
      };
      if (res.ok && json.status === "ok") {
        setState("ready");
        setEmail(json.email ?? null);
      } else {
        setState("invalid");
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, name: name || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
      };
      if (res.ok && json.status === "ok") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (json.status === "weak" && json.message) {
        setError(json.message);
        return;
      }
      if (json.status === "invalid_or_expired") {
        setState("invalid");
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-tal-cream-soft px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto h-16 w-auto" priority />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-tal-line p-8">
          {state === "loading" && (
            <p className="text-center text-tal-plum-soft">Checking your link…</p>
          )}

          {state === "invalid" && (
            <div className="text-center space-y-4">
              <h2 className="font-display text-xl font-semibold text-tal-plum">
                This link isn&apos;t valid
              </h2>
              <p className="text-tal-plum-soft">
                It may have already been used or expired. Head back to sign in
                and request a fresh one.
              </p>
              <a
                href="/login"
                className="inline-block h-12 leading-12 px-6 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition"
              >
                Back to sign in
              </a>
            </div>
          )}

          {state === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-tal-plum text-center">
                Set your password
              </h2>
              {email && (
                <p className="text-center text-sm text-tal-plum-soft">
                  For <strong>{email}</strong>
                </p>
              )}
              <div>
                <label htmlFor="name" className="block text-sm mb-1">
                  Your name (optional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-tal-line px-3 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-xl border border-tal-line px-3 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
                />
                <p className="text-xs text-tal-plum-soft mt-1">
                  At least 10 characters, letters and numbers.
                </p>
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm mb-1">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={10}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full h-11 rounded-xl border border-tal-line px-3 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark transition disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save and continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}
