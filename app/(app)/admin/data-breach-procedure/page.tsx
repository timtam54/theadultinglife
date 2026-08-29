import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "Data breach procedure",
  robots: { index: false, follow: false },
};

export default async function DataBreachProcedurePage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  return (
    <div className="max-w-4xl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          section { break-inside: avoid; }
          h2, h3 { break-after: avoid; }
        }
      `}</style>

      <div className="no-print flex items-baseline justify-between gap-3 mb-4">
        <div className="text-xs uppercase tracking-widest text-tal-plum-soft">
          Internal — superuser access only
        </div>
        <PrintButton />
      </div>

      <article className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-tal-plum prose-p:text-tal-plum prose-p:leading-relaxed prose-a:text-tal-plum prose-strong:text-tal-plum prose-li:text-tal-plum">
        <h1>The Adulting Life — Data Breach Procedure</h1>

        <p className="not-prose text-sm text-tal-plum-soft mb-6">
          <strong>Version 1.0 — 30 August 2026</strong>
          <br />
          <strong>Owner:</strong> Donna Fitzgerald (Privacy Officer + escalation)
          <br />
          <strong>Reviewed:</strong> at every incident and at least annually
        </p>

        <p>
          This document is our internal playbook for security incidents. It
          exists so that in a real incident nobody has to think about{" "}
          <em>what to do first</em> — they follow the steps. Keep this document
          in the repo, keep it version-controlled, and update it after every
          incident.
        </p>
        <p>
          The Adulting Life stores sensitive personal, health, financial and
          legacy information for Australian users. We are subject to the
          Privacy Act 1988 and the Notifiable Data Breaches (NDB) scheme
          (Part IIIC).
        </p>

        <hr />

        <h2>1. Roles</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-tal-line">
              <th className="text-left py-2 pr-4 font-medium">Role</th>
              <th className="text-left py-2 pr-4 font-medium">Person</th>
              <th className="text-left py-2 font-medium">Responsibilities</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-tal-line">
              <td className="py-2 pr-4"><strong>Privacy Officer</strong></td>
              <td className="py-2 pr-4">Donna Fitzgerald</td>
              <td className="py-2">Overall accountability, decides whether to notify OAIC and users, signs external communications</td>
            </tr>
            <tr className="border-b border-tal-line">
              <td className="py-2 pr-4"><strong>Technical lead / first responder</strong></td>
              <td className="py-2 pr-4">Tim Hams</td>
              <td className="py-2">First-hour containment, evidence capture, investigation, remediation</td>
            </tr>
            <tr className="border-b border-tal-line">
              <td className="py-2 pr-4"><strong>Escalation contact</strong></td>
              <td className="py-2 pr-4">Donna Fitzgerald</td>
              <td className="py-2">Called if the Technical lead is unreachable</td>
            </tr>
            <tr>
              <td className="py-2 pr-4"><strong>External advisors — engage as needed</strong></td>
              <td className="py-2 pr-4">Legal advisor, cyber insurer</td>
              <td className="py-2">Consulted for complex incidents (large scope, contested facts, media exposure)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm italic">
          Both principals must be reachable by mobile. Contact details live in
          the shared password vault, not in this document.
        </p>

        <hr />

        <h2>2. What counts as a security incident</h2>
        <p>Any of the following triggers this procedure:</p>
        <ul>
          <li>Unauthorised access to any user data (database, storage, backups, admin panel)</li>
          <li>A user reports they can see another user&apos;s data</li>
          <li>Loss or theft of any device (laptop, phone) that has active credentials</li>
          <li>Accidental disclosure — email/message with user data sent to wrong recipient</li>
          <li>Credential exposure — API key, service role key, session secret, or admin password leaked in source code, screenshot, chat, or public place</li>
          <li>Third-party provider notifies us of an incident affecting our data (Supabase, Vercel, Square, OpenAI, Gmail SMTP, push providers)</li>
          <li>Unusual pattern in <code>app_logs</code> or <code>audits</code> suggesting compromise (auth failures spike, service-role queries from unknown IPs, mass exports)</li>
          <li>Any confirmed successful phishing or credential-stuffing attack against a user or admin</li>
          <li>Bug that made private data visible to users who shouldn&apos;t have seen it</li>
        </ul>
        <p>
          If you&apos;re not sure whether something counts — treat it as an
          incident and let the Privacy Officer decide.
        </p>

        <hr />

        <h2>3. First hour — containment</h2>
        <p><strong>Technical lead executes immediately. Notify Privacy Officer in parallel.</strong></p>

        <h3>Step 1: Stop the bleeding</h3>
        <ul>
          <li>If credentials are compromised, rotate them immediately:
            <ul>
              <li>Supabase service role key → Supabase dashboard → Project Settings → API → Reset</li>
              <li>Session secret → generate new one with <code>openssl rand -hex 32</code>, update <code>SESSION_SECRET</code> in Vercel env, redeploy (this force-logs-out every user)</li>
              <li>Google/Microsoft/Apple OAuth secrets → provider consoles → rotate</li>
              <li>Square access token → Square Developer Dashboard → rotate</li>
              <li>OpenAI API key → platform.openai.com → revoke and create new</li>
              <li>Gmail SMTP app password → Google account → revoke and create new</li>
              <li>VAPID keys → generate new pair, update env vars</li>
            </ul>
          </li>
          <li>If a specific endpoint is being abused, disable it via a code push (return 503 from the route) then redeploy</li>
          <li>If a specific user account is compromised, set <code>deleted_at</code> on their row to block further logins while investigating</li>
        </ul>

        <h3>Step 2: Freeze evidence</h3>
        <ul>
          <li>Do NOT delete anything until instructed by the Privacy Officer</li>
          <li>Capture and save (into a private incident folder, not the codebase):
            <ul>
              <li>Full snapshot of <code>app_logs</code> for the relevant window</li>
              <li>Full snapshot of <code>audits</code> for the relevant window</li>
              <li>Any relevant Supabase query logs (Project Settings → Logs)</li>
              <li>Any relevant Vercel function logs</li>
              <li>Screenshots of what was reported (from user, admin, or monitoring)</li>
              <li>Timestamps of every action taken (kept as a running incident log — see template at bottom of this document)</li>
            </ul>
          </li>
        </ul>

        <h3>Step 3: Notify</h3>
        <ul>
          <li>Text/call the Privacy Officer with:
            <ul>
              <li>What happened, in one sentence</li>
              <li>Confirmed vs suspected scope</li>
              <li>What you&apos;ve done so far</li>
              <li>What decisions you need from her</li>
            </ul>
          </li>
        </ul>

        <hr />

        <h2>4. Investigation — first 72 hours</h2>
        <p>Privacy Officer leads. Technical lead executes.</p>

        <h3>Determine what data was affected</h3>
        <p>Query <code>audits</code> and <code>app_logs</code> to answer:</p>
        <ul>
          <li>Which user IDs and email addresses are involved?</li>
          <li>Which categories of information were accessed or exposed?
            <ul>
              <li>Account credentials (email, hashed passwords)</li>
              <li>Personal information (names, DOB, addresses, emergency contacts)</li>
              <li><strong>Health information</strong> (medical advisers, medications, health directives)</li>
              <li><strong>Identity documents</strong> (driver licences, passports, Medicare, birth certificates — including uploaded scans)</li>
              <li><strong>Financial records</strong> (bank accounts BSB + account numbers, super, insurance, receipts, tax documents)</li>
              <li><strong>Personal accounts / passwords</strong> (<code>personal.list_of_accounts</code> folder)</li>
              <li>Peace of Mind Planner content (wills, funeral wishes, letters, apologies, last words)</li>
              <li>Sharing grants (<code>item_access_grants</code> — who was shared with what)</li>
            </ul>
          </li>
          <li>Was data actually exfiltrated (removed from our systems) or only accessed?</li>
          <li>How many users are affected?</li>
          <li>What is the time window of the incident?</li>
        </ul>

        <h3>Determine root cause</h3>
        <ul>
          <li>What sequence of events led to the incident?</li>
          <li>Was it accidental disclosure, deliberate attack, provider failure, or bug?</li>
          <li>Is the vulnerability still present?</li>
          <li>Are other similar issues likely?</li>
        </ul>

        <h3>Fix the underlying issue</h3>
        <ul>
          <li>Deploy code fix if applicable</li>
          <li>Rotate any additional credentials</li>
          <li>Add specific monitoring/alerting for the pattern</li>
          <li>Update this document if the incident revealed a gap in procedure</li>
        </ul>

        <hr />

        <h2>5. NDB assessment — does OAIC need to be notified?</h2>
        <p>
          The <strong>Notifiable Data Breaches scheme</strong> requires
          notification to OAIC and affected users when ALL THREE tests are met:
        </p>
        <ol>
          <li>There has been <strong>unauthorised access, unauthorised disclosure, or loss</strong> of personal information, AND</li>
          <li>It is <strong>likely to result in serious harm</strong> to one or more individuals, AND</li>
          <li>We have been <strong>unable to prevent that harm</strong> through remedial action.</li>
        </ol>

        <h3>Serious harm — sensitivity multipliers</h3>
        <p>Assume &quot;likely serious harm&quot; if the exposed data includes any of:</p>
        <ul>
          <li>Health information → high sensitivity, protected under APP 6.2</li>
          <li>Identity documents (driver licence, passport, Medicare, birth certificate, including scans) → enables identity theft, credit fraud</li>
          <li><strong>Passwords, PINs, or account credentials</strong> from <code>personal.list_of_accounts</code> → immediate financial/account takeover risk</li>
          <li>Bank account numbers + BSB with statements → enables tailored phishing</li>
          <li>Emergency contacts + home address → doxxing/stalking risk</li>
          <li>Multiple items combined for one user → cumulative risk multiplier</li>
          <li>Data on a child under 18 → serious harm threshold is lower</li>
        </ul>
        <p>Assume &quot;not likely serious harm&quot; if the exposed data is only:</p>
        <ul>
          <li>Public-by-nature information (a user&apos;s name, business ABN, etc.)</li>
          <li>Test/dummy data</li>
          <li>Anonymous usage counts (already in the audits table by design)</li>
        </ul>

        <h3>Remedial action test</h3>
        <p>Did we act fast enough to prevent the harm? Examples:</p>
        <ul>
          <li>We rotated the key within minutes and confirmed no exfiltration = probably prevented harm</li>
          <li>Data was accessed but we can prove nothing was downloaded = likely prevented harm</li>
          <li>Data was exported to an attacker before we contained it = harm not prevented, must notify</li>
        </ul>

        <h3>The 30-day deadline</h3>
        <p>
          If the three-test result is <strong>yes</strong> (or we can&apos;t
          confidently say no) we must notify OAIC and affected users{" "}
          <strong>within 30 days of becoming aware</strong>. Do not wait for
          the investigation to finish before starting the notification draft.
        </p>

        <hr />

        <h2>6. Notifying affected users</h2>
        <p>
          If notification is required (or we choose to notify voluntarily for
          transparency), send from{" "}
          <code>hello@theadultinglife.com.au</code> using the template below.
          Do not use a form-letter tone — write as if to one person at a time.
        </p>

        <p><strong>Subject:</strong> Important — security incident affecting your Adulting Life account</p>

        <p><strong>Body template:</strong></p>
        <blockquote className="border-l-4 border-tal-line pl-4 italic">
          <p>Hi [Name],</p>
          <p>On [date] we discovered [brief factual description — &quot;an unauthorised person accessed some of the information stored in your account&quot;]. We want to be transparent with you about what happened and what you should do.</p>
          <p><strong>What happened.</strong> [Two or three sentences of plain-English explanation. Do not speculate. Do not blame others. State facts.]</p>
          <p><strong>What information was affected.</strong> [Specific list — &quot;your name, email address, and the contents of your Doctors folder&quot;. Not &quot;some personal information&quot;.]</p>
          <p><strong>What we&apos;ve done.</strong> [Specific list — &quot;we rotated all our security keys, forced every account to sign out and back in, and fixed the underlying issue in our code.&quot;]</p>
          <p><strong>What you should do.</strong> [Specific list — &quot;change your password on any other service where you used the same password&quot;, &quot;watch your bank statements for unusual transactions&quot;, &quot;consider contacting IDCARE (1800 595 160, idcare.org) if you&apos;re worried about identity fraud&quot;.]</p>
          <p><strong>What you can do next.</strong> If you have questions or want to talk to us, reply to this email or write to hello@theadultinglife.com.au. If you&apos;re not satisfied with our response, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au or 1300 363 992.</p>
          <p>We&apos;re sorry this happened, and we&apos;re doing everything we can to make sure it doesn&apos;t happen again.</p>
          <p>— Donna Fitzgerald<br />&nbsp;&nbsp;The Adulting Life</p>
        </blockquote>

        <hr />

        <h2>7. Notifying OAIC</h2>
        <p>
          If NDB threshold is met, submit via the OAIC&apos;s Notifiable Data
          Breach form:{" "}
          <a
            href="https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach"
            target="_blank"
            rel="noreferrer"
          >
            oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach
          </a>
        </p>
        <p>Include:</p>
        <ul>
          <li>Our organisation name, ABN, and contact details</li>
          <li>Description of the breach (what happened, when it happened, when we became aware)</li>
          <li>Kinds of information involved</li>
          <li>Number of individuals affected (or estimate with reasoning)</li>
          <li>Steps we&apos;ve taken to contain and prevent recurrence</li>
          <li>What we&apos;ve told (or plan to tell) affected users</li>
          <li>Recommendations we&apos;ve made to affected users</li>
        </ul>
        <p>Keep a copy of the submission in the incident folder.</p>

        <hr />

        <h2>8. Third-party provider incidents</h2>
        <p>
          If Supabase, Vercel, Square, OpenAI, Gmail, or any push provider
          notifies us of an incident affecting our data:
        </p>
        <ul>
          <li>Treat as a Section 3 incident and follow the same steps</li>
          <li>Document the provider&apos;s own timeline and remediation</li>
          <li>Assess independently — providers understate scope; do our own analysis</li>
          <li>Their notification to us does not remove our own obligation to notify OAIC and affected users if the NDB test is met</li>
        </ul>

        <hr />

        <h2>9. Post-incident review</h2>
        <p>
          Within 14 days of resolution, hold a review meeting (Privacy Officer
          + Technical lead + any external advisors used):
        </p>
        <ul>
          <li>What actually happened?</li>
          <li>Where did our procedure work? Where did it fail?</li>
          <li>What single change would have prevented this incident?</li>
          <li>What&apos;s on the fix list — and who owns each?</li>
          <li>Does this document need updating?</li>
        </ul>
        <p>
          Record the outcome in the incident folder. Update this document if
          procedure gaps were found.
        </p>

        <hr />

        <h2>10. Incident log template</h2>
        <p>
          Copy this into the incident folder at the start of every incident.
          Update in real time, timestamped.
        </p>
        <pre className="text-xs bg-tal-cream-soft border border-tal-line rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">{`Incident: [short name]
Reported by: [name / channel]
First noticed: [YYYY-MM-DD HH:MM]
Confirmed as incident: [YYYY-MM-DD HH:MM]

Log:
- HH:MM — [action taken, by whom]
- HH:MM — [action taken, by whom]
- ...

Scope determined: [YYYY-MM-DD HH:MM]
  Users affected: [count / list]
  Data affected: [categories]
  Data exfiltrated: [yes/no/unknown + reasoning]

NDB assessment: [YYYY-MM-DD HH:MM]
  Test 1 (unauthorised access / loss): [yes/no]
  Test 2 (likely serious harm): [yes/no + reasoning]
  Test 3 (unable to prevent harm): [yes/no + reasoning]
  Decision: [notify / do not notify]
  Signed off by: [Privacy Officer name]

Users notified: [YYYY-MM-DD HH:MM] [count]
OAIC notified: [YYYY-MM-DD HH:MM] [ref number]
Resolved: [YYYY-MM-DD HH:MM]

Root cause:
[one paragraph]

Fix:
[one paragraph]

Follow-ups:
- [ ] ...
- [ ] ...`}</pre>

        <hr />

        <h2>Version history</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-tal-line">
              <th className="text-left py-2 pr-4 font-medium">Version</th>
              <th className="text-left py-2 pr-4 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 pr-4">1.0</td>
              <td className="py-2 pr-4">30 Aug 2026</td>
              <td className="py-2">Initial version. Roles: Donna (Privacy Officer + escalation), Tim (Technical lead).</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}

