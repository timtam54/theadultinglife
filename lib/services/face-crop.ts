import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import sharp from "sharp";

const bboxSchema = z.object({
  found: z.boolean(),
  // Percentages of image width/height (0..1) for the tightest crop around
  // the portrait photo on the card. All null if no face is visible.
  x: z.number().nullable(),
  y: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export interface FaceCropResult {
  bytes: Buffer;
  mimeType: "image/jpeg";
}

/**
 * Best-effort face crop from a document photo (driver's licence, passport, etc).
 * Returns null when the model can't confidently locate a portrait.
 */
export async function cropFaceFromDocument(
  imageData: string, // base64
  mimeType: string
): Promise<FaceCropResult | null> {
  if (mimeType === "application/pdf") return null;

  let bbox: z.infer<typeof bboxSchema>;
  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: bboxSchema,
      system: `You return a bounding box around the portrait photo on an Australian ID document (driver's licence, passport, etc). Coordinates are fractions of the image dimensions (0..1). Be tight around the face + head. If no portrait is visible or the image is unclear, set found=false and all coordinates to null.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image" as const,
              image: imageData,
              mediaType: mimeType,
            },
            {
              type: "text" as const,
              text: "Return the bounding box of the portrait photo.",
            },
          ],
        },
      ],
    });
    bbox = result.object;
  } catch {
    return null;
  }

  if (
    !bbox.found ||
    bbox.x == null ||
    bbox.y == null ||
    bbox.width == null ||
    bbox.height == null
  ) {
    return null;
  }

  const bytes = Buffer.from(imageData, "base64");
  const image = sharp(bytes).rotate(); // auto-orient from EXIF
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return null;

  // Clamp + convert to pixels. Pad ~8% for a comfortable crop.
  const pad = 0.08;
  const x0 = Math.max(0, bbox.x - bbox.width * pad);
  const y0 = Math.max(0, bbox.y - bbox.height * pad);
  const x1 = Math.min(1, bbox.x + bbox.width * (1 + pad));
  const y1 = Math.min(1, bbox.y + bbox.height * (1 + pad));

  const left = Math.round(x0 * meta.width);
  const top = Math.round(y0 * meta.height);
  const width = Math.max(1, Math.round((x1 - x0) * meta.width));
  const height = Math.max(1, Math.round((y1 - y0) * meta.height));

  const cropped = await image
    .extract({ left, top, width, height })
    .resize(256, 256, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();

  return { bytes: cropped, mimeType: "image/jpeg" };
}
