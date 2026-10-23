import path from "node:path";
import fs from "node:fs";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { listPlannerEventsForRange } from "@/lib/db/planner";
import { C, registerFonts } from "@/lib/services/complete-export/pdf";

// The Daily Routine Planner (calendar) for a day / week / month as a PDF,
// so it can be emailed to someone in the household or a carer. Times are
// shown in the sender's own time zone.

const LOGO = path.join(process.cwd(), "public/Logo.png");

const s = StyleSheet.create({
  page: { fontFamily: "Source Sans", fontSize: 10.5, color: C.ink, paddingTop: 40, paddingBottom: 50, paddingHorizontal: 48 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  title: { fontFamily: "Poppins", fontWeight: 600, fontSize: 20 },
  sub: { fontSize: 10, color: C.soft, marginTop: 2 },
  day: { fontFamily: "Poppins", fontWeight: 600, fontSize: 12, color: C.forest, marginTop: 12, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  time: { width: 120, color: C.soft },
  what: { flex: 1 },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.soft },
});

export async function renderPlannerPdf(input: {
  userId: string;
  ownerName: string;
  startIso: string;
  endIso: string;
  label: string;
  timeZone: string;
}): Promise<{ bytes: Uint8Array; filename: string; count: number }> {
  const events = await listPlannerEventsForRange(input.userId, input.startIso, input.endIso);
  const tz = (() => {
    try {
      new Intl.DateTimeFormat("en-AU", { timeZone: input.timeZone });
      return input.timeZone;
    } catch {
      return "Australia/Sydney";
    }
  })();
  const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const t = (iso: string) => timeFmt.format(new Date(iso)).replace(" ", "").toLowerCase();

  const byDay: { day: string; items: { time: string; title: string }[] }[] = [];
  for (const e of events) {
    const day = dayFmt.format(new Date(e.start_at));
    let group = byDay[byDay.length - 1];
    if (!group || group.day !== day) {
      group = { day, items: [] };
      byDay.push(group);
    }
    group.items.push({ time: `${t(e.start_at)} – ${t(e.end_at)}`, title: e.title });
  }

  registerFonts();
  const buf = await renderToBuffer(
    <Document title={`Daily routine — ${input.label}`} author="The Adulting Life">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.title}>Daily routine</Text>
            <Text style={s.sub}>
              {input.ownerName ? `${input.ownerName} · ` : ""}
              {input.label}
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={fs.readFileSync(LOGO)} style={{ width: 130 }} />
        </View>
        {byDay.length === 0 && <Text style={{ color: C.soft }}>Nothing is planned for this period.</Text>}
        {byDay.map((g, i) => (
          <View key={i} wrap>
            <Text style={s.day} minPresenceAhead={40}>
              {g.day}
            </Text>
            {g.items.map((it, j) => (
              <View key={j} style={s.row} wrap={false}>
                <Text style={s.time}>{it.time}</Text>
                <Text style={s.what}>{it.title}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>The Adulting Life · Daily Routine Planner</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return {
    bytes: new Uint8Array(buf),
    filename: `Daily routine - ${input.label}.pdf`.replace(/[\\/:*?"<>|]+/g, "-"),
    count: events.length,
  };
}
