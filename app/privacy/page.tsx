import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Adulting Life handles your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-tal-cream-soft via-tal-cream to-[#f3d9b8]">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <div className="text-center mb-8">
          <Link href="/">
            <BrandLogo className="h-16 lg:h-20 w-auto mx-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-tal-line shadow-sm p-8 lg:p-12">
          <div className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
            Last updated 22 July 2026
          </div>
          <h1 className="font-display text-3xl lg:text-4xl text-tal-plum mb-6">
            Privacy Policy
          </h1>

          <div className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-tal-plum prose-p:text-tal-plum prose-p:leading-relaxed prose-a:text-tal-plum prose-strong:text-tal-plum">
            <p>
              We take your privacy seriously. This policy explains what we
              collect, why we collect it, and the control you have over it.
            </p>

            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Account details</strong> — your name, email, and any
                profile info you choose to add.
              </li>
              <li>
                <strong>Content you create</strong> — records, uploads,
                templates, form answers, notes, learning progress.
              </li>
              <li>
                <strong>Usage data</strong> — pages you visit, actions you
                take, device and browser information, and rough location
                derived from your IP. Used only to keep the service reliable
                and to improve it.
              </li>
            </ul>

            <h2>How we use your data</h2>
            <ul>
              <li>To provide the service you signed up for.</li>
              <li>To let you share content with people you choose.</li>
              <li>To secure your account and prevent abuse.</li>
              <li>To send transactional emails (sign-in links, receipts).</li>
              <li>
                To send occasional product updates. You can opt out of these
                without losing access.
              </li>
            </ul>

            <h2>What we don&apos;t do</h2>
            <ul>
              <li>We don&apos;t sell your data.</li>
              <li>We don&apos;t rent your data to advertisers.</li>
              <li>
                We don&apos;t use your content to train third-party AI models.
              </li>
            </ul>

            <h2>Who we share data with</h2>
            <p>
              Only the service providers we need to run The Adulting Life
              (hosting, database, email delivery, authentication, payment
              processing, and error monitoring). They act on our instructions
              under contracts that require them to protect your data. We do
              not disclose personal information overseas beyond these
              processors.
            </p>

            <h2>Where your data lives</h2>
            <p>
              Your data is stored on Supabase infrastructure in the Sydney
              region. Files are held in encrypted storage; database rows are
              encrypted at rest.
            </p>

            <h2>Retention</h2>
            <p>
              We keep your data for as long as your account is active. If you
              delete your account, we remove your personal data within 30 days,
              except for records we are legally required to keep (e.g. billing
              history).
            </p>

            <h2>Your rights</h2>
            <p>
              You can access, correct, export, or delete your personal data at
              any time from your account settings, or by emailing us. If
              you&apos;re not happy with how we&apos;ve handled a request, you
              can complain to the Office of the Australian Information
              Commissioner (OAIC).
            </p>

            <h2>Cookies</h2>
            <p>
              We use a small number of cookies to keep you signed in and to
              remember your preferences. No third-party advertising or tracking
              cookies.
            </p>

            <h2>Contact</h2>
            <p>
              Privacy questions or requests?{" "}
              <a href="mailto:privacy@theadultinglife.com.au">
                privacy@theadultinglife.com.au
              </a>
              .
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-sm text-tal-plum-soft hover:text-tal-plum"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
