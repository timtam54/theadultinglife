import type { RecordField } from "@/lib/db/types";

export interface ScanPrefill {
  title: string;
  fields: RecordField[];
  expiryDate: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
  sourceFileId: string | null;
  sourceMime: string | null;
  sourceFilename: string | null;
}

const KEY = "tal:scan-prefill";

export function writeScanPrefill(prefill: ScanPrefill): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch {
    /* quota or storage unavailable — nothing to do */
  }
}

export function readScanPrefill(): ScanPrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as ScanPrefill;
  } catch {
    return null;
  }
}
