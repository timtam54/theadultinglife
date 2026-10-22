import path from "node:path";
import fs from "node:fs";
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

// The branded "My Organiser" PDF inside the complete download: cover,
// contents, then each Organiser section and folder in the app's order,
// followed by the Planner's written sections and the receipts register.
// Uploaded documents aren't embedded — each is listed by its path in the
// download's Documents folder.

const FONT_DIR = path.join(process.cwd(), "lib/export-fonts");
const LOGO = path.join(process.cwd(), "public/Logo.png");

let fontsReady = false;
function registerFonts() {
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

const C = {
  ink: "#23191b",
  soft: "#6b545a",
  line: "#e6dcd0",
  cream: "#fae6d0",
  creamSoft: "#fff5e6",
  forest: "#2f5c5c",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Source Sans",
    fontSize: 10,
    color: C.ink,
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 48,
  },
  header: {
    position: "absolute",
    top: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.soft,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.soft,
  },
  cover: {
    backgroundColor: C.cream,
    padding: 56,
    fontFamily: "Source Sans",
    color: C.ink,
    justifyContent: "space-between",
  },
  coverTitle: { fontFamily: "Poppins", fontWeight: 600, fontSize: 34, marginTop: 120 },
  coverSub: { fontSize: 14, color: C.soft, marginTop: 6 },
  sectionBand: {
    backgroundColor: C.forest,
    color: "#ffffff",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  sectionTitle: { fontFamily: "Poppins", fontWeight: 600, fontSize: 20 },
  folderTitle: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingBottom: 3,
    marginBottom: 6,
  },
  hint: { fontStyle: "italic", color: C.soft, fontSize: 9, marginBottom: 8 },
  person: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 10,
    color: C.forest,
    marginTop: 6,
    marginBottom: 4,
  },
  entry: {
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  entryTitle: { fontWeight: 600, fontSize: 11, marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "38%", color: C.soft, paddingRight: 8 },
  value: { width: "62%" },
  docs: { marginTop: 4, fontSize: 8.5, color: C.forest },
  tocCat: { fontFamily: "Poppins", fontWeight: 600, fontSize: 12, marginTop: 10, marginBottom: 3 },
  tocItem: { fontSize: 10, color: C.soft, marginLeft: 12, marginBottom: 1.5 },
  th: { fontWeight: 600, fontSize: 8.5, color: C.soft },
  td: { fontSize: 8.5 },
});

const money = (n: number | null) =>
  n == null ? "" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

function Chrome({ title }: { title: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text>The Adulting Life · My Organiser</Text>
        <Text>{title}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>Private and confidential</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function Fields({ entry }: { entry: ExportEntry }) {
  return (
    <>
      {entry.fields.map((f, i) => (
        <View key={i} style={s.row}>
          <Text style={s.label}>{f.label}</Text>
          <Text style={s.value}>{f.value}</Text>
        </View>
      ))}
      {entry.documents.length > 0 && (
        <Text style={s.docs}>Documents: {entry.documents.join(" · ")}</Text>
      )}
    </>
  );
}

/** One entry's box (or plain fields for a single, untitled entry). */
function Entry({ entry, boxed }: { entry: ExportEntry; boxed: boolean }) {
  if (!boxed) return <Fields entry={entry} />;
  return (
    <View style={s.entry}>
      {entry.title ? <Text style={s.entryTitle}>{entry.title}</Text> : null}
      <Fields entry={entry} />
    </View>
  );
}

/** A folder as a flat run of page-level blocks. Each block is kept whole
 *  on one page, and headings travel with the first entry under them so a
 *  folder title or person's name is never stranded at the foot of a page.
 *  (Blocks must be direct children of the Page — react-pdf squashes
 *  unbreakable blocks nested inside other views.) Very long entries are
 *  allowed to break. */
function folderBlocks(folder: ExportFolder) {
  const blocks: React.ReactElement[] = [];
  const keep = (e?: ExportEntry) => !e || e.fields.length <= 14;
  const heading = (
    <>
      <Text style={s.folderTitle}>{folder.name}</Text>
      {folder.hint ? <Text style={s.hint}>{folder.hint}</Text> : null}
    </>
  );
  if (folder.people.length === 0) {
    blocks.push(
      <View key={`${folder.id}-h`} wrap={false}>
        {heading}
      </View>
    );
  }
  folder.people.forEach((p, i) => {
    const boxed = p.entries.length > 1 || p.entries.some((e) => e.title);
    const [first, ...rest] = p.entries;
    blocks.push(
      <View key={`${folder.id}-${i}`} wrap={!keep(first)}>
        {i === 0 && heading}
        <Text style={s.person}>{p.personName}</Text>
        {first && <Entry entry={first} boxed={boxed} />}
      </View>
    );
    rest.forEach((e, j) =>
      blocks.push(
        <View key={`${folder.id}-${i}-${j}`} wrap={!keep(e)}>
          <Entry entry={e} boxed={boxed} />
        </View>
      )
    );
  });
  blocks.push(
    <View key={`${folder.id}-end`} style={{ marginBottom: 16 }}>
      {folder.documents.length > 0 && (
        <Text style={s.docs}>Folder documents: {folder.documents.join(" · ")}</Text>
      )}
    </View>
  );
  return blocks;
}

function OrganiserPdf({ data }: { data: CompleteExportData }) {
  const date = data.generatedAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fileCount = data.files.length;
  return (
    <Document title="My Organiser — The Adulting Life" author="The Adulting Life">
      {/* Cover */}
      <Page size="A4" style={s.cover}>
        <View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={fs.readFileSync(LOGO)} style={{ width: 220 }} />
          <Text style={s.coverTitle}>My Organiser</Text>
          {data.familyName ? <Text style={s.coverSub}>{data.familyName}</Text> : null}
          <Text style={{ fontSize: 11, marginTop: 28, color: C.soft }}>Prepared for</Text>
          {data.people.map((p) => (
            <Text key={p.id} style={{ fontSize: 13, marginTop: 2 }}>
              {p.name}
            </Text>
          ))}
        </View>
        <View>
          <Text style={{ fontSize: 10, color: C.soft }}>Downloaded {date}</Text>
          <Text style={{ fontSize: 10, color: C.soft, marginTop: 4 }}>
            {fileCount > 0
              ? `Your ${fileCount} uploaded ${fileCount === 1 ? "document is" : "documents are"} in the Documents folder of this download, and every folder is also in the Excel workbook.`
              : "Every folder is also in the Excel workbook in this download."}
          </Text>
          <Text style={{ fontSize: 9, color: C.soft, marginTop: 10 }}>
            This document contains private information. Store it somewhere safe.
          </Text>
        </View>
      </Page>

      {/* Contents */}
      <Page size="A4" style={s.page}>
        <Chrome title="Contents" />
        <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Contents</Text>
        {data.categories.map((c) => (
          <View key={c.id} wrap={false}>
            <Text style={s.tocCat}>{c.label}</Text>
            {c.folders.map((f) => (
              <Text key={f.id} style={s.tocItem}>
                {f.name}
              </Text>
            ))}
          </View>
        ))}
        {data.planner.length > 0 && <Text style={s.tocCat}>Peace of Mind Planner</Text>}
        {data.receipts.length > 0 && <Text style={s.tocCat}>Receipts</Text>}
        {data.categories.length === 0 && data.planner.length === 0 && data.receipts.length === 0 && (
          <Text style={{ color: C.soft, marginTop: 10 }}>Nothing has been added to the organiser yet.</Text>
        )}
      </Page>

      {/* Organiser sections */}
      {data.categories.map((c) => (
        <Page key={c.id} size="A4" style={s.page}>
          <Chrome title={c.label} />
          <View style={s.sectionBand}>
            <Text style={s.sectionTitle}>{c.label}</Text>
          </View>
          {c.folders.flatMap((f) => folderBlocks(f))}
        </Page>
      ))}

      {/* Planner */}
      {data.planner.length > 0 && (
        <Page size="A4" style={s.page}>
          <Chrome title="Peace of Mind Planner" />
          <View style={s.sectionBand}>
            <Text style={s.sectionTitle}>Peace of Mind Planner</Text>
          </View>
          {data.planner.map((p, i) => (
            <View key={i}>
              <Text style={s.person}>{p.personName}</Text>
              {p.items.map((it, j) => (
                <View key={j} style={s.entry}>
                  <Text style={s.entryTitle}>{it.heading}</Text>
                  <Text style={{ lineHeight: 1.4 }}>{it.body}</Text>
                </View>
              ))}
            </View>
          ))}
        </Page>
      )}

      {/* Receipts */}
      {data.receipts.length > 0 && (
        <Page size="A4" style={s.page}>
          <Chrome title="Receipts" />
          <View style={s.sectionBand}>
            <Text style={s.sectionTitle}>Receipts</Text>
          </View>
          <View style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 3 }]} fixed>
            <Text style={[s.th, { width: "14%" }]}>Date</Text>
            <Text style={[s.th, { width: "20%" }]}>Person</Text>
            <Text style={[s.th, { width: "36%" }]}>Supplier / description</Text>
            <Text style={[s.th, { width: "15%", textAlign: "right" }]}>Amount</Text>
            <Text style={[s.th, { width: "15%", textAlign: "right" }]}>Deductible</Text>
          </View>
          {data.receipts.map((r, i) => (
            <View key={i} style={s.row} wrap={false}>
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
