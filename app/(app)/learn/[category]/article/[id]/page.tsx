import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { findContent } from "@/content/learning";
import { MarkContentRead } from "@/components/MarkContentRead";
import { listVideosForArticle } from "@/lib/db/videos";
import { VideoSection } from "@/components/VideoSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { category, id } = await params;
  if (!isCategoryId(category)) return {};
  const article = findContent(id);
  if (!article || article.categoryId !== category) return {};
  return { title: article.title, description: article.summary };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  if (!isCategoryId(category)) notFound();
  const article = findContent(id);
  if (!article || article.categoryId !== category) notFound();

  const videos = await listVideosForArticle(article.id);

  return (
    <article className="max-w-2xl">
      <Link
        href={`/learn/${category}`}
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {CATEGORY_LABELS[category]}
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-2">
        {article.title}
      </h1>
      <p className="text-tal-plum-soft mb-6">{article.summary}</p>
      {videos.length > 0 && (
        <div className="mb-6">
          <VideoSection videos={videos} />
        </div>
      )}
      <div className="prose prose-neutral whitespace-pre-line">{article.body}</div>
      {videos.length === 0 && <VideoSection videos={videos} />}
      <MarkContentRead itemId={article.id} />
    </article>
  );
}
