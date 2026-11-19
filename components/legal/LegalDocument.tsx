import type { ReactNode } from "react";
import type { LegalBlock } from "@/lib/legal/types";

// Renders a legal document generated from the lawyers' Word file
// (lib/legal/*.ts): numbered headings, paragraphs, and (a), (b)… lists with
// (i), (ii)… sub-items, as in the original. Emails and web addresses become
// links; defined terms in the Definitions and General clauses are bold.

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

function linkify(text: string): ReactNode[] {
  return text.split(/((?:https?:\/\/|www\.)[^\s,;)]+|[\w.+-]+@[\w-]+\.[\w.]+)/g).map((part, i) => {
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(part)) return <a key={i} href={`mailto:${part}`}>{part}</a>;
    if (/^(https?:\/\/|www\.)/.test(part)) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{part}</a>;
    }
    return part;
  });
}

/** "Account means …" / "Assignment - …": bold the term being defined. */
function withTerm(text: string, section: string): ReactNode {
  const m =
    (section.endsWith("Definitions") && text.match(/^(.+?)( means | takes its meaning )(.*)$/)) ||
    (section.endsWith("General") && text.match(/^([A-Z][\w ]+?)( - )(.*)$/));
  if (!m) return linkify(text);
  return (
    <>
      <strong>{m[1]}</strong>
      {m[2]}
      {linkify(m[3])}
    </>
  );
}

export function LegalDocument({ blocks, entity }: { blocks: LegalBlock[]; entity: string }) {
  // The numbered section each block sits in (for bolding defined terms).
  const sections: string[] = [];
  for (const b of blocks) sections.push(b.t === "h2" ? b.text : (sections.at(-1) ?? ""));
  return (
    <div className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-tal-plum prose-p:text-tal-plum prose-p:leading-relaxed prose-li:text-tal-plum prose-a:text-tal-plum prose-strong:text-tal-plum">
      <p className="text-sm text-tal-plum-soft">{entity}</p>
      {blocks.map((b, i) => {
        if (b.t !== "list") {
          if (b.t === "h2") return <h2 key={i}>{b.text}</h2>;
          if (b.t === "h3") return <h3 key={i}>{b.text}</h3>;
          return <p key={i}>{withTerm(b.text, sections[i])}</p>;
        }
        return (
          <ol key={i} className="list-none pl-0">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2 pl-0">
                <span className="shrink-0 tabular-nums">({LETTERS[j]})</span>
                <span>
                  {linkify(item.text)}
                  {item.sub && (
                    <ol className="mt-1 list-none pl-0">
                      {item.sub.map((s, k) => (
                        <li key={k} className="flex gap-2 pl-0">
                          <span className="shrink-0">({ROMAN[k]})</span>
                          <span>{linkify(s)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
