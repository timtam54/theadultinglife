"use client";

// Read-only table that renders `transactions_json` field values. The value
// is a JSON blob shaped `{ headers: string[], rows: string[][] }`. Empty or
// unparseable values render a subtle placeholder.
export function TransactionsTable({ value }: { value: string }) {
  if (!value) {
    return (
      <div className="text-xs italic text-tal-plum-soft">
        No transactions yet. Upload a CSV statement above and the rows will
        appear here.
      </div>
    );
  }
  const parsed = tryParseTransactions(value);
  if (!parsed) {
    return (
      <div className="text-xs text-red-700">
        Couldn&apos;t read the transactions data.
        <details className="mt-1">
          <summary className="cursor-pointer text-tal-plum-soft">Show raw</summary>
          <pre className="mt-1 whitespace-pre-wrap text-[10px] text-tal-plum-soft max-h-40 overflow-auto">
            {value}
          </pre>
        </details>
      </div>
    );
  }
  const headers = parsed?.headers ?? [];
  const rows = parsed?.rows ?? [];
  if (rows.length === 0) {
    return (
      <div className="text-xs italic text-tal-plum-soft">
        No transactions found in the file.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-tal-line bg-white overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-tal-cream-soft text-tal-plum-soft uppercase tracking-wider">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 whitespace-nowrap">
                {h || `Col ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-tal-line">
              {r.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[10px] text-tal-plum-soft border-t border-tal-line">
        {rows.length} transaction{rows.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

// Try hard to extract a { headers, rows } shape from whatever the AI or
// CSV parser stuffed into the value. Handles markdown fences, leading
// labels, double-encoded JSON strings, and outer noise around the real
// JSON object.
function tryParseTransactions(
  raw: string
): { headers: string[]; rows: string[][] } | null {
  function strip(s: string): string {
    let x = s.trim();
    // ```json ... ```  /  ``` ... ```
    const fence = x.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) x = fence[1].trim();
    // "value:" / "json:" / "transactions:" prefix.
    x = x.replace(/^(?:value|json|transactions)\s*[:=]\s*/i, "").trim();
    return x;
  }
  function coerce(v: unknown): { headers: string[]; rows: string[][] } | null {
    if (typeof v === "string") {
      // Double-encoded — parse again.
      try {
        return coerce(JSON.parse(strip(v)));
      } catch {
        return null;
      }
    }
    if (!v || typeof v !== "object") return null;
    const obj = v as { headers?: unknown; rows?: unknown };
    if (!Array.isArray(obj.headers) || !Array.isArray(obj.rows)) return null;
    const headers = obj.headers.map((h) => String(h ?? ""));
    const rows = obj.rows
      .filter((r): r is unknown[] => Array.isArray(r))
      .map((r) => r.map((c) => (c == null ? "" : String(c))));
    return { headers, rows };
  }
  const candidate = strip(raw);
  // Straight parse first.
  try {
    const out = coerce(JSON.parse(candidate));
    if (out) return out;
  } catch {
    /* fall through to bracket slice */
  }
  // Slice to the first { … last } pair and retry.
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const inner = candidate.slice(first, last + 1);
    try {
      const out = coerce(JSON.parse(inner));
      if (out) return out;
    } catch {
      /* give up */
    }
  }
  return null;
}
