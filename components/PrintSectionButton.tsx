"use client";

import { PdfActions } from "@/components/PdfActions";

// Download PDF / Share PDF for one Peace of Mind Planner section — the same
// branded PDF as the whole Planner, just this section.
export function PrintSectionButton({ slug }: { slug: string; className?: string }) {
  return (
    <PdfActions
      downloadUrl={`/api/export/doc?kind=planner-section&section=${encodeURIComponent(slug)}`}
      shareUrl="/api/export/doc/email"
      shareBody={{ kind: "planner-section", section: slug }}
      shareLabel="A PDF of this Planner section, made by The Adulting Life"
      what="this section"
    />
  );
}
