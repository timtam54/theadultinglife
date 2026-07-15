import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { saveTemplate } from "@/lib/services/templateBuilder";
import { apiError } from "@/lib/api-error";

const QuestionSchema = z.object({
  label: z.string().min(1).max(200),
  hint: z.string().max(500).nullable(),
  question_type: z.enum([
    "text",
    "textarea",
    "date",
    "int",
    "number",
    "dropdown",
    "image",
  ]),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .nullable(),
  required: z.boolean(),
  placeholder: z.string().max(200).nullable(),
});

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  category_id: z.enum([
    "personal",
    "health",
    "education",
    "employment",
    "admin",
  ]),
  hint: z.string().max(500).nullable(),
  visibility: z.enum(["catalogue", "user_private"]),
  questions: z.array(QuestionSchema).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.visibility === "catalogue" && session.user.role !== "s") {
      return NextResponse.json(
        { error: "forbidden", message: "Only super admins can publish to the catalogue." },
        { status: 403 }
      );
    }

    const sub = await saveTemplate({
      name: parsed.data.name,
      categoryId: parsed.data.category_id,
      hint: parsed.data.hint,
      visibility: parsed.data.visibility,
      createdBy: session.user.id,
      questions: parsed.data.questions,
    });

    return NextResponse.json({ subcategory: sub });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:templates.POST", e);
  }
}
