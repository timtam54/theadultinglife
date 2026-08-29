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
            Last updated 29 August 2026
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
              You must be at least 18 years old to use The Adulting Life. You
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
              Some features require a paid subscription. Full pricing
              (including GST), billing period (monthly or annual), the
              automatic-renewal date, and how to cancel are shown clearly at
              the point of purchase and again in your account settings. You
              can cancel at any time — access continues until the end of the
              period you&apos;ve already paid for, then the subscription
              stops.
            </p>
            <p>
              <strong>Cancelling your subscription is separate from
              deleting your account.</strong> Cancelling stops future
              billing but keeps your data and account. Deleting your account
              is a separate action described in the Privacy Policy.
            </p>
            <p>
              Nothing in these Terms limits any rights you have under the
              Australian Consumer Law, including your right to a refund,
              repair or replacement where the service isn&apos;t delivered
              with due care and skill or isn&apos;t fit for purpose.
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
              <strong>Australian Consumer Law comes first.</strong> Nothing in
              this section excludes, restricts or modifies any consumer
              guarantee, right or remedy that the Australian Consumer Law
              (Schedule 2 to the Competition and Consumer Act 2010) gives you
              and which cannot lawfully be excluded.
            </p>
            <p>
              Subject to that, and to the fullest extent permitted by law, we
              are not liable for indirect, incidental or consequential loss
              arising from your use of the service. Where our liability is
              not otherwise excluded and can lawfully be limited, our total
              liability to you for any claim is limited to the amount you
              have paid us in the 12 months before the claim.
            </p>

            <h2>8. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. If the change is
              material we&apos;ll let you know via email or an in-app notice
              before it takes effect.
            </p>
            <p>
              For changes that affect price or a subscription you&apos;ve
              already paid for, the new price or terms will only apply from
              your next renewal — never mid-period. You&apos;ll receive
              advance notice of the change with time to cancel before renewal
              if you don&apos;t agree.
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
