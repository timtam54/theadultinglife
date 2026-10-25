import path from "node:path";
import fs from "node:fs";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CategoryId } from "@/lib/db/types";
import { UNOFFICIAL_TEXT } from "@/components/print/UnofficialRecord";

// The look of every PDF the app makes, copied from Donna's printed material:
// - Organiser forms (General Information, Employee Information…): grey page
//   frame, centred logo, bold form title, then a bordered table with a grey
//   label column and lavender answer boxes, underlined headings inside it.
// - Section dividers: each Organiser section has its own colour, used as a
//   strip across the top of the page.
// - Peace of Mind Planner: the lotus mark, light capital headings and
//   ruled answer lines rather than filled boxes.

export const LOGO_FILE = path.join(process.cwd(), "public/Logo.png");
export const LOTUS_FILE = path.join(process.cwd(), "public/PlannerLotus.png");

export const FORM = {
  frame: "#8c8c8c",
  grid: "#a6a6a6",
  label: "#f2f2f2",
  answer: "#dde3fb",
  ink: "#3a3a3a",
  soft: "#777777",
};

/** The divider colours of the printed Organiser. */
export const SECTION_COLOUR: Record<CategoryId, string> = {
  personal: "#a58dbf",
  health: "#e8de5f",
  education: "#73c2d3",
  employment: "#f27678",
  admin: "#92cb66",
} as Record<CategoryId, string>;

export const PLANNER_ACCENT = "#9a9a9a";

let logo: Buffer | null = null;
let lotus: Buffer | null = null;
export const logoImage = () => (logo ??= fs.readFileSync(LOGO_FILE));
export const lotusImage = () => (lotus ??= fs.readFileSync(LOTUS_FILE));

export const brand = StyleSheet.create({
  page: { fontFamily: "Source Sans", fontSize: 9.5, color: FORM.ink, paddingTop: 44, paddingBottom: 54, paddingHorizontal: 44 },
  frame: { position: "absolute", top: 18, left: 18, right: 18, bottom: 18, borderWidth: 3, borderColor: FORM.frame },
  strip: { position: "absolute", top: 21, left: 21, right: 21, height: 7 },
  runHead: {
    position: "absolute",
    top: 30,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7.5,
    color: FORM.soft,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: FORM.soft,
    borderTopWidth: 0.5,
    borderTopColor: FORM.grid,
    paddingTop: 4,
  },
  logo: { width: 150, alignSelf: "center", marginBottom: 8 },
  lotus: { width: 46, alignSelf: "center", marginBottom: 6 },
  title: { fontFamily: "Poppins", fontWeight: 600, fontSize: 13 },
  plannerTitle: { fontFamily: "Poppins", fontSize: 17, letterSpacing: 1, textAlign: "center", textTransform: "uppercase" },
  plannerKicker: { fontSize: 8, letterSpacing: 1.5, textAlign: "center", color: FORM.soft, textTransform: "uppercase", marginBottom: 2 },
  sub: { fontSize: 8.5, fontWeight: 600, marginTop: 1, marginBottom: 8 },
  plannerSub: { fontSize: 8.5, textAlign: "center", color: FORM.soft, marginTop: 2, marginBottom: 12 },
  intro: { fontSize: 9, marginBottom: 8 },
  // Organiser form table
  table: { borderTopWidth: 1, borderColor: FORM.grid, marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderLeftWidth: 1, borderColor: FORM.grid },
  groupText: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 10.5,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderColor: FORM.grid,
    width: "100%",
  },
  headText: {
    fontWeight: 600,
    textDecoration: "underline",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: FORM.grid,
    width: "35%",
    backgroundColor: "#ffffff",
  },
  headFill: { width: "65%", backgroundColor: FORM.answer, borderRightWidth: 1, borderColor: FORM.grid },
  label: { width: "35%", backgroundColor: FORM.label, paddingVertical: 2.5, paddingHorizontal: 4, borderRightWidth: 1, borderColor: FORM.grid },
  value: { width: "65%", backgroundColor: FORM.answer, paddingVertical: 2.5, paddingHorizontal: 4, borderRightWidth: 1, borderColor: FORM.grid },
  wide: { width: "100%", backgroundColor: FORM.answer, paddingVertical: 4, paddingHorizontal: 4, borderRightWidth: 1, borderColor: FORM.grid, lineHeight: 1.35 },
  hint: { width: "100%", fontStyle: "italic", fontSize: 8.5, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 1, borderColor: FORM.grid },
  note: { width: "100%", fontSize: 8.5, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 1, borderColor: FORM.grid, backgroundColor: FORM.label },
  // Planner ruled lines
  pGroup: { fontFamily: "Poppins", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 6, marginBottom: 6 },
  pSection: { fontSize: 10.5, fontWeight: 600, textAlign: "center", marginTop: 6, marginBottom: 2 },
  pHint: { fontSize: 8.5, fontStyle: "italic", textAlign: "center", color: FORM.soft, marginBottom: 6 },
  pTitle: { fontSize: 10, fontWeight: 600, marginTop: 6, marginBottom: 2 },
  pRow: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: "#222222", paddingTop: 5, paddingBottom: 1.5 },
  pLabel: { width: "35%", fontSize: 8.5, color: FORM.soft },
  pValue: { width: "65%" },
  pBody: { borderBottomWidth: 0.8, borderBottomColor: "#222222", paddingVertical: 4, lineHeight: 1.5 },
  pNote: { fontSize: 8.5, color: FORM.soft, marginTop: 3 },
  pDivider: { width: 22, alignSelf: "center", marginTop: 6, marginBottom: 2, opacity: 0.6 },
});

/** Page furniture repeated on every page: frame, colour strip, running
 *  header from page 2, and the footer with the unofficial-record line. */
export function PageChrome({ accent, runningTitle }: { accent: string; runningTitle: string }) {
  return (
    <>
      <View style={brand.frame} fixed />
      <View style={[brand.strip, { backgroundColor: accent }]} fixed />
      <View
        style={brand.runHead}
        fixed
        render={({ pageNumber }) =>
          pageNumber > 1 ? (
            <>
              <Text>The Adulting Life</Text>
              <Text>{runningTitle}</Text>
            </>
          ) : null
        }
      />
      <View style={brand.footer} fixed>
        <Text>The Adulting Life · {UNOFFICIAL_TEXT}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

/** The top of page 1: logo (or lotus for the Planner), title, owner and date. */
export function TitleBlock({
  variant,
  title,
  subtitle,
  date,
}: {
  variant: "organiser" | "planner";
  title: string;
  subtitle?: string | null;
  date: string;
}) {
  if (variant === "planner") {
    return (
      <View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        <Image src={lotusImage()} style={brand.lotus} />
        <Text style={brand.plannerKicker}>The Adulting Life Peace of Mind Planner</Text>
        <Text style={brand.plannerTitle}>{title}</Text>
        <Text style={brand.plannerSub}>
          {subtitle ? `${subtitle} · ` : ""}Prepared {date}
        </Text>
      </View>
    );
  }
  return (
    <View>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
      <Image src={logoImage()} style={brand.logo} />
      <Text style={brand.title}>{title}</Text>
      <Text style={brand.sub}>
        {subtitle ? `${subtitle} · ` : ""}Completed {date}
      </Text>
    </View>
  );
}

export interface BrandField {
  label: string;
  value: string;
}

/** One entry as rows of the form table (Organiser) or ruled lines (Planner). */
export function BrandEntry({
  variant,
  title,
  fields,
  body,
  note,
}: {
  variant: "organiser" | "planner";
  title?: string | null;
  fields: BrandField[];
  body?: string | null;
  note?: string | null;
}) {
  const long = fields.length > 16 || (body?.length ?? 0) > 1200;
  if (variant === "planner") {
    return (
      <View wrap={long}>
        {title ? (
          <Text style={brand.pTitle} minPresenceAhead={30}>
            {title}
          </Text>
        ) : null}
        {fields.map((f, i) => (
          <View key={i} style={brand.pRow} wrap={false}>
            <Text style={brand.pLabel}>{f.label}</Text>
            <Text style={brand.pValue}>{f.value}</Text>
          </View>
        ))}
        {body ? <Text style={brand.pBody}>{body}</Text> : null}
        {note ? <Text style={brand.pNote}>{note}</Text> : null}
      </View>
    );
  }
  return (
    <View wrap={long}>
      {title ? (
        <View style={brand.row} minPresenceAhead={30}>
          <Text style={brand.headText}>{title}</Text>
          <View style={brand.headFill} />
        </View>
      ) : null}
      {fields.map((f, i) => (
        <View key={i} style={brand.row} wrap={false}>
          <Text style={brand.label}>{/[?:]$/.test(f.label.trim()) ? f.label : `${f.label}:`}</Text>
          <Text style={brand.value}>{f.value}</Text>
        </View>
      ))}
      {body ? (
        <View style={brand.row}>
          <Text style={brand.wide}>{body}</Text>
        </View>
      ) : null}
      {note ? (
        <View style={brand.row} wrap={false}>
          <Text style={brand.note}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Folder names carry app prefixes ("Custom — Medication List", "TAL — …")
 *  that the printed forms don't — "Medication List". */
export const plainName = (t: string) => t.replace(/^(Custom|TAL)\s*[—–-]\s*/i, "");
