import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const RECEIPT_CATEGORIES = [
  "Motor Vehicle",
  "Travel",
  "Work Equipment",
  "Stationery",
  "Uniform/PPE",
  "Education",
  "Home Office",
  "Donations",
  "Groceries",
  "Utilities",
  "Rent/Housing",
  "Health/Medical",
  "Entertainment",
  "Other",
] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

const scanSchema = z.object({
  supplier: z.string().nullable(),
  abn: z.string().nullable(),
  description: z.string().nullable(),
  category: z.enum(RECEIPT_CATEGORIES).nullable(),
  receiptDate: z.string().nullable(),
  amount: z.number().nullable(),
  gstAmount: z.number().nullable(),
  gstClaimable: z.boolean().nullable(),
  paymentMethod: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  // True if the total is a credit/refund back to the customer (negative
  // amount from the app's perspective). The `amount` field itself stays
  // positive — the client flips the sign at save time based on this flag.
  isRefund: z.boolean().nullable(),
  // Free-text warnings the AI wants to surface to the user (e.g. "image is
  // faded", "receipt appears to show two separate totals", "currency is
  // USD, not AUD"). Empty array when everything is clean.
  warnings: z.array(z.string()),
});

export type ReceiptScanResult = z.infer<typeof scanSchema>;

const SYSTEM_PROMPT = `You extract structured data from a photo or PDF of an Australian receipt or tax invoice for a personal finance app.

Return every field you can read. Use null (not a guess) for anything unclear or missing. Never invent values. The user will confirm every field before saving — accuracy matters more than filling in blanks.

Rules:
- receiptDate must be ISO YYYY-MM-DD. Interpret Australian date formats (DD/MM/YYYY).
- amount is the total the customer paid, including GST. Numeric, no currency symbol. Always positive — if this is a refund/credit note, keep amount positive and set isRefund = true.
- gstAmount is the GST portion if shown separately. In Australia GST is 10%; if the receipt shows "Total incl. GST" only, you may compute gstAmount = round(amount / 11, 2).
- gstClaimable is true if the receipt shows an ABN and GST — otherwise null.
- abn is the 11-digit Australian Business Number if printed. Strip spaces.
- category should be your best guess from the fixed list. Use "Other" only if nothing fits.
- description is a short human phrase, e.g. "Lunch with client" or "Printer ink cartridge". Not the shop name.
- paymentMethod: "Card", "Cash", "EFTPOS", "Bank Transfer", etc. Only if visible.
- isRefund: true when the document is a refund, credit note, or return; false for a normal sale; null if unclear.
- confidence: "high" if the image is clear and core fields (supplier, date, amount) are readable, "medium" if some are unclear or you had to compute GST, "low" if the image is faded, blurry, cropped, or you're guessing.

Edge cases — add a short warning string to \`warnings\` (empty array otherwise). Each warning ≤ 120 chars, plain English:
- Faded / blurry / partially unreadable: warn what you couldn't read.
- Multiple totals on one page (e.g. two receipts photographed together, split bill, tip line vs total): warn and pick the ONE total that clearly represents this receipt; do not sum them.
- Refunds / credit notes / returns: warn "Looks like a refund — the amount will be recorded as negative."
- Foreign currency (any symbol other than $ / AUD): warn "Amount appears to be in <CODE>, not AUD" and still fill amount with the number as printed.
- Handwritten amounts, missing date, missing supplier, or anything else a human should double-check.`;

export async function scanReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ReceiptScanResult> {
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: scanSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageBase64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: "Extract this receipt into the schema.",
          },
        ],
      },
    ],
  });

  return result.object;
}
