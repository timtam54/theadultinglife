export type LegalBlock =
  | { t: "h2" | "h3" | "p"; text: string }
  | { t: "list"; items: { text: string; sub?: string[] }[] };
