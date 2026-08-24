import { promises as fs } from "node:fs";
import path from "node:path";

const HELP_DIR = path.join(process.cwd(), "content", "help");

export interface HelpDoc {
  slug: string;
  title: string;
  pdfPage: number | null;
  source: "pdf" | "ai";
  bodyMarkdown: string;
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return { data, body: match[2] };
}

// Slugs come from a fixed set (route-to-slug.ts) but sanitise anyway to keep
// callers from ever escaping the help directory.
function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9._-]+$/i.test(slug);
}

export async function loadHelpDoc(slug: string): Promise<HelpDoc | null> {
  if (!isSafeSlug(slug)) return null;
  const filePath = path.join(HELP_DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(raw);
  return {
    slug: data.slug ?? slug,
    title: data.title ?? slug,
    pdfPage: data.pdfPage ? Number(data.pdfPage) : null,
    source: data.source === "ai" ? "ai" : "pdf",
    bodyMarkdown: body.trim(),
  };
}
