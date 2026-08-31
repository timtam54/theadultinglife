import type { Metadata } from "next";
import { ResetAiConsentsButton } from "@/components/ResetAiConsentsButton";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { PrivacyRequestForm } from "@/components/PrivacyRequestForm";
import { ResetSetupGuideButton } from "@/components/ResetSetupGuideButton";
import { requireSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await findUserById(session.user.id);
  const isPrimary = user?.is_primary === true;

  return (
    <div>
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-4 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Settings
          </span>
          <h1 className="font-display text-2xl leading-tight">Your account</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-tal-line bg-white p-6 mb-4">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          Download your organiser
        </h2>
        <p className="text-sm text-tal-plum-soft mb-4">
          Export everything in your family&apos;s Adulting Life as a single JSON
          file. That includes records, folder data, uploaded document metadata
          and learning progress. Useful for backup or if you want to move your
          data elsewhere.
        </p>
        <a
          href="/api/export/organiser"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Download organiser (.json)
        </a>
        <p className="text-xs text-tal-plum-soft mt-3">
          Uploaded files themselves aren&apos;t included in the JSON. It
          contains their metadata (filename, category, uploader) so you can
          find them.
        </p>
      </section>

      <section className="rounded-2xl border border-tal-line bg-white p-6 mb-4">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          AI and your data
        </h2>
        <p className="text-sm text-tal-plum-soft mb-3">
          Some features in The Adulting Life use AI to save you time. Think
          reading receipts, extracting details from documents, tidying up
          wording and turning your voice into text. Here&apos;s what you need
          to know:
        </p>
        <ul className="list-disc pl-5 text-sm text-tal-plum-soft space-y-1.5 mb-4">
          <li>
            AI features send the specific thing you&apos;re working on (a
            receipt photo, a document scan, a paragraph of text or a voice
            recording) to OpenAI, which powers those features.
          </li>
          <li>
            Nothing is sent to AI without your explicit consent. The first time
            you use each feature we ask you to confirm.
          </li>
          <li>
            OpenAI doesn&apos;t keep your input to train their models. They
            process it, return a result, and drop it.
          </li>
          <li>
            You can always type details in by hand and skip AI entirely.
          </li>
          <li>
            TAL AI (the chat) provides general guidance and wording help. Not
            legal, financial, tax or medical advice.
          </li>
        </ul>
        <ResetAiConsentsButton />
      </section>

      <section className="rounded-2xl border border-tal-line bg-white p-6 mb-4">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          Setup guide
        </h2>
        <p className="text-sm text-tal-plum-soft mb-4">
          Restart the Setup guide from the beginning. This only resets your
          progress through the guide. Your records, uploads, and everything
          else in your account stay exactly where they are.
        </p>
        <ResetSetupGuideButton />
      </section>

      <section className="rounded-2xl border border-tal-line bg-white p-6 mb-4">
        <h2 className="font-display text-xl text-tal-plum mb-1">
          Privacy requests
        </h2>
        <p className="text-sm text-tal-plum-soft mb-4">
          Ask us to access, correct, export or delete your personal
          information, or make a privacy complaint. Most requests you can
          action yourself in the app. This form is for anything you need us
          to do for you.
        </p>
        <PrivacyRequestForm />
      </section>

      {isPrimary && !user?.deleted_at && <DeleteAccountSection />}
    </div>
  );
}
