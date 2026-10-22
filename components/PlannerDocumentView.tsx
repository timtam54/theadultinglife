import type { DocBlock, DocSection, PlannerDocument } from "@/lib/services/planner-document";

// The Peace of Mind Planner laid out as one document, in the physical
// Planner's order: cover, contents, then each group and section. Rendered
// inside the print chrome (print / Save as PDF) and on the secure share
// link. Server component — no client state.

function Block({ block }: { block: DocBlock }) {
  return (
    <div className="print-avoid-break rounded-lg border border-tal-plum-dark/15 p-4 mb-3">
      {block.title && <div className="font-semibold text-tal-plum-dark mb-2">{block.title}</div>}
      {block.fields.length > 0 && (
        <dl className="grid grid-cols-[minmax(8rem,38%)_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {block.fields.map((f, i) => (
            <div key={i} className="contents">
              <dt className="text-tal-plum-soft">{f.label}</dt>
              <dd className="text-tal-plum-dark whitespace-pre-wrap break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {block.body && (
        <p className="text-[13px] leading-relaxed text-tal-plum-dark whitespace-pre-wrap font-serif">{block.body}</p>
      )}
      {block.images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {block.images.map((img, i) => (
            <figure key={i} className="print-avoid-break">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL, printed as-is */}
              <img src={img.url} alt={img.filename} className="w-full rounded border border-tal-line object-contain max-h-80" />
              <figcaption className="text-[10px] text-tal-plum-soft mt-1 truncate">{img.filename}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {block.files.length > 0 && (
        <p className="mt-2 text-[11px] text-tal-plum-soft">
          Attached: {block.files.join(" · ")}
        </p>
      )}
    </div>
  );
}

/** One section's entries on their own (single-section print). */
export function PlannerSectionBlocks({ section }: { section: DocSection }) {
  return (
    <>
      {section.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </>
  );
}

export function PlannerDocumentView({ doc }: { doc: PlannerDocument }) {
  const date = doc.generatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="text-tal-plum-dark">
      {/* Cover */}
      <section className="rounded-2xl bg-tal-cream print-force-bg px-8 py-14 mb-8 print:min-h-[85vh] flex flex-col justify-between">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- embedded directly by the print pipeline */}
          <img src="/Logo.png" alt="The Adulting Life" className="h-16 w-auto" />
          <h1 className="font-display text-4xl mt-16">Peace of Mind Planner</h1>
          <p className="text-lg mt-2">{doc.ownerName}</p>
          {doc.preparedFor && (
            <p className="mt-6 text-sm text-tal-plum-soft">
              Prepared for <span className="font-semibold text-tal-plum-dark">{doc.preparedFor}</span> — the
              information {doc.ownerName || "the owner"} has chosen to share with them.
            </p>
          )}
        </div>
        <div className="mt-16 text-xs text-tal-plum-soft">
          <p>Prepared {date}</p>
          <p className="mt-1">
            This document contains private information. Keep it somewhere safe and tell the people who need it
            where to find it.
          </p>
        </div>
      </section>

      {/* Contents */}
      <section className="print-page-break mb-8">
        <h2 className="font-display text-2xl mb-3">Contents</h2>
        {doc.groups.length === 0 ? (
          <p className="text-sm text-tal-plum-soft">
            {doc.preparedFor ? "Nothing has been shared yet." : "Nothing has been added to the Planner yet."}
          </p>
        ) : (
          <ol className="space-y-2 text-sm">
            {doc.groups.map((g) => (
              <li key={g.title}>
                <div className="font-semibold">{g.title}</div>
                <div className="text-tal-plum-soft">{g.sections.map((s) => s.title).join(" · ")}</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Groups and sections */}
      {doc.groups.map((g) => (
        <section key={g.title} className="print-page-break mb-10">
          <h2 className="font-display text-2xl text-white bg-tal-forest print-force-bg rounded-lg px-5 py-3 mb-5">
            {g.title}
          </h2>
          {g.sections.map((s) => {
            const [first, ...rest] = s.blocks;
            return (
              <div key={s.slug} className="mb-6">
                {/* The heading stays on the same page as the first entry. */}
                <div className="print-avoid-break">
                  <h3 className="font-display text-lg border-b border-tal-plum-dark/40 pb-1 mb-2">{s.title}</h3>
                  {s.hint && <p className="text-xs italic text-tal-plum-soft mb-3">{s.hint}</p>}
                  {first && <Block block={first} />}
                </div>
                {rest.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
