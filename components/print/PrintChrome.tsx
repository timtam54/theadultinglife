"use client";

// Shared print-view chrome so every downloadable PDF the user gets looks
// the same: slim plum header bar with title / subtitle / For + a
// centred footer with generated-on date + confidentiality line.
//
// Colour override is available for Emergency (red) so it stays distinct
// from the everyday plum documents.

import type { ReactNode } from "react";

export interface PrintChromeProps {
  title: string;
  subtitle?: string;
  userName?: string;
  meta?: ReactNode;
  // "plum" (default) for everyday docs; "red" for emergency prints.
  tone?: "plum" | "red";
  children: ReactNode;
}

export function PrintHeader({
  title,
  subtitle,
  userName,
  meta,
  tone = "plum",
}: Omit<PrintChromeProps, "children">) {
  const bg = tone === "red" ? "bg-red-700" : "bg-tal-plum";
  return (
    <div
      className={`${bg} text-white rounded-lg px-5 py-3 flex items-center justify-between gap-4 mb-6 print:rounded-none print-force-bg`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Plum-background variant of the mark so it stays visible on
            the coloured header. Rendered as a plain <img> (not next/image)
            so the print pipeline embeds it directly. */}
        <img
          src="/LogoWhite.png"
          alt=""
          width={36}
          height={36}
          className="shrink-0 h-9 w-9 object-contain"
        />
        <div className="min-w-0">
          <div className="font-display text-xl leading-tight truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-white/75 text-xs mt-0.5 truncate">
              {subtitle}
            </div>
          )}
          {meta && <div className="text-white/70 text-xs mt-1">{meta}</div>}
        </div>
      </div>
      {userName && (
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-white/60">
            For
          </div>
          <div className="text-sm">{userName}</div>
        </div>
      )}
    </div>
  );
}

export function PrintFooter() {
  const generatedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <footer className="mt-10 pt-3 border-t border-tal-plum-dark/20 text-[10px] text-tal-plum-soft flex items-center justify-between">
      <span>Generated from The Adulting Life · {generatedOn}</span>
      <span>Confidential · shared with recipient&apos;s permission</span>
    </footer>
  );
}

// The sticky "Print / Save PDF" banner shown at the top of the on-screen
// preview. Hidden when the browser goes into print mode.
export function PrintBanner({
  tone = "plum",
  onPrint,
}: {
  tone?: "plum" | "red";
  onPrint: () => void;
}) {
  const btnBg = tone === "red" ? "bg-red-600" : "bg-black";
  return (
    <div className="no-print sticky top-0 z-10 px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span>
            A print dialog should open. Choose <strong>Save as PDF</strong>.
          </span>
          <div className="text-xs text-tal-plum-soft mt-0.5">
            For the best look, tick{" "}
            <strong>More settings → Background graphics</strong> and untick{" "}
            <strong>Headers and footers</strong>.
          </div>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className={`shrink-0 h-9 px-3 rounded-xl ${btnBg} text-white text-sm font-medium`}
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

// Standard @page / @media print rules used by every print view.
// print-force-bg forces the header's coloured fill and its white logo
// to actually render — by default Chrome / Safari strip background
// colours from printed pages unless the user ticks "Background graphics".
export function PrintStyles() {
  return (
    <style>{`
      @page { size: A4; margin: 16mm 14mm 20mm 14mm; }
      @media print {
        .no-print { display: none !important; }
        body { background: white !important; }
        .print-avoid-break { break-inside: avoid; }
        .print-page-break { break-before: page; }
        .print-force-bg {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-force-bg img { display: block !important; }
      }
    `}</style>
  );
}
