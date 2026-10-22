// Marks app-generated PDFs that resemble official documents (birth
// certificate, passport) so they can never be mistaken for the real thing:
// The Adulting Life logo, the disclaimer, and a diagonal watermark that also
// prints (print-color-adjust: exact).

export const UNOFFICIAL_TEXT =
  "UNOFFICIAL RECORD – For personal reference only. Not a government-issued document.";

/** Logo + disclaimer strip, shown above and below the document. */
export function UnofficialBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border-2 border-red-700 bg-white px-4 py-2.5 my-3"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- embedded directly by the print pipeline */}
      <img src="/Logo.png" alt="The Adulting Life" className="h-8 w-auto shrink-0" />
      <p className="text-[11px] sm:text-xs font-semibold text-red-800 leading-snug">{UNOFFICIAL_TEXT}</p>
    </div>
  );
}

/** Diagonal watermark. Place inside a `relative overflow-hidden` card. */
export function UnofficialWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <div className="-rotate-[30deg] text-center text-red-700/20 font-black uppercase leading-none">
        <div className="text-5xl sm:text-7xl tracking-widest">Unofficial</div>
        <div className="text-5xl sm:text-7xl tracking-widest mt-2">Record</div>
        <div className="text-sm sm:text-base tracking-[0.3em] mt-3">Not a government document</div>
      </div>
    </div>
  );
}
