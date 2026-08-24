import { createServiceClient } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

const EMBED_MODEL = "text-embedding-3-small";

export interface HelpMatch {
  slug: string;
  title: string;
  pdfPage: number | null;
  source: "pdf" | "ai";
  content: string;
  similarity: number; // 0..1, higher = more similar
}

// Embeds `query` and returns the top-k most similar help pages via the
// `match_help` pgvector RPC (see migrations/055_help_embeddings.sql).
export async function searchHelp(
  query: string,
  matchCount = 5
): Promise<HelpMatch[]> {
  const clean = query.trim();
  if (!clean) return [];

  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBED_MODEL),
    value: clean,
  });

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("match_help", {
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    slug: string;
    title: string;
    pdf_page: number | null;
    source: "pdf" | "ai";
    content: string;
    similarity: number;
  }>;

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    pdfPage: r.pdf_page,
    source: r.source,
    content: r.content,
    similarity: r.similarity,
  }));
}
