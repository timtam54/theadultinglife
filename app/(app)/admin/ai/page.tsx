import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "AI setup" };

export default async function AdminAIPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        AI setup
      </h1>
      <p className="text-tal-plum-soft mb-8">
        The Adulting Life uses OpenAI to read documents like driver's
        licences, Medicare cards and passports, then fills in the record
        automatically. Follow the steps below to configure the API key.
        Once the key is saved, features like{" "}
        <span className="font-medium">Scan document</span> on the New Record
        page start working.
      </p>

      <div className="rounded-2xl border border-tal-line bg-tal-cream-soft p-4 mb-8">
        <div className="text-sm">
          <span className="font-medium">OpenAI (GPT):</span>{" "}
          {openaiConfigured ? (
            <span className="text-green-700 font-medium">Configured ✓</span>
          ) : (
            <span className="text-tal-plum-soft">Not configured</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-tal-line bg-white p-6">
          <h2 className="font-display text-xl text-tal-plum mb-1">
            OpenAI setup
          </h2>
          <p className="text-sm text-tal-plum-soft mb-4">
            Around 1–3¢ per document scan.
          </p>

          <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
            <li>
              Go to{" "}
              <a
                href="https://platform.openai.com"
                target="_blank"
                rel="noreferrer"
                className="text-tal-plum underline"
              >
                platform.openai.com
              </a>{" "}
              and sign up (or sign in).
            </li>
            <li>
              Open <span className="font-medium">Settings → Billing</span> →{" "}
              <span className="font-medium">Add payment method</span> — a
              card must be on file.
            </li>
            <li>
              Set a monthly usage limit under{" "}
              <span className="font-medium">Billing → Limits</span> — $10 is
              plenty for testing.
            </li>
            <li>
              Open <span className="font-medium">API Keys</span> →{" "}
              <span className="font-medium">+ Create new secret key</span>.
              Name it{" "}
              <span className="font-mono text-xs bg-tal-cream px-1 py-0.5 rounded">
                theadultinglife
              </span>
              .
            </li>
            <li>
              Copy the key — it starts with{" "}
              <span className="font-mono text-xs bg-tal-cream px-1 py-0.5 rounded">
                sk-proj-
              </span>{" "}
              or{" "}
              <span className="font-mono text-xs bg-tal-cream px-1 py-0.5 rounded">
                sk-
              </span>
              . <span className="font-medium">Only shown once.</span>
            </li>
            <li>
              Send the key to Tim securely. He'll paste it into the app's
              environment variables as{" "}
              <span className="font-mono text-xs bg-tal-cream px-1 py-0.5 rounded">
                OPENAI_API_KEY
              </span>{" "}
              and redeploy.
            </li>
          </ol>

          <div className="rounded-xl bg-tal-cream-soft border border-tal-line p-3 text-sm">
            <div className="font-medium text-tal-plum mb-1">Cost check</div>
            <div className="text-tal-plum-soft">
              About 1–3 Australian cents per document scan. Live usage in
              platform.openai.com → Usage.
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-tal-line bg-white p-6">
          <h2 className="font-display text-xl text-tal-plum mb-1">
            What the key unlocks
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-tal-plum-soft">
            <li>
              <span className="font-medium text-tal-plum">
                Scan document
              </span>{" "}
              button on <span className="italic">Personal → New record</span>{" "}
              — reads a driver's licence, Medicare card, or passport photo
              and fills in name, number, expiry, address, etc.
            </li>
            <li>
              Future features (Health → prescriptions, Employment → payslips,
              Admin → bills) will use the same key.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-tal-line bg-white p-6">
          <h2 className="font-display text-xl text-tal-plum mb-1">
            Safety notes
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-tal-plum-soft">
            <li>
              Never share the API key in email, Slack, or Discord — treat it
              like a password.
            </li>
            <li>
              If the key is ever exposed, revoke it at
              platform.openai.com → API Keys → Revoke, then generate a fresh
              one.
            </li>
            <li>
              Documents scanned by the app are sent to OpenAI for processing.
              OpenAI says it doesn't use API inputs to train their models,
              but this is worth being aware of if scanning very sensitive
              documents.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
