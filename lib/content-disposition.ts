// Download header for a file name that may hold characters a header can't
// carry (e.g. the "—" in "Custom — Medication List", or accents). Plain
// fallback name for old browsers, plus the real name encoded (RFC 6266).
export function attachmentDisposition(filename: string): string {
  const plain = filename.replace(/[—–]/g, "-").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "").trim() || "document";
  return `attachment; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** The file name from a download header (prefers the encoded real name). */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (star) {
    try {
      return decodeURIComponent(star);
    } catch {
      /* fall through to the plain name */
    }
  }
  return /filename="([^"]+)"/.exec(header)?.[1] ?? null;
}
