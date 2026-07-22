import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The Adulting Life terms of service.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>

          <div className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-tal-plum prose-p:text-tal-plum prose-p:leading-relaxed prose-a:text-tal-plum prose-strong:text-tal-plum">
            <p>
              Welcome to The Adulting Life. By creating an account or using our
              service, you agree to these Terms &amp; Conditions. Please read
              them carefully.
            </p>

            <h2>1. Your account</h2>
            <p>
              You must be at least 16 years old to use The Adulting Life. You
              are responsible for keeping your login credentials secure and for
              all activity on your account. Notify us immediately if you
              suspect unauthorised access.
            </p>

            <h2>2. Your content</h2>
            <p>
              You retain ownership of everything you upload — documents, form
              answers, notes, files. We store your content solely to provide
              the service to you and the family members you choose to share it
              with. We do not sell your content and we do not use it to train
              third-party models.
            </p>

            <h2>3. Acceptable use</h2>
            <p>
              Don&apos;t use The Adulting Life to store content that is
              illegal, that infringes someone else&apos;s rights, or that could
              harm our systems or other users. We can suspend accounts that
              breach these rules.
            </p>

            <h2>4. Service availability</h2>
            <p>
              We aim for the service to be available around the clock, but we
              can&apos;t guarantee uninterrupted access. We may take the
              service offline for maintenance, updates, or reasons outside our
              control.
            </p>

            <h2>5. Subscriptions and payment</h2>
            <p>
              Some features require a paid subscription. Prices, billing
              periods, and refund terms are shown at the point of purchase.
              You can cancel at any time; access continues until the end of
              your current billing period.
            </p>

            <h2>6. Disclaimer</h2>
            <p>
              The Adulting Life is an organising and learning tool, not
              professional advice. Nothing in the app is legal, financial,
              medical, or tax advice. Always speak to a qualified professional
              for decisions that matter.
            </p>

            <h2>7. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, we are not liable for
              indirect, incidental, or consequential loss arising from your use
              of the service. Our total liability to you is limited to the
              amount you have paid us in the 12 months before the claim.
            </p>

            <h2>8. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. If the change is
              material we&apos;ll let you know via email or an in-app notice
              before it takes effect.
            </p>

            <h2>9. Contact</h2>
            <p>
              Questions? Get in touch at{" "}
              <a href="mailto:hello@theadultinglife.com.au">
                hello@theadultinglife.com.au
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
