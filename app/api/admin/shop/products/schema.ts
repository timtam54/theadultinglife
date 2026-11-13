import { z } from "zod";
import type { ProductInput } from "@/lib/shop/db";

export const ProductBody = z.object({
  name: z.string().trim().min(1, "Please enter a name").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "The web address can only use lower-case letters, numbers and dashes"),
  summary: z.string().trim().max(400).nullable(),
  description: z.string().max(20_000).nullable(),
  price: z.number().min(0).max(100_000),
  kind: z.enum(["download", "post", "manual"]),
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(10_000),
  image_path: z.string().max(500).nullable().optional(),
  file_path: z.string().max(500).nullable().optional(),
  file_name: z.string().max(300).nullable().optional(),
});

export function productFields(b: z.infer<typeof ProductBody>): ProductInput {
  return {
    name: b.name,
    slug: b.slug,
    summary: b.summary || null,
    description: b.description?.trim() || null,
    price_cents: Math.round(b.price * 100),
    kind: b.kind,
    active: b.active,
    sort_order: b.sort_order,
    ...(b.image_path !== undefined ? { image_path: b.image_path } : {}),
    ...(b.file_path !== undefined ? { file_path: b.file_path, file_name: b.file_name ?? null } : {}),
  };
}
