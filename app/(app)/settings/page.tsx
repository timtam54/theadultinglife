import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
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
          Export everything in your family&apos;s Adulting Life — records,
          folder data, uploaded document metadata, learning progress — as a
          single JSON file. Useful for backup or if you want to move your data
          elsewhere.
        </p>
        <a
          href="/api/export/organiser"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark transition-colors"
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
          Uploaded files themselves aren&apos;t included in the JSON — this
          contains their metadata (filename, category, uploader) so you can
          find them.
        </p>
      </section>
    </div>
  );
}
