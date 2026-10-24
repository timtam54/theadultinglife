import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { listPlannerEventsForRange } from "@/lib/db/planner";
import { registerFonts } from "@/lib/services/complete-export/pdf";
import { PageChrome, SECTION_COLOUR, TitleBlock, brand } from "@/lib/services/pdf-brand";

// The Daily Routine Planner (calendar) for a day / week / month as a PDF,
// so it can be emailed to someone in the household or a carer. Times are
// shown in the sender's own time zone.

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
  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const buf = await renderToBuffer(
    <Document title={`My Daily Routine — ${input.label}`} author="The Adulting Life">
      <Page size="A4" style={brand.page}>
        <PageChrome accent={SECTION_COLOUR.personal} runningTitle={`My Daily Routine — ${input.label}`} />
        <TitleBlock variant="organiser" title="My Daily Routine" subtitle={[input.ownerName, input.label].filter(Boolean).join(" · ")} date={date} />
        {byDay.length === 0 && <Text>Nothing is planned for this period.</Text>}
        {byDay.map((g, i) => (
          <View key={i} style={brand.table}>
            <View style={[brand.row, { backgroundColor: SECTION_COLOUR.personal }]} minPresenceAhead={40}>
              <Text style={brand.groupText}>{g.day}</Text>
            </View>
            {g.items.map((it, j) => (
              <View key={j} style={brand.row} wrap={false}>
                <Text style={brand.label}>{it.time}</Text>
                <Text style={brand.value}>{it.title}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
  return {
    bytes: new Uint8Array(buf),
    filename: `My Daily Routine - ${input.label}.pdf`.replace(/[\\/:*?"<>|]+/g, "-"),
    count: events.length,
  };
}
