"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDownloadLink } from "@/components/FileDownloadLink";

interface Props {
  fileId: string;
  filename: string;
  mimeType: string | null;
  linkedRecordId: string | null;
  subcategoryId: string | null;
}

type Busy = "idle" | "replacing" | "deleting" | "relinking";

export function DocumentActionsMenu({
  fileId,
  filename,
  mimeType,
  linkedRecordId,
  subcategoryId,
}: Props) {
  void mimeType;
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [relinkOpen, setRelinkOpen] = useState(false);
  const [subDraft, setSubDraft] = useState(subcategoryId ?? "");
  const [recDraft, setRecDraft] = useState(linkedRecordId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleReplace(file: File) {
    setError(null);
    setBusy("replacing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "replace_failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "replace_failed");
    } finally {
      setBusy("idle");
    }
  }

  async function handleDelete() {
    setError(null);
    setBusy("deleting");
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      setConfirmDelete(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setBusy("idle");
    }
  }

  async function handleRelink() {
    setError(null);
    setBusy("relinking");
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subcategoryId: subDraft || null,
          recordId: recDraft || null,
        }),
      });
      if (!res.ok) throw new Error("relink_failed");
      setRelinkOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "relink_failed");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <FileDownloadLink fileId={fileId}>Download</FileDownloadLink>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy !== "idle"}
        className="h-9 px-3 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        {busy === "replacing" ? "Replacing…" : "Replace"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplace(f);
          e.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => setRelinkOpen(true)}
        disabled={busy !== "idle"}
        className="h-9 px-3 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
      >
        Relink
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={busy !== "idle"}
        className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm hover:bg-red-100 disabled:opacity-60"
      >
        Delete
      </button>

      {error && (
        <span className="basis-full text-xs text-red-700 mt-1">{error}</span>
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => busy === "idle" && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-tal-plum mb-2">
              Delete this document?
            </h3>
            <p className="text-sm text-tal-plum-soft mb-4">
              <span className="font-medium text-tal-plum break-all">
                {filename}
              </span>{" "}
              will be permanently removed. Your Organiser entry stays; only the
              file goes.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy !== "idle"}
                className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy !== "idle"}
                className="h-9 px-4 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {busy === "deleting" ? "Deleting…" : "Delete document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {relinkOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => busy === "idle" && setRelinkOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-tal-plum mb-2">
              Move this document
            </h3>
            <p className="text-sm text-tal-plum-soft mb-4">
              Change which folder or Organiser entry this document is attached
              to. The file itself stays the same.
            </p>
            <label className="block mb-3">
              <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                Folder ID
              </span>
              <input
                type="text"
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                placeholder="e.g. personal.passport_travel"
                className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                Linked entry ID (optional)
              </span>
              <input
                type="text"
                value={recDraft}
                onChange={(e) => setRecDraft(e.target.value)}
                placeholder="Leave blank for no linked entry"
                className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRelinkOpen(false)}
                disabled={busy !== "idle"}
                className="h-9 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRelink}
                disabled={busy !== "idle"}
                className="h-9 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                {busy === "relinking" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
