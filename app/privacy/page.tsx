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
            Last updated 30 August 2026
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
                take, and device and browser information. We also record the
                IP address your request came from so we can keep the service
                reliable and investigate suspicious activity. We do not use
                your IP address to derive your physical location.
              </li>
            </ul>
            <p>
              We only collect information the app genuinely needs to work.
              Fields marked optional are optional — you can leave them blank
              and still use every feature they belong to.
            </p>

            <h2>Sensitive personal information</h2>
            <p>
              The Adulting Life is built to hold the kind of information that
              matters most. Depending on which folders and forms you use, that
              can include:
            </p>
            <ul>
              <li>
                <strong>Health information</strong> — doctors, medications,
                medical history, health insurance, immunisations, blood tests
                and advanced health directives.
              </li>
              <li>
                <strong>Emergency information</strong> — next-of-kin,
                emergency contacts and instructions.
              </li>
              <li>
                <strong>Identity documents</strong> — passports, driver
                licences, birth certificates, Medicare and other government
                IDs, including scans and photos.
              </li>
              <li>
                <strong>Financial records</strong> — bank accounts, tax file
                numbers, superannuation, insurances, receipts and other
                financial paperwork.
              </li>
              <li>
                <strong>Personal legacy content</strong> — wills, funeral
                wishes, letters, apologies and last words in the Peace of Mind
                Planner.
              </li>
            </ul>
            <p>
              This information is only ever visible to you and to people you
              deliberately share it with. The Peace of Mind Planner is
              private to the owner by default and is never shared with the
              rest of your family group unless you explicitly grant access,
              per person and per item. Anyone you grant access to receives an
              email letting them know what they can see. You can revoke that
              access at any time.
            </p>
            <p>
              <strong>Tax File Numbers (TFN).</strong> We do not ask you to
              type your TFN into any form in the app. If you upload a document
              that happens to include your TFN (for example a tax return or
              payment summary), consider covering or redacting the TFN first
              — it isn&apos;t needed for the app to work and Australian
              privacy rules place extra restrictions on how TFNs can be
              handled.
            </p>

            <h2>AI features and consent</h2>
            <p>
              Some features (receipt scanning, document scanning, TAL AI chat,
              text polish, voice-to-text) send content to our AI provider
              (OpenAI) so it can read a photo, transcribe audio or draft
              wording for you. Before any of these features runs for the first
              time, we show a clear consent message such as:
            </p>
            <blockquote>
              <em>
                This information will be securely sent to our AI provider to
                perform this feature. It may contain personal or sensitive
                information. Would you like to continue?
              </em>
            </blockquote>
            <p>
              You choose <strong>Continue</strong> or <strong>Cancel</strong>.
              Consent is per-feature and per-device — you can reset it at any
              time from your account settings. Content sent to OpenAI for
              these features is not used to train their models.
            </p>
            <p>
              AI responses are general guidance only, never personal legal,
              financial, tax or medical advice. Please check important
              decisions with a qualified professional.
            </p>

            <h2>How we use your data</h2>
            <ul>
              <li>To provide the service you signed up for.</li>
              <li>To let you share content with people you choose.</li>
              <li>To secure your account and prevent abuse.</li>
              <li>
                To send <strong>transactional emails</strong> (sign-in links,
                password reset, share notifications, receipt exports, delete
                confirmations). These are essential to running your account
                and you cannot opt out of them while your account is active.
              </li>
              <li>
                To send occasional <strong>marketing emails</strong> (product
                updates, new features, tips). These are separate from
                transactional emails and every one contains an{" "}
                <em>unsubscribe</em> link. Unsubscribing from marketing does
                NOT affect your account or the transactional emails you
                receive.
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

            <h2>Account deletion &amp; retention</h2>
            <p>
              We keep your data for as long as your account is active. You can
              delete your account at any time from your settings. When you do:
            </p>
            <ul>
              <li>
                Your account is <strong>disabled immediately</strong> so no
                one (including you) can sign in.
              </li>
              <li>
                Your data is <strong>permanently deleted after 30 days</strong>{" "}
                — including records, uploads, Planner content, form answers,
                receipts and files. We send you an email confirming the
                schedule.
              </li>
              <li>
                During the 30-day window you can cancel the deletion by
                signing in and choosing <em>Cancel deletion</em>. Nothing is
                lost.
              </li>
              <li>
                A small amount of data may be retained where the law requires
                it (e.g. billing history), and de-identified analytics events
                may remain.
              </li>
            </ul>

            <h2>Your rights and how to use them</h2>
            <p>
              Under the Australian Privacy Principles you can ask us to
              access, correct, export or delete your personal data, and you
              can complain if you&apos;re not happy with how we&apos;ve
              handled your information.
            </p>
            <p>
              Most requests you can action yourself in-app. If you need us to
              do it, email{" "}
              <a href="mailto:privacy@theadultinglife.com.au">
                privacy@theadultinglife.com.au
              </a>{" "}
              from the address on your account and tell us which of the
              following you&apos;d like. We reply within 30 days (usually much
              sooner).
            </p>

            <h3>Access</h3>
            <p>
              You can browse everything we hold about you directly in the app.
              If you&apos;d like a compiled export in one file, use{" "}
              <em>Settings → Download your organiser</em> for JSON, or the{" "}
              <em>Export to Excel</em> button on any records folder / the
              Planner. Ask us and we&apos;ll send a full package (all your
              content + your uploaded files) by secure link.
            </p>

            <h3>Correction</h3>
            <p>
              Edit anything you&apos;ve entered directly in the form or folder
              where it lives. If something we&apos;ve recorded about you (an
              audit log entry, a subscription record) is incorrect and you
              can&apos;t fix it in-app, email us with what needs changing and
              we&apos;ll correct it.
            </p>

            <h3>Export</h3>
            <p>
              Every folder and the Planner have an <em>Export to Excel</em>{" "}
              button. Settings has a full account export as JSON. If you need
              a different format (say, PDF for handing to a professional),
              email us.
            </p>

            <h3>Deletion</h3>
            <p>
              Delete your account from <em>Settings → Delete account</em>{" "}
              (primary account holder only). Your data is retained for 30
              days in case you change your mind, then permanently removed.
              Full detail is under <em>Account deletion &amp; retention</em>{" "}
              above.
            </p>

            <h3>Making a privacy complaint</h3>
            <p>
              If you think we&apos;ve mishandled your personal information,
              email us at{" "}
              <a href="mailto:privacy@theadultinglife.com.au">
                privacy@theadultinglife.com.au
              </a>{" "}
              with &quot;Privacy complaint&quot; in the subject line and a
              description of what happened. We&apos;ll acknowledge within 5
              business days and give you a substantive response within 30
              days. If you&apos;re not satisfied with our response, you can
              lodge a complaint directly with the Office of the Australian
              Information Commissioner (OAIC):
            </p>
            <ul>
              <li>
                Web:{" "}
                <a
                  href="https://www.oaic.gov.au/privacy/privacy-complaints"
                  target="_blank"
                  rel="noreferrer"
                >
                  oaic.gov.au/privacy/privacy-complaints
                </a>
              </li>
              <li>Phone: 1300 363 992</li>
            </ul>

            <h3>Identity verification</h3>
            <p>
              To protect your data we&apos;ll confirm any access, export or
              deletion request came from you before we act on it — usually by
              replying to the email on your account. For sensitive requests
              we may ask you to sign in to the app and confirm the request
              from within your account.
            </p>

            <h2>If something goes wrong (data breach procedure)</h2>
            <p>
              If we ever become aware of unauthorised access to your data or
              another security incident that meets the notifiable-data-breach
              threshold under Australian law, we will:
            </p>
            <ul>
              <li>
                Contain the incident and investigate what information was
                affected.
              </li>
              <li>
                Notify affected users directly by email, describing what
                happened, what data was involved, what we&apos;re doing and
                what you can do to protect yourself.
              </li>
              <li>
                Notify the Office of the Australian Information Commissioner
                (OAIC) when the incident meets the notification threshold
                under the Notifiable Data Breaches scheme.
              </li>
              <li>
                Publish a summary on our status page once the incident is
                contained.
              </li>
            </ul>

            <h2>Cookies</h2>
            <p>
              We use a small number of cookies to keep you signed in and to
              remember your preferences. No third-party advertising or tracking
              cookies.
            </p>

            <h2>Analytics &amp; telemetry</h2>
            <p>
              We record a small amount of usage information so we can see how
              people use the app and where to improve it. Specifically:
            </p>
            <p>
              <strong>We do not log the content you enter into the app.</strong>{" "}
              Our analytics never sees the contents of your records, document
              filenames, form answers, notes, emergency details, receipt line
              items, planner answers, or the text of your AI conversations.
            </p>
            <p>
              What analytics records is simply <em>which</em> feature you
              used — never <em>what</em> you typed:
            </p>
            <ul>
              <li>
                The URL path of pages you visit (e.g. that you opened the
                Health section) and the device or browser channel (web, PWA,
                iOS Safari, Android Chrome).
              </li>
              <li>
                Named events such as <em>account created</em>,{" "}
                <em>category opened</em>, <em>record created</em>,{" "}
                <em>record updated</em>, <em>record deleted</em>,{" "}
                <em>document uploaded</em>, <em>receipt added</em>,{" "}
                <em>reminder created</em>, <em>task created</em>,{" "}
                <em>lesson started</em>, <em>lesson completed</em>, and{" "}
                <em>onboarding completed</em>.
              </li>
              <li>
                Standard technical info tied to each event: your user ID and
                email (so events can be told apart per user), the IP address
                the request came from and your browser user-agent.
              </li>
            </ul>
            <p>
              <strong>One exception — AI feedback.</strong> If you click{" "}
              <em>Report</em> under a TAL AI response (to flag it as
              unhelpful or unsafe), we save that specific AI response so we
              can review it and improve the model prompts. Your own messages
              in that conversation are not saved, only the AI reply you
              reported.
            </p>

            <h2>Third-party services we use</h2>
            <p>
              We only pass data to providers that are necessary to run the
              service. For each one below we&apos;ve listed what they receive
              and whether they process data outside Australia.
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> (Sydney region) — hosts your account,
                database rows and uploaded files. All personal data lives here.
                Stored and processed in Australia. Supabase&apos;s own support
                team may access infrastructure logs on your project when
                troubleshooting; they cannot read file contents.
              </li>
              <li>
                <strong>Vercel</strong> (application hosting) — serves the app
                itself. Web-request metadata (URL, IP address, browser type,
                request timings) passes through Vercel&apos;s global edge
                network, which includes servers outside Australia. Your form
                answers, document contents and personal data are NOT sent to
                Vercel — they are sent from your browser directly to Supabase.
              </li>
              <li>
                <strong>OpenAI</strong> (United States) — powers the AI
                features (receipt scanning, document scanning, TAL AI chat,
                text polish, voice-to-text). Only the specific piece of content
                you&apos;re acting on is sent, and only after you consent the
                first time. Content sent to OpenAI is not used to train their
                models. See <em>AI features and consent</em> above.
              </li>
              <li>
                <strong>Google, Apple, Microsoft</strong> (sign-in providers)
                — if you choose to sign in with one of these, they verify your
                identity and pass us your email + basic profile (name, avatar).
                Nothing about the content in your account is shared back. All
                three operate globally.
              </li>
              <li>
                <strong>Square</strong> (Australia + United States) — handles
                subscription payments. Square receives your email, name and
                payment method (card details go directly to Square — we never
                see or store your card). Square is PCI-DSS certified. Some
                Square infrastructure is in the United States.
              </li>
              <li>
                <strong>Email delivery</strong> — transactional email (sign-in
                links, account notifications, receipt exports) is sent via our
                email provider. They receive the recipient email address and
                the email content.
              </li>
              <li>
                <strong>Browser push notification providers</strong> (Apple,
                Google, Mozilla) — the operating system push service on your
                device delivers reminder notifications when you enable them.
                We push a short message; the provider knows your device but
                not the account content.
              </li>
            </ul>
            <p>
              We do not currently use a third-party analytics or error
              monitoring service that receives your content. Our own usage
              logging is described under <em>Analytics &amp; telemetry</em>.
            </p>
            <p>
              Every provider listed here processes data under contract and only
              on our instructions.
            </p>

            <h2>General privacy questions</h2>
            <p>
              For anything not covered above, email{" "}
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
