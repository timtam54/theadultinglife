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
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
        We couldn&apos;t read the transactions from this PDF. PDF layouts vary
        between banks and don&apos;t always parse cleanly.
        <div className="mt-1">
          Try downloading the same statement as a <strong>CSV</strong> from your
          bank and uploading that instead — CSVs parse reliably.
        </div>
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
  // Bank statement descriptions often contain raw backslashes (e.g.
  // "EFTPOS WOOLWORTHS 2741\TOWNSVILLE QLD AU"). These come out of the
  // scanner as JSON-invalid \T / \N / \W / etc. escapes. Repair by
  // doubling any backslash that isn't followed by a valid JSON escape
  // character before parsing.
  function repairEscapes(s: string): string {
    return s.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
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
  const attempts = [candidate, repairEscapes(candidate)];
  for (const s of attempts) {
    try {
      const out = coerce(JSON.parse(s));
      if (out) return out;
    } catch {
      /* try next attempt */
    }
    // Slice to the first { … last } pair and retry.
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        const out = coerce(JSON.parse(s.slice(first, last + 1)));
        if (out) return out;
      } catch {
        /* try next attempt */
      }
    }
  }
  return null;
}
