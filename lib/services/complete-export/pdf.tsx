import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type React from "react";
import type { CompleteExportData, ExportEntry, ExportFolder } from "./data";
import type { CategoryId } from "@/lib/db/types";
import { BrandEntry, FORM, PLANNER_ACCENT, PageChrome, SECTION_COLOUR, TitleBlock, brand, logoImage, plainName } from "@/lib/services/pdf-brand";

// The branded "My Organiser" PDF inside the complete download: cover,
// contents, then each Organiser section and folder in the app's order,
// followed by the Planner's written sections and the receipts register.
// Uploaded documents aren't embedded — each is listed by its path in the
// download's Documents folder.

const FONT_DIR = path.join(process.cwd(), "lib/export-fonts");

let fontsReady = false;
export function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Poppins",
    fonts: [
      { src: path.join(FONT_DIR, "Poppins-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Poppins-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Source Sans",
    fonts: [
      { src: path.join(FONT_DIR, "SourceSans3-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "SourceSans3-Semibold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "SourceSans3-It.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  // Don't split words across lines.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const s = StyleSheet.create({
  cover: { fontFamily: "Source Sans", color: FORM.ink, paddingTop: 70, paddingBottom: 60, paddingHorizontal: 56, justifyContent: "space-between" },
  coverTitle: { fontFamily: "Poppins", fontWeight: 600, fontSize: 30, textAlign: "center", marginTop: 26 },
  coverSub: { fontSize: 13, color: FORM.soft, textAlign: "center", marginTop: 4 },
  coverLabel: { fontSize: 10, color: FORM.soft, textAlign: "center", marginTop: 26 },
  coverName: { fontSize: 13, textAlign: "center", marginTop: 2 },
  bars: { flexDirection: "row", height: 16, marginBottom: 14 },
  divider: { borderRadius: 4, paddingVertical: 22, paddingHorizontal: 20, marginBottom: 16 },
  dividerTitle: { fontFamily: "Poppins", fontWeight: 600, fontSize: 22 },
  dividerList: { fontSize: 9, marginTop: 8, lineHeight: 1.5 },
  folderRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: FORM.grid, marginTop: 10 },
  person: { fontFamily: "Poppins", fontWeight: 600, fontSize: 9.5, paddingVertical: 2.5, paddingHorizontal: 4, width: "100%", borderRightWidth: 1, borderColor: FORM.grid, backgroundColor: "#ffffff" },
  tocTitle: { fontFamily: "Poppins", fontWeight: 600, fontSize: 16, marginBottom: 8 },
  tocCat: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 3 },
  tocSwatch: { width: 10, height: 10, marginRight: 6 },
  tocCatText: { fontFamily: "Poppins", fontWeight: 600, fontSize: 11 },
  tocItem: { fontSize: 9.5, color: FORM.soft, marginLeft: 16, marginBottom: 1.5 },
  th: { fontWeight: 600, fontSize: 8.5, paddingVertical: 2.5, paddingHorizontal: 3, backgroundColor: FORM.label, borderRightWidth: 1, borderColor: FORM.grid },
  td: { fontSize: 8.5, paddingVertical: 2, paddingHorizontal: 3, backgroundColor: FORM.answer, borderRightWidth: 1, borderColor: FORM.grid },
});

const money = (n: number | null) =>
  n == null ? "" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const accentOf = (id: CategoryId) => SECTION_COLOUR[id] ?? FORM.frame;

/** A folder as a flat run of page-level blocks, in the printed form style:
 *  the folder name as a coloured heading row, then each person and entry as
 *  rows of the form table. Headings travel with the first entry under them
 *  so a folder title or person's name is never stranded at the foot of a
 *  page. (Blocks must be direct children of the Page — react-pdf squashes
 *  unbreakable blocks nested inside other views.) Very long entries are
 *  allowed to break. */
function folderBlocks(folder: ExportFolder, accent: string) {
  const blocks: React.ReactElement[] = [];
  const keep = (e?: ExportEntry) => !e || e.fields.length <= 14;
  const heading = (
    <>
      <View style={[s.folderRow, { backgroundColor: accent }]}>
        <Text style={brand.groupText}>{plainName(folder.name)}</Text>
      </View>
      {folder.hint ? (
        <View style={brand.row}>
          <Text style={brand.hint}>{folder.hint}</Text>
        </View>
      ) : null}
    </>
  );
  if (folder.people.length === 0) {
    blocks.push(
      <View key={`${folder.id}-h`} wrap={false}>
        {heading}
      </View>
    );
  }
  const docsNote = (docs: string[]) => (docs.length ? `Documents: ${docs.join(" · ")}` : null);
  folder.people.forEach((p, i) => {
    const [first, ...rest] = p.entries;
    blocks.push(
      <View key={`${folder.id}-${i}`} wrap={!keep(first)}>
        {i === 0 && heading}
        <View style={brand.row}>
          <Text style={s.person}>{p.personName}</Text>
        </View>
        {first && <BrandEntry variant="organiser" title={first.title} fields={first.fields} note={docsNote(first.documents)} />}
      </View>
    );
    rest.forEach((e, j) =>
      blocks.push(
        <View key={`${folder.id}-${i}-${j}`} wrap={!keep(e)}>
          <BrandEntry variant="organiser" title={e.title} fields={e.fields} note={docsNote(e.documents)} />
        </View>
      )
    );
  });
  if (folder.documents.length > 0) {
    blocks.push(
      <View key={`${folder.id}-end`} style={brand.row} wrap={false}>
        <Text style={brand.note}>Folder documents: {folder.documents.join(" · ")}</Text>
      </View>
    );
  }
  return blocks;
}

function OrganiserPdf({ data }: { data: CompleteExportData }) {
  const date = data.generatedAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const fileCount = data.files.length;
  const bars: CategoryId[] = ["personal", "health", "education", "employment", "admin"] as CategoryId[];
  return (
    <Document title="My Organiser — The Adulting Life" author="The Adulting Life">
      {/* Cover */}
      <Page size="A4" style={s.cover}>
        <View style={brand.frame} fixed />
        <View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={logoImage()} style={{ width: 260, alignSelf: "center" }} />
          <Text style={s.coverTitle}>My Organiser</Text>
          {data.familyName ? <Text style={s.coverSub}>{data.familyName}</Text> : null}
          <Text style={s.coverLabel}>Prepared for</Text>
          {data.people.map((p) => (
            <Text key={p.id} style={s.coverName}>
              {p.name}
            </Text>
          ))}
        </View>
        <View>
          <View style={s.bars}>
            {bars.map((b) => (
              <View key={b} style={{ flex: 1, backgroundColor: accentOf(b) }} />
            ))}
          </View>
          <Text style={{ fontSize: 10, color: FORM.soft, textAlign: "center" }}>Downloaded {date}</Text>
          <Text style={{ fontSize: 9.5, color: FORM.soft, marginTop: 4, textAlign: "center" }}>
            {fileCount > 0
              ? `Your ${fileCount} uploaded ${fileCount === 1 ? "document is" : "documents are"} in the Documents folder of this download, and every folder is also in the Excel workbook.`
              : "Every folder is also in the Excel workbook in this download."}
          </Text>
          <Text style={{ fontSize: 9, color: FORM.soft, marginTop: 8, textAlign: "center" }}>
            This document contains private information. Store it somewhere safe.
          </Text>
          <Text style={{ fontSize: 9, fontWeight: 600, color: "#991b1b", marginTop: 4, textAlign: "center" }}>
            UNOFFICIAL RECORD – For personal reference only. Not a government-issued document.
          </Text>
        </View>
      </Page>

      {/* Contents */}
      <Page size="A4" style={brand.page}>
        <PageChrome accent={FORM.frame} runningTitle="My Organiser — Contents" />
        <Text style={s.tocTitle}>Contents</Text>
        {data.categories.map((c) => (
          <View key={c.id} wrap={false}>
            <View style={s.tocCat}>
              <View style={[s.tocSwatch, { backgroundColor: accentOf(c.id) }]} />
              <Text style={s.tocCatText}>{c.label}</Text>
            </View>
            {c.folders.map((f) => (
              <Text key={f.id} style={s.tocItem}>
                {plainName(f.name)}
              </Text>
            ))}
          </View>
        ))}
        {data.planner.length > 0 && (
          <View style={s.tocCat}>
            <View style={[s.tocSwatch, { backgroundColor: PLANNER_ACCENT }]} />
            <Text style={s.tocCatText}>Peace of Mind Planner</Text>
          </View>
        )}
        {data.receipts.length > 0 && (
          <View style={s.tocCat}>
            <View style={[s.tocSwatch, { backgroundColor: FORM.frame }]} />
            <Text style={s.tocCatText}>Receipts</Text>
          </View>
        )}
        {data.categories.length === 0 && data.planner.length === 0 && data.receipts.length === 0 && (
          <Text style={{ color: FORM.soft, marginTop: 10 }}>Nothing has been added to the organiser yet.</Text>
        )}
      </Page>

      {/* Organiser sections — each opens like its printed divider */}
      {data.categories.map((c) => (
        <Page key={c.id} size="A4" style={brand.page}>
          <PageChrome accent={accentOf(c.id)} runningTitle={`My Organiser — ${c.label}`} />
          <View style={[s.divider, { backgroundColor: accentOf(c.id) }]}>
            <Text style={s.dividerTitle}>{c.label}</Text>
            <Text style={s.dividerList}>{c.folders.map((f) => plainName(f.name)).join("  ·  ")}</Text>
          </View>
          {c.folders.flatMap((f) => folderBlocks(f, accentOf(c.id)))}
        </Page>
      ))}

      {/* Planner — in the printed Planner's style */}
      {data.planner.length > 0 && (
        <Page size="A4" style={brand.page}>
          <PageChrome accent={PLANNER_ACCENT} runningTitle="Peace of Mind Planner" />
          <TitleBlock variant="planner" title="Peace of Mind Planner" date={date} />
          {data.planner.map((p, i) => (
            <View key={i}>
              <Text style={brand.pGroup}>{p.personName}</Text>
              {p.items.map((it, j) => (
                <BrandEntry key={j} variant="planner" title={it.heading} fields={[]} body={it.body} />
              ))}
            </View>
          ))}
        </Page>
      )}

      {/* Receipts */}
      {data.receipts.length > 0 && (
        <Page size="A4" style={brand.page}>
          <PageChrome accent={FORM.frame} runningTitle="My Organiser — Receipts" />
          <Text style={[brand.title, { marginBottom: 8 }]}>Receipts</Text>
          <View style={[brand.row, { borderTopWidth: 1 }]} fixed>
            <Text style={[s.th, { width: "14%" }]}>Date</Text>
            <Text style={[s.th, { width: "20%" }]}>Person</Text>
            <Text style={[s.th, { width: "36%" }]}>Supplier / description</Text>
            <Text style={[s.th, { width: "15%", textAlign: "right" }]}>Amount</Text>
            <Text style={[s.th, { width: "15%", textAlign: "right" }]}>Deductible</Text>
          </View>
          {data.receipts.map((r, i) => (
            <View key={i} style={brand.row} wrap={false}>
              <Text style={[s.td, { width: "14%" }]}>{r.date}</Text>
              <Text style={[s.td, { width: "20%" }]}>{r.personName}</Text>
              <Text style={[s.td, { width: "36%" }]}>
                {[r.supplier, r.description].filter(Boolean).join(" — ")}
              </Text>
              <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{money(r.amount)}</Text>
              <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{money(r.deductible)}</Text>
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}

export async function renderOrganiserPdf(data: CompleteExportData): Promise<Uint8Array> {
  registerFonts();
  const buf = await renderToBuffer(<OrganiserPdf data={data} />);
  return new Uint8Array(buf);
}
