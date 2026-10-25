import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { registerFonts } from "@/lib/services/complete-export/pdf";
import { BrandEntry, FORM, PLANNER_ACCENT, PageChrome, TitleBlock, brand, lotusImage, plainName } from "@/lib/services/pdf-brand";

// One branded PDF layout for the app's documents (forms, sections,
// Emergency, Family Members, the Peace of Mind Planner…) so every
// "Download PDF" and "Share PDF" looks the same. The look itself — copied
// from the printed Organiser forms and Planner — lives in pdf-brand.

export interface DocPdfBlock {
  title?: string | null;
  fields?: { label: string; value: string }[];
  body?: string | null;
  /** Small grey note under the block, e.g. "Attached: passport.pdf". */
  note?: string | null;
}

export interface DocPdfGroup {
  heading: string;
  /** Optional sub-heading per person / section inside the group. */
  sections: { heading?: string | null; hint?: string | null; blocks: DocPdfBlock[] }[];
}

export interface DocPdfInput {
  title: string;
  subtitle?: string | null;
  /** Shown under the title, e.g. "Prepared for Stephanie…". */
  intro?: string | null;
  groups: DocPdfGroup[];
  emptyText?: string;
  filename: string;
  /** Organiser form style (default) or the printed Planner's style. */
  variant?: "organiser" | "planner";
  /** Colour strip across the top — the section's divider colour. */
  accent?: string | null;
}

export async function renderDocPdf(raw: DocPdfInput): Promise<{ bytes: Uint8Array; filename: string }> {
  registerFonts();
  const variant = raw.variant ?? "organiser";
  const input: DocPdfInput = {
    ...raw,
    title: plainName(raw.title),
    filename: plainName(raw.filename),
    groups: raw.groups.map((g) => ({
      ...g,
      heading: plainName(g.heading),
      sections: g.sections.map((sec) => ({
        ...sec,
        heading: sec.heading ? plainName(sec.heading) : sec.heading,
        // A block with nothing in it (e.g. no costs entered yet) isn't shown.
        blocks: sec.blocks.filter((b) => b.title || b.body || b.note || (b.fields ?? []).length > 0),
      })),
    })),
  };
  const accent = input.accent ?? (variant === "planner" ? PLANNER_ACCENT : FORM.frame);
  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const empty = input.groups.every((g) => g.sections.every((sec) => sec.blocks.length === 0));
  const showGroupHeading = (heading: string) => input.groups.length > 1 || heading !== input.title;

  const buf = await renderToBuffer(
    <Document title={`${input.title} — The Adulting Life`} author="The Adulting Life">
      <Page size="A4" style={brand.page}>
        <PageChrome accent={accent} runningTitle={[input.title, input.subtitle].filter(Boolean).join(" — ")} />
        <TitleBlock variant={variant} title={input.title} subtitle={input.subtitle} date={date} />
        {input.intro ? <Text style={brand.intro}>{input.intro}</Text> : null}
        {empty && <Text>{input.emptyText ?? "Nothing has been added yet."}</Text>}
        {input.groups.map((g, gi) => {
          if (g.sections.every((sec) => sec.blocks.length === 0)) return null;
          const sections = g.sections.map((sec, si) =>
            sec.blocks.length === 0 ? null : variant === "planner" ? (
              <View key={si}>
                {sec.heading ? (
                  <Text style={brand.pSection} minPresenceAhead={40}>
                    {sec.heading}
                  </Text>
                ) : null}
                {sec.hint ? <Text style={brand.pHint}>{sec.hint}</Text> : null}
                {sec.blocks.map((b, bi) => (
                  <BrandEntry key={bi} variant="planner" title={b.title} fields={b.fields ?? []} body={b.body} note={b.note} />
                ))}
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                <Image src={lotusImage()} style={brand.pDivider} />
              </View>
            ) : (
              <View key={si}>
                {sec.heading ? (
                  <View style={brand.row} minPresenceAhead={40}>
                    <Text style={brand.headText}>{sec.heading}</Text>
                    <View style={brand.headFill} />
                  </View>
                ) : null}
                {sec.hint ? (
                  <View style={brand.row}>
                    <Text style={brand.hint}>{sec.hint}</Text>
                  </View>
                ) : null}
                {sec.blocks.map((b, bi) => (
                  <BrandEntry key={bi} variant="organiser" title={b.title} fields={b.fields ?? []} body={b.body} note={b.note} />
                ))}
              </View>
            )
          );
          return variant === "planner" ? (
            <View key={gi}>
              {showGroupHeading(g.heading) ? (
                <Text style={brand.pGroup} minPresenceAhead={60}>
                  {g.heading}
                </Text>
              ) : null}
              {sections}
            </View>
          ) : (
            <View key={gi} style={brand.table}>
              {showGroupHeading(g.heading) ? (
                <View style={[brand.row, { backgroundColor: accent }]} minPresenceAhead={40}>
                  <Text style={brand.groupText}>{g.heading}</Text>
                </View>
              ) : null}
              {sections}
            </View>
          );
        })}
      </Page>
    </Document>
  );
  return { bytes: new Uint8Array(buf), filename: input.filename.replace(/[\\/:*?"<>|]+/g, "-") };
}
