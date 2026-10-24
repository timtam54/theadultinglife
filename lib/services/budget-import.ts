import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import ExcelJS from "exceljs";
import type { BudgetPeriod } from "@/lib/budget";
import { READER_RULES } from "@/lib/services/ai-reader-rules";

/*
 * "Import a budget": reads someone's existing budget — an Excel or CSV file,
 * a PDF, or a photo — and sorts its lines into the Money & Me sections
 * (income, needs, emergencies, wants, goals savings), with every amount
 * converted to the budget's period. The person reviews the result before
 * anything is saved.
 */

const line = z.object({
  label: z.string(),
  amount: z.number().nullable(),
  dueDate: z.string().nullable(),
  // How often the bill falls due, as shown on the document.
  repeats: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "yearly"]).nullable(),
  notes: z.string().nullable(),
});
const importSchema = z.object({
  detectedPeriod: z.enum(["weekly", "fortnightly", "monthly", "unknown"]),
  income: z.array(line),
  needs: z.array(line),
  emergencies: z.array(line),
  wants: z.array(line),
  goals: z.array(line),
  warnings: z.array(z.string()),
});
export type BudgetImportResult = z.infer<typeof importSchema>;

const SPREADSHEET = /\.(xlsx|xlsm)$/i;
const TEXT = /\.(csv|txt|tsv)$/i;
const MAX_TEXT = 60_000;

/** A spreadsheet as plain text rows, one block per sheet, using what each cell shows. */
async function spreadsheetText(data: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);
  const out: string[] = [];
  wb.eachSheet((ws) => {
    out.push(`=== Sheet: ${ws.name}`);
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value as unknown;
        // Formula cells: use the calculated result.
        const shown =
          v && typeof v === "object" && "result" in (v as Record<string, unknown>)
            ? String((v as { result: unknown }).result ?? "")
            : cell.text;
        if (shown.trim()) cells.push(shown.trim());
      });
      if (cells.length) out.push(`Row ${n}: ${cells.join(" | ")}`);
    });
  });
  return out.join("\n").slice(0, MAX_TEXT);
}

export function isImportableBudgetFile(filename: string, mimeType: string | null): boolean {
  return (
    SPREADSHEET.test(filename) ||
    TEXT.test(filename) ||
    mimeType === "application/pdf" ||
    (mimeType ?? "").startsWith("image/")
  );
}

export async function extractBudget(input: {
  data: Buffer;
  filename: string;
  mimeType: string | null;
  period: BudgetPeriod;
}): Promise<BudgetImportResult> {
  const system = `You read a person's existing household budget (a spreadsheet, PDF or photo) for an Australian life-admin app and sort it into its "Money & Me" budget.

The app's budget is for ONE period (${input.period}), but do NOT convert anything — the app does the arithmetic:
- amount: the amount exactly as written on the document.
- repeats: how often that amount applies according to the document (weekly, fortnightly, monthly, quarterly or yearly); null only if the document gives no frequency at all.
- detectedPeriod: if the whole document uses one frequency, that frequency; otherwise "unknown".

Sort every line into one section:
- income: money received after tax (wages, Centrelink, other income).
- needs: essentials and bills — rent/mortgage, groceries, fuel/transport, utilities, phone/internet, insurance, rego, required loan repayments, medical, childcare/school.
- emergencies: emergency fund or buffer savings.
- wants: discretionary — subscriptions, takeaway/coffee, eating out, entertainment, hobbies, shopping, gifts.
- goals: savings for a goal — holiday, car, house deposit, other goal savings.

Rules:
${READER_RULES}
- Keep the person's own wording for each line's label (tidied), one line per real item.
- Skip headings, blank rows, and any total, subtotal, "left over", balance or percentage rows.
- dueDate (YYYY-MM-DD) only if the document shows when a bill is next due (dates are Australian DD/MM/YYYY).
- notes only for useful extra detail written on the document itself.
- amount null if the line has no readable amount. Never invent lines or numbers.
- warnings: short notes about anything to check — unclear items, things you couldn't place, figures that look like gross (before-tax) income, amounts with no stated frequency.`;

  const isSheet = SPREADSHEET.test(input.filename);
  const isText = TEXT.test(input.filename);
  const content =
    isSheet || isText
      ? [
          {
            type: "text" as const,
            text: `Budget file "${input.filename}":\n\n${isSheet ? await spreadsheetText(input.data) : input.data.toString("utf8").slice(0, MAX_TEXT)}`,
          },
        ]
      : [
          input.mimeType === "application/pdf"
            ? {
                type: "file" as const,
                data: input.data.toString("base64"),
                mediaType: "application/pdf",
                filename: "budget.pdf",
              }
            : {
                type: "file" as const,
                data: input.data.toString("base64"),
                mediaType: input.mimeType ?? "image/jpeg",
              },
          { type: "text" as const, text: "Read this budget into the schema." },
        ];

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: importSchema,
    system,
    messages: [{ role: "user", content }],
  });

  // Convert each amount from its own frequency to the budget's period here,
  // not by the model: money arithmetic must be exact.
  const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, yearly: 1 } as const;
  const toPeriod = (amount: number | null, freq: z.infer<typeof line>["repeats"]) => {
    if (amount == null || !Number.isFinite(amount)) return null;
    const per = freq ? (amount * PER_YEAR[freq]) / PER_YEAR[input.period] : amount;
    return Math.round(per * 100) / 100;
  };
  let converted = 0;
  const tidy = (rows: z.infer<typeof line>[]) =>
    rows
      .filter((r) => r.label.trim())
      .map((r) => ({
        label: r.label.trim().slice(0, 200),
        amount: (() => {
          if (r.repeats && r.repeats !== input.period && r.amount != null) converted += 1;
          return toPeriod(r.amount, r.repeats);
        })(),
        dueDate: r.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) ? r.dueDate : null,
        repeats: r.repeats,
        notes: r.notes?.trim() || null,
      }));
  return {
    detectedPeriod: object.detectedPeriod,
    income: tidy(object.income),
    needs: tidy(object.needs),
    emergencies: tidy(object.emergencies),
    wants: tidy(object.wants),
    goals: tidy(object.goals),
    warnings: [
      ...(converted
        ? [`${converted} amount${converted === 1 ? " was" : "s were"} converted to ${input.period} from the frequency shown in your file.`]
        : []),
      ...object.warnings,
    ],
  };
}
