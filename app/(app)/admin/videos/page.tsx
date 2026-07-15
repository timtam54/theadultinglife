import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAllVideos } from "@/lib/db/videos";
import { COURSE_ARTICLES } from "@/content/course-articles";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { VideosAdmin } from "./VideosAdmin";

export const metadata: Metadata = { title: "Videos" };

export default async function AdminVideosPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const videos = await listAllVideos();
  const articles = COURSE_ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    categoryId: a.categoryId,
    categoryLabel: CATEGORY_LABELS[a.categoryId],
  }));

  return <VideosAdmin initialVideos={videos} articles={articles} />;
}
