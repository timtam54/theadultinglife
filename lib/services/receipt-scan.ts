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
});

export type ReceiptScanResult = z.infer<typeof scanSchema>;

const SYSTEM_PROMPT = `You extract structured data from a photo or PDF of an Australian receipt or tax invoice for a personal finance app.

Return every field you can read. Use null (not a guess) for anything unclear or missing. Never invent values.

Rules:
- receiptDate must be ISO YYYY-MM-DD. Interpret Australian date formats (DD/MM/YYYY).
- amount is the total the customer paid, including GST. Numeric, no currency symbol.
- gstAmount is the GST portion if shown separately. In Australia GST is 10%; if the receipt shows "Total incl. GST" only, you may compute gstAmount = round(amount / 11, 2).
- gstClaimable is true if the receipt shows an ABN and GST — otherwise null.
- abn is the 11-digit Australian Business Number if printed. Strip spaces.
- category should be your best guess from the fixed list. Use "Other" only if nothing fits.
- description is a short human phrase, e.g. "Lunch with client" or "Printer ink cartridge". Not the shop name.
- paymentMethod: "Card", "Cash", "EFTPOS", "Bank Transfer", etc. Only if visible.
- confidence: "high" if the image is clear and core fields (supplier, date, amount) are readable, "medium" if some are unclear or you had to compute GST, "low" if the image is poor or you're guessing.`;

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
