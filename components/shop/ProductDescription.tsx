// Product text is plain text the admin types: a blank line starts a new
// paragraph, lines starting with "- " are bullet points, **like this** is
// bold and "## " is a heading. Links are made clickable.

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">
          {part}
        </a>
      );
    }
    return part;
  });
}

export function ProductDescription({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className ?? "space-y-4 text-base leading-relaxed text-tal-plum"}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="font-display text-xl">
              {block.slice(3)}
            </h2>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}
