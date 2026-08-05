import { insertAudit } from "@/lib/db/audits";

const MAX_LEN = 200;
const clip = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > MAX_LEN ? t.slice(0, MAX_LEN) : t;
};

// Device / channel codes accepted from the client-side /api/audit POST.
// Anything else from the browser is coerced to "unknown".
const DEVICE_ACTIONS = new Set([
  "web",
  "pwa",
  "ios-safari",
  "android-chrome",
  "unknown",
]);

// Server-only event codes. Grouped roughly by feature so the analytics
// dashboard can bucket them. Keep the alphabet stable — the funnel and
// feature-adoption cards match on these strings.
export const EVENT_ACTIONS = [
  "account.created",
  "onboarding.completed",
  "category.opened",
  "record.created",
  "record.updated",
  "record.deleted",
  "document.uploaded",
  "receipt.created",
  "task.created",
  "reminder.created",
  "lesson.started",
  "lesson.completed",
  "impersonate.start",
  "impersonate.exit",
] as const;
export type EventAction = (typeof EVENT_ACTIONS)[number];
const EVENT_ACTION_SET = new Set<string>(EVENT_ACTIONS);

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
  // Accept device codes OR server-side event codes. Anything else → "unknown"
  // so a bad client can't inject arbitrary strings into analytics.
  const action = DEVICE_ACTIONS.has(input.action)
    ? input.action
    : EVENT_ACTION_SET.has(input.action)
      ? input.action
      : "unknown";
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

// Server-side helper for domain events (record.created, receipt.created, …).
// Never called from the browser — write paths import this directly. Fire-and
// -forget: swallows errors so a telemetry hiccup can't fail the write.
export async function logEvent(input: {
  userId: string | null;
  email?: string | null;
  action: EventAction;
  page: string;
}): Promise<void> {
  try {
    await logAudit({
      userId: input.userId,
      usernameFallback: input.userId ?? "system",
      page: input.page,
      action: input.action,
      ipAddress: null,
      userAgent: null,
      email: input.email ?? null,
    });
  } catch (e) {
    // Never let telemetry break the user's write.
    console.error("[logEvent]", input.action, e);
  }
}

