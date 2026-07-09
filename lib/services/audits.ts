import { insertAudit, listAudits } from "@/lib/db/audits";
import type { AuditRow } from "@/lib/db/types";

const MAX_LEN = 200;
const clip = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > MAX_LEN ? t.slice(0, MAX_LEN) : t;
};

const ALLOWED_ACTIONS = new Set([
  "web",
  "pwa",
  "ios-safari",
  "android-chrome",
  "unknown",
]);

export async function logAudit(input: {
  userId: string | null;
  usernameFallback: string;
  page: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  email?: string | null;
}): Promise<void> {
  const page = clip(input.page);
  if (!page) return;
  const action = ALLOWED_ACTIONS.has(input.action) ? input.action : "unknown";
  const username =
    clip(input.email) ?? clip(input.usernameFallback) ?? "anonymous";
  await insertAudit({
    userId: input.userId,
    username,
    page,
    action,
    ipAddress: clip(input.ipAddress),
    userAgent: clip(input.userAgent),
  });
}

export async function getAllAudits(limit = 1000): Promise<AuditRow[]> {
  return listAudits(limit);
}
