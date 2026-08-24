import { createServiceClient } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

const EMBED_MODEL = "text-embedding-3-small";

export interface HelpDoc {
  slug: string;
  title: string;
  pdfPage: number | null;
  source: "pdf" | "ai";
  bodyMarkdown: string;
}

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9._-]+$/i.test(slug);
}

export async function loadHelpDoc(slug: string): Promise<HelpDoc | null> {
  if (!isSafeSlug(slug)) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("help_embeddings")
    .select("slug, title, pdf_page, source, content")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    slug: data.slug,
    title: data.title,
    pdfPage: data.pdf_page,
    source: data.source === "ai" ? "ai" : "pdf",
    bodyMarkdown: data.content,
  };
}

// Updates an existing help row's title + body and re-embeds so Ask TAL AI's
// semantic ranking stays consistent with the edit.
export async function updateHelpDoc(
  slug: string,
  input: { title: string; bodyMarkdown: string }
): Promise<HelpDoc | null> {
  if (!isSafeSlug(slug)) return null;

  const title = input.title.trim();
  const body = input.bodyMarkdown.trim();
  if (!title || !body) return null;

  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBED_MODEL),
    value: `${title}\n\n${body}`,
  });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("help_embeddings")
    .update({
      title,
      content: body,
      embedding,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select("slug, title, pdf_page, source, content")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    slug: data.slug,
    title: data.title,
    pdfPage: data.pdf_page,
    source: data.source === "ai" ? "ai" : "pdf",
    bodyMarkdown: data.content,
  };
}
