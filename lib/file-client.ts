"use client";

// Browser helpers for uploaded documents: fetch, download and device checks.
// iPads behave differently from computers — opening a file link in a new
// tab throws the installed app out to Safari with no way back, and plain
// downloads are unreliable there — so on iPhone/iPad "Download" opens the
// device's own sheet (Save to Files, Print, AirDrop) instead.

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isTouchDevice(): boolean {
  return isIOSDevice() || (typeof navigator !== "undefined" && /Android/.test(navigator.userAgent));
}

export interface FetchedFile {
  file: File;
  url: string;
}

/** Signed link + metadata for an uploaded file the viewer can access. */
export async function fileLink(fileId: string): Promise<{ url: string; filename: string | null; mime: string | null }> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`);
  if (!res.ok) throw new Error("Couldn't load the file.");
  const j = (await res.json()) as { url: string; filename: string | null; mime_type: string | null };
  return { url: j.url, filename: j.filename, mime: j.mime_type };
}

/** Downloads the bytes of a file from a (signed) URL. */
export async function fetchAsFile(url: string, filename: string, mime: string | null): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load the file.");
  const blob = await res.blob();
  return new File([blob], filename, { type: mime ?? (blob.type || "application/octet-stream") });
}

/** Saves a file to the device. On iPhone/iPad this opens the system sheet
 *  (Save to Files / Print / AirDrop); elsewhere it's a normal download. */
export async function saveFileToDevice(file: File): Promise<void> {
  if (isIOSDevice() && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (e) {
      // Closing the sheet is fine; anything else falls back to a download.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

/** Download an uploaded document by id. */
export async function downloadFileById(fileId: string, fallbackName = "document"): Promise<void> {
  const link = await fileLink(fileId);
  const file = await fetchAsFile(link.url, link.filename ?? fallbackName, link.mime);
  await saveFileToDevice(file);
}

/** Print an uploaded document. On a computer, PDFs and photos open the
 *  browser's print box straight away (from a hidden frame, so nothing
 *  leaves the app). Phones and tablets can't print a file from a web page,
 *  so they get the device's share sheet, which has Print. Other file types
 *  (e.g. Word) download, to print from the app that opens them. */
export async function printFileById(fileId: string, fallbackName = "document"): Promise<void> {
  const link = await fileLink(fileId);
  const file = await fetchAsFile(link.url, link.filename ?? fallbackName, link.mime);
  if (isTouchDevice()) {
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await saveFileToDevice(file);
    return;
  }
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    await saveFileToDevice(file);
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  const cleanUp = () => {
    frame.remove();
    URL.revokeObjectURL(objectUrl);
  };
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // Some browsers won't print a PDF from a frame — open it instead,
      // where the browser's own viewer has Print.
      window.open(objectUrl, "_blank", "noopener");
    }
    // Keep the frame until the print box has taken the document.
    setTimeout(cleanUp, 60_000);
  };
  if (isImage) {
    // A photo on its own page, scaled to fit.
    frame.srcdoc = `<!doctype html><title>${file.name.replace(/[<&]/g, "")}</title><style>@page{margin:12mm}html,body{margin:0;height:100%}img{max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto}</style><img src="${objectUrl}">`;
  } else {
    frame.src = objectUrl;
  }
  document.body.appendChild(frame);
}
