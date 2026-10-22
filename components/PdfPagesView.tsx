"use client";

import { useEffect, useRef, useState } from "react";

// Draws every page of a PDF with Mozilla's PDF.js so it can be read and
// scrolled on an iPad, iPhone or Android phone. Embedded PDFs there show
// only the first page, or nothing at all. Pages are drawn one after another
// at the width of the screen.

export function PdfPagesView({ data }: { data: Blob }) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const el = holder.current;
    if (!el) return;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await data.arrayBuffer()) }).promise;
        const width = Math.min(el.clientWidth || window.innerWidth, 1000);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        el.replaceChildren();
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.className = "block mx-auto mb-3 bg-white shadow";
          canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
          el.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
          if (n === 1 && !cancelled) setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="w-full h-full overflow-auto overscroll-contain p-3" style={{ WebkitOverflowScrolling: "touch" }}>
      {state === "loading" && <div className="text-white/80 text-sm text-center py-10">Loading document…</div>}
      {state === "error" && (
        <div className="mx-auto max-w-sm rounded-xl bg-white p-5 text-sm text-tal-plum text-center">
          This document couldn&apos;t be shown here. Use Download to open it on your device.
        </div>
      )}
      <div ref={holder} />
    </div>
  );
}
