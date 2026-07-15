"use client";

import { useMemo, useState } from "react";
import type { VideoRow } from "@/lib/db/types";
import { VideoThumbnail } from "@/components/VideoThumbnail";

type ArticleMeta = {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
};

export function VideosAdmin({
  initialVideos,
  articles,
}: {
  initialVideos: VideoRow[];
  articles: ArticleMeta[];
}) {
  const [videos, setVideos] = useState<VideoRow[]>(initialVideos);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const articleById = useMemo(
    () => new Map(articles.map((a) => [a.id, a] as const)),
    [articles]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, VideoRow[]>();
    for (const v of videos) {
      const arr = map.get(v.article_id) ?? [];
      arr.push(v);
      map.set(v.article_id, arr);
    }
    return Array.from(map.entries())
      .map(([articleId, rows]) => ({
        articleId,
        article: articleById.get(articleId),
        rows: rows.sort(
          (a, b) =>
            a.sort_order - b.sort_order ||
            (a.created_at < b.created_at ? -1 : 1)
        ),
      }))
      .sort((a, b) => {
        const at = a.article?.categoryLabel ?? "";
        const bt = b.article?.categoryLabel ?? "";
        if (at !== bt) return at < bt ? -1 : 1;
        return (a.article?.title ?? "") < (b.article?.title ?? "") ? -1 : 1;
      });
  }, [videos, articleById]);

  function onCreated(v: VideoRow) {
    setVideos((prev) => [...prev, v]);
    setAdding(false);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    }
  }

  async function onPatch(id: string, patch: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "update_failed");
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-display text-3xl text-tal-plum">Videos</h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          {adding ? "Cancel" : "+ Add video"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl border border-red-100 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {adding && (
        <AddVideoForm
          articles={articles}
          onCreated={onCreated}
          onCancel={() => setAdding(false)}
        />
      )}

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          No videos yet.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.articleId}>
              <div className="text-xs uppercase tracking-wider text-tal-plum-soft">
                {g.article?.categoryLabel ?? g.articleId}
              </div>
              <h2 className="font-display text-tal-plum text-lg mb-3">
                {g.article?.title ?? g.articleId}
              </h2>
              <ul className="space-y-2">
                {g.rows.map((v, i) => (
                  <VideoRowItem
                    key={v.id}
                    video={v}
                    isFirst={i === 0}
                    isLast={i === g.rows.length - 1}
                    onPatch={onPatch}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRowItem({
  video,
  isFirst,
  isLast,
  onPatch,
  onDelete,
}: {
  video: VideoRow;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onPatch(video.id, { title, description });
    setSaving(false);
    setEditing(false);
  }

  return (
    <li className="rounded-xl border border-tal-line bg-white p-4">
      {editing ? (
        <div className="space-y-2">
          <input
            className="w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="w-full rounded-lg border border-tal-line p-3 text-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !title.trim()}
              className="h-9 px-3 rounded-lg bg-tal-plum text-white text-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(video.title);
                setDescription(video.description ?? "");
                setEditing(false);
              }}
              className="h-9 px-3 rounded-lg text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-48 shrink-0">
            <VideoThumbnail video={video} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-tal-plum">{video.title}</div>
            {video.description && (
              <div className="text-sm text-tal-plum-soft mt-0.5">
                {video.description}
              </div>
            )}
            <div className="text-xs text-tal-plum-soft mt-1 break-all">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-tal-cream text-tal-plum mr-2">
                {video.source}
              </span>
              {video.source === "upload"
                ? video.storage_path
                : video.url}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isFirst}
              onClick={() =>
                onPatch(video.id, { sortOrder: (video.sort_order ?? 0) - 1 })
              }
              className="h-9 w-9 rounded-lg border border-tal-line text-tal-plum hover:bg-tal-cream-soft disabled:opacity-40"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() =>
                onPatch(video.id, { sortOrder: (video.sort_order ?? 0) + 1 })
              }
              className="h-9 w-9 rounded-lg border border-tal-line text-tal-plum hover:bg-tal-cream-soft disabled:opacity-40"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(video.id)}
              className="h-9 px-3 rounded-lg text-sm text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function AddVideoForm({
  articles,
  onCreated,
  onCancel,
}: {
  articles: ArticleMeta[];
  onCreated: (v: VideoRow) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [articleId, setArticleId] = useState(articles[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    articleId &&
    title.trim() &&
    (mode === "upload" ? Boolean(file) : Boolean(url.trim()));

  async function submit() {
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      if (mode === "upload") {
        if (!file) return;
        setProgress("Requesting upload URL…");
        const urlRes = await fetch("/api/videos/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            articleId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });
        if (!urlRes.ok) {
          const b = await urlRes.json().catch(() => ({}));
          throw new Error(b?.error ?? `upload_url_failed (HTTP ${urlRes.status})`);
        }
        const { storagePath, signedUrl } = (await urlRes.json()) as {
          storagePath: string;
          signedUrl: string;
        };

        setProgress("Uploading file…");
        const putRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(`upload_failed (HTTP ${putRes.status})`);
        }

        setProgress("Saving…");
        const confirmRes = await fetch("/api/videos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            articleId,
            title: title.trim(),
            description: description.trim() || null,
            storagePath,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });
        if (!confirmRes.ok) {
          const b = await confirmRes.json().catch(() => ({}));
          throw new Error(b?.error ?? `save_failed (HTTP ${confirmRes.status})`);
        }
        const { video } = (await confirmRes.json()) as { video: VideoRow };
        onCreated(video);
      } else {
        setProgress("Saving…");
        const res = await fetch("/api/videos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            articleId,
            title: title.trim(),
            description: description.trim() || null,
            url: url.trim(),
          }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b?.error ?? `save_failed (HTTP ${res.status})`);
        }
        const { video } = (await res.json()) as { video: VideoRow };
        onCreated(video);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-tal-line bg-white p-4 space-y-3">
      <div className="flex gap-2">
        {(["upload", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "h-9 px-3 rounded-lg text-sm " +
              (mode === m
                ? "bg-tal-plum text-white"
                : "border border-tal-line text-tal-plum hover:bg-tal-cream-soft")
            }
          >
            {m === "upload" ? "Upload file" : "Paste URL"}
          </button>
        ))}
      </div>

      <label className="block text-sm text-tal-plum-soft">
        Article
        <select
          className="mt-1 w-full h-10 rounded-lg border border-tal-line px-2 text-sm bg-white"
          value={articleId}
          onChange={(e) => setArticleId(e.target.value)}
        >
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.categoryLabel} · {a.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-tal-plum-soft">
        Title
        <input
          className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How to fill in your passport form"
        />
      </label>

      <label className="block text-sm text-tal-plum-soft">
        Description <span className="text-xs">(optional)</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-tal-line p-3 text-sm"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {mode === "upload" ? (
        <label className="block text-sm text-tal-plum-soft">
          File <span className="text-xs">(mp4/mov/webm/mp3/wav, max 50 MB)</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>
      ) : (
        <label className="block text-sm text-tal-plum-soft">
          Video URL <span className="text-xs">(YouTube, Vimeo, or any link)</span>
          <input
            className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
      )}

      {progress && (
        <div className="text-sm text-tal-plum-soft">{progress}</div>
      )}
      {error && (
        <div className="p-3 rounded-lg border border-red-100 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || busy}
          className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "upload" ? "Upload & save" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-10 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
