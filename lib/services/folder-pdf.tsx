import path from "node:path";
import fs from "node:fs";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import { C, registerFonts } from "@/lib/services/complete-export/pdf";
import { UNOFFICIAL_TEXT } from "@/components/print/UnofficialRecord";

// One folder's form (e.g. Will & Funeral Instructions) as a PDF built on the
// server, so it can be emailed — the on-screen "Download PDF" uses the
// browser's print instead, which can't be attached to an email.

const LOGO = path.join(process.cwd(), "public/Logo.png");

const s = StyleSheet.create({
  page: { fontFamily: "Source Sans", fontSize: 10, color: C.ink, paddingTop: 40, paddingBottom: 56, paddingHorizontal: 48 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  title: { fontFamily: "Poppins", fontWeight: 600, fontSize: 20 },
  sub: { fontSize: 10, color: C.soft, marginTop: 2 },
  disclaimer: {
    borderWidth: 1.5,
    borderColor: "#b91c1c",
    borderRadius: 6,
    padding: 8,
    color: "#991b1b",
    fontWeight: 600,
    fontSize: 9,
    marginBottom: 14,
  },
  entry: { borderWidth: 0.5, borderColor: C.line, borderRadius: 6, padding: 8, marginBottom: 8 },
  entryTitle: { fontWeight: 600, fontSize: 11, marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "38%", color: C.soft, paddingRight: 8 },
  value: { width: "62%" },
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
});

interface Entry {
  title: string | null;
  fields: { label: string; value: string }[];
}

export async function renderFolderFormPdf(input: {
  ownerUserId: string;
  subcategoryId: string;
}): Promise<{ bytes: Uint8Array; filename: string }> {
  const [owner, folder, questions] = await Promise.all([
    findUserById(input.ownerUserId),
    getUserSubcategory(input.ownerUserId, input.subcategoryId),
    listQuestionsBySubcategory(input.subcategoryId),
  ]);
  if (!owner || !folder) throw new Error("not_found");
  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.name || "";

  const { data } = questions.length
    ? await createServiceClient()
        .from("question_responses")
        .select("question_id, instance_id, value")
        .eq("user_id", owner.id)
        .in(
          "question_id",
          questions.map((q) => q.id)
        )
    : { data: [] };
  const rows = (data ?? []) as { question_id: string; instance_id: string; value: string | null }[];

  // File fields show the document's name rather than its id.
  const fileIds = rows
    .filter((r) => {
      const t = questions.find((q) => q.id === r.question_id)?.question_type;
      return (t === "file" || t === "image") && r.value;
    })
    .map((r) => r.value as string);
  const { data: fileRows } = fileIds.length
    ? await createServiceClient().from("file_objects").select("id, filename").in("id", fileIds)
    : { data: [] };
  const fileName = new Map(((fileRows ?? []) as { id: string; filename: string }[]).map((f) => [f.id, f.filename]));

  const byInstance = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (!r.value) continue;
    const m = byInstance.get(r.instance_id) ?? new Map<string, string>();
    m.set(r.question_id, r.value);
    byInstance.set(r.instance_id, m);
  }
  const instanceIds = Array.from(byInstance.keys())
    .filter((id) => (folder.repeatable ? id !== "default" : id === "default"))
    .sort((a, b) => Number(a) - Number(b));

  const entries: Entry[] = instanceIds.map((id) => {
    const vals = byInstance.get(id)!;
    const fields = questions
      .map((q) => {
        const raw = vals.get(q.id);
        if (!raw || q.question_type === "transactions_json") return null;
        const value =
          q.question_type === "file" || q.question_type === "image"
            ? `Attached: ${fileName.get(raw) ?? "document"}`
            : formatQuestionValue(q, raw);
        return value ? { label: q.label, value } : null;
      })
      .filter((f): f is { label: string; value: string } => f !== null);
    return { title: folder.repeatable ? (fields.find((f) => !f.value.startsWith("Attached:"))?.value ?? null) : null, fields };
  });

  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  registerFonts();
  const buf = await renderToBuffer(
    <Document title={`${folder.name} — The Adulting Life`} author="The Adulting Life">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.title}>{folder.name}</Text>
            <Text style={s.sub}>
              {ownerName ? `${ownerName} · ` : ""}Prepared {date}
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={fs.readFileSync(LOGO)} style={{ width: 130 }} />
        </View>
        <Text style={s.disclaimer}>{UNOFFICIAL_TEXT}</Text>
        {entries.length === 0 && <Text style={{ color: C.soft }}>Nothing has been filled in yet.</Text>}
        {entries.map((e, i) => (
          <View key={i} style={s.entry} wrap={e.fields.length > 16}>
            {e.title ? <Text style={s.entryTitle}>{e.title}</Text> : null}
            {e.fields.map((f, j) => (
              <View key={j} style={s.row}>
                <Text style={s.label}>{f.label}</Text>
                <Text style={s.value}>{f.value}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>The Adulting Life · {UNOFFICIAL_TEXT}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  const safe = `${folder.name}${ownerName ? ` - ${ownerName}` : ""}`.replace(/[\\/:*?"<>|]+/g, "-");
  return { bytes: new Uint8Array(buf), filename: `${safe}.pdf` };
}
