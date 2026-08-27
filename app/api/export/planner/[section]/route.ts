import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { buildWorkbook, xlsxResponse } from "@/lib/services/excel-export";
import { plannerSectionBySlug } from "@/lib/templates/peace-of-mind-v2";
import { listPlannerLetters } from "@/lib/db/planner-letters";
import { listPlannerApologies } from "@/lib/db/planner-apologies";
import { getPlannerWish, type WishAudience } from "@/lib/db/planner-wishes";
import { getPlannerLastWords } from "@/lib/db/planner-last-words";

type Ctx = { params: Promise<{ section: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { section } = await ctx.params;
  const meta = plannerSectionBySlug(section);
  if (!meta) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await requireSession();
  const heading = [
    `${meta.title} — The Adulting Life Planner`,
    `Exported ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}`,
  ];

  // Organiser-fed sections use the records-folder route — redirect there.
  if (meta.kind === "organiser" && meta.organiserSubcategoryId) {
    return NextResponse.redirect(
      new URL(
        `/api/export/records-folder/${encodeURIComponent(meta.organiserSubcategoryId)}`,
        _req.url
      ),
      302
    );
  }

  if (meta.plannerEditor === "letters") {
    const letters = await listPlannerLetters(session.user.id);
    const body = await buildWorkbook([
      {
        name: "Letters",
        heading,
        columns: [
          { header: "Dear", key: "recipient", width: 24 },
          { header: "Letter", key: "body", width: 80 },
        ],
        rows: letters.map((l) => ({
          recipient: l.recipient ?? "",
          body: l.body ?? "",
        })),
      },
    ]);
    return xlsxResponse(body, `${meta.title || "letters"}.xlsx`);
  }

  if (meta.plannerEditor === "apologies") {
    const items = await listPlannerApologies(session.user.id);
    const body = await buildWorkbook([
      {
        name: "Apologies",
        heading,
        columns: [
          { header: "To", key: "recipient", width: 24 },
          { header: "Apology", key: "body", width: 80 },
        ],
        rows: items.map((l) => ({
          recipient: l.recipient ?? "",
          body: l.body ?? "",
        })),
      },
    ]);
    return xlsxResponse(body, `${meta.title || "apologies"}.xlsx`);
  }

  if (meta.plannerEditor === "last-words") {
    const row = await getPlannerLastWords(session.user.id);
    const body = await buildWorkbook([
      {
        name: "Last words",
        heading,
        columns: [{ header: "Last words", key: "body", width: 100 }],
        rows: [{ body: row?.body ?? "" }],
      },
    ]);
    return xlsxResponse(body, `${meta.title || "last-words"}.xlsx`);
  }

  if (meta.plannerEditor?.startsWith("wishes-")) {
    const audience = meta.plannerEditor.slice("wishes-".length) as WishAudience;
    const row = await getPlannerWish(session.user.id, audience);
    const body = await buildWorkbook([
      {
        name: meta.title.slice(0, 31),
        heading,
        columns: [{ header: meta.title, key: "body", width: 100 }],
        rows: [{ body: row?.body ?? "" }],
      },
    ]);
    return xlsxResponse(body, `${meta.title || "wishes"}.xlsx`);
  }

  return NextResponse.json(
    { error: "export_unavailable_for_this_section" },
    { status: 501 }
  );
}
