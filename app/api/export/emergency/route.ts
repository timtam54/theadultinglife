import { requireSession } from "@/lib/auth/session";
import { buildWorkbook, xlsxResponse } from "@/lib/services/excel-export";
import { buildEmergencyView } from "@/lib/services/emergency";

export async function GET() {
  const session = await requireSession();
  const view = await buildEmergencyView(session.user.familyGroupId);

  const heading = [
    "Emergency information — The Adulting Life",
    `Exported ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`,
  ];

  // One sheet per emergency subcategory that has content. Skip empties so the
  // file stays useful, not padded with blank tabs.
  const sheets = view.sections
    .filter((s) => s.records.length > 0)
    .map((s) => {
      // Union of all field labels across records in this section.
      const labels = new Set<string>();
      for (const r of s.records) for (const f of r.fields) labels.add(f.label);
      const labelList = Array.from(labels);

      const columns = [
        { header: "Family member", key: "__user", width: 22 },
        ...labelList.map((l) => ({ header: l, key: l, width: 24 })),
      ];
      const rows = s.records.map((r) => {
        const out: Record<string, string> = { __user: r.userName };
        for (const f of r.fields) out[f.label] = f.value;
        for (const l of labelList) if (!(l in out)) out[l] = "";
        return out;
      });

      return {
        name: s.label.slice(0, 31),
        heading,
        columns,
        rows,
      };
    });

  if (sheets.length === 0) {
    // Empty state: return a single info sheet so the download isn't confusing.
    sheets.push({
      name: "Emergency",
      heading,
      columns: [{ header: "Note", key: "note", width: 60 }],
      rows: [{ note: "No emergency information recorded yet." }],
    });
  }

  const body = await buildWorkbook(sheets);
  return xlsxResponse(body, "emergency.xlsx");
}
