import { createServiceClient } from "@/lib/supabase/server";

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
