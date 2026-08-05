import { createServiceClient } from "@/lib/supabase/server";
import { EVENT_ACTIONS } from "./audits";

const DEVICE_ACTIONS = [
  "web",
  "pwa",
  "ios-safari",
  "android-chrome",
  "unknown",
] as const;
type DeviceAction = (typeof DEVICE_ACTIONS)[number];

const FUNNEL_STEPS = [
  { key: "account.created", label: "Signed up" },
  { key: "record.created", label: "First record" },
  { key: "document.uploaded", label: "First document" },
  { key: "reminder.created", label: "First reminder" },
  { key: "lesson.completed", label: "First lesson" },
] as const;

const ADOPTION_FEATURES = [
  { key: "record.created", label: "Records" },
  { key: "document.uploaded", label: "Documents" },
  { key: "receipt.created", label: "Receipts" },
  { key: "reminder.created", label: "Reminders" },
  { key: "task.created", label: "Tasks" },
  { key: "lesson.started", label: "Learn" },
] as const;

export interface AnalyticsSummary {
  windowFrom: string;
  windowTo: string;
  totalEvents: number;
  eventCounts: { action: string; hits: number }[];
  pageHits: { page: string; hits: number }[];
  activeUsers: {
    daily: { date: string; users: number }[];
    weekly: { weekStart: string; users: number }[];
    windowTotal: number;
  };
  funnel: { step: string; label: string; users: number; pct: number }[];
  adoption: { feature: string; label: string; users: number; pct: number }[];
  devices: { device: string; hits: number }[];
  totalUsers: number;
}

interface RawRow {
  user_id: string | null;
  action: string;
  page: string;
  created_at: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekStart(iso: string): string {
  // Monday-anchored week — matches Australian calendars.
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = Sunday
  const back = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - back);
  return isoDate(d);
}

export async function buildAnalyticsSummary(
  fromDate: string,
  toDate: string
): Promise<AnalyticsSummary> {
  const supabase = createServiceClient();

  // 1. Every audit row in the window that has a user_id or action we care about.
  const { data: rowsRaw, error } = await supabase
    .from("audits")
    .select("user_id, action, page, created_at")
    .gte("created_at", `${fromDate}T00:00:00.000Z`)
    .lt("created_at", `${toDate}T23:59:59.999Z`)
    .limit(100_000);
  if (error) throw error;
  const rows = (rowsRaw ?? []) as RawRow[];

  // 2. Total registered users, for the % denominators.
  const { count: totalUsersCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });
  const totalUsers = totalUsersCount ?? 0;

  // 3. Event counts (excluding device page-views).
  const eventCounts = new Map<string, number>();
  for (const r of rows) {
    if ((EVENT_ACTIONS as readonly string[]).includes(r.action)) {
      eventCounts.set(r.action, (eventCounts.get(r.action) ?? 0) + 1);
    }
  }

  // 4. Page hits (only page-view actions — anything device-typed).
  const pageHitsMap = new Map<string, number>();
  for (const r of rows) {
    if ((DEVICE_ACTIONS as readonly string[]).includes(r.action)) {
      pageHitsMap.set(r.page, (pageHitsMap.get(r.page) ?? 0) + 1);
    }
  }
  const pageHits = Array.from(pageHitsMap.entries())
    .map(([page, hits]) => ({ page, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 20);

  // 5. Active users — daily distinct user_ids, weekly distinct, window-total distinct.
  const dailyUsers = new Map<string, Set<string>>();
  const weeklyUsers = new Map<string, Set<string>>();
  const windowUserSet = new Set<string>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const day = r.created_at.slice(0, 10);
    if (!dailyUsers.has(day)) dailyUsers.set(day, new Set());
    dailyUsers.get(day)!.add(r.user_id);
    const wk = weekStart(day);
    if (!weeklyUsers.has(wk)) weeklyUsers.set(wk, new Set());
    weeklyUsers.get(wk)!.add(r.user_id);
    windowUserSet.add(r.user_id);
  }
  const daily = Array.from(dailyUsers.entries())
    .map(([date, set]) => ({ date, users: set.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekly = Array.from(weeklyUsers.entries())
    .map(([weekStart, set]) => ({ weekStart, users: set.size }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // 6. Funnel — for each step, how many distinct users have fired that event
  //    at least once, ever (not just in window). "Ever" is more useful than
  //    window-based counts for a funnel — otherwise the drop-off between
  //    signup and first-record looks catastrophic just because signups happened
  //    outside the window.
  const funnelUsersByStep = await distinctUserCountsForActions(
    FUNNEL_STEPS.map((s) => s.key)
  );
  const signedUp = funnelUsersByStep.get("account.created") ?? 0;
  const funnel = FUNNEL_STEPS.map((s) => {
    const users = funnelUsersByStep.get(s.key) ?? 0;
    const pct = signedUp > 0 ? Math.round((users / signedUp) * 100) : 0;
    return { step: s.key, label: s.label, users, pct };
  });

  // 7. Adoption — % of registered users who have used each feature in the
  //    window (any event of that type).
  const featureKeys: readonly string[] = ADOPTION_FEATURES.map((f) => f.key);
  const windowFeatureUsers = new Map<string, Set<string>>();
  for (const key of featureKeys) windowFeatureUsers.set(key, new Set());
  for (const r of rows) {
    if (!r.user_id) continue;
    if (featureKeys.includes(r.action)) {
      windowFeatureUsers.get(r.action)!.add(r.user_id);
    }
  }
  const adoption = ADOPTION_FEATURES.map((f) => {
    const users = windowFeatureUsers.get(f.key)?.size ?? 0;
    const pct = totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0;
    return { feature: f.key, label: f.label, users, pct };
  });

  // 8. Device breakdown — device-typed rows only, grouped by action.
  const devices = new Map<string, number>();
  for (const r of rows) {
    if ((DEVICE_ACTIONS as readonly string[]).includes(r.action)) {
      devices.set(r.action, (devices.get(r.action) ?? 0) + 1);
    }
  }
  const deviceList = (DEVICE_ACTIONS as readonly DeviceAction[]).map((d) => ({
    device: d,
    hits: devices.get(d) ?? 0,
  }));

  return {
    windowFrom: fromDate,
    windowTo: toDate,
    totalEvents: Array.from(eventCounts.values()).reduce((a, b) => a + b, 0),
    eventCounts: Array.from(eventCounts.entries())
      .map(([action, hits]) => ({ action, hits }))
      .sort((a, b) => b.hits - a.hits),
    pageHits,
    activeUsers: {
      daily,
      weekly,
      windowTotal: windowUserSet.size,
    },
    funnel,
    adoption,
    devices: deviceList,
    totalUsers,
  };
}

// Distinct user_id count for each of the given actions, across all time.
async function distinctUserCountsForActions(
  actions: readonly string[]
): Promise<Map<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("audits")
    .select("user_id, action")
    .in("action", actions as string[])
    .not("user_id", "is", null)
    .limit(200_000);
  if (error) throw error;
  const byAction = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { user_id: string; action: string }[]) {
    if (!byAction.has(row.action)) byAction.set(row.action, new Set());
    byAction.get(row.action)!.add(row.user_id);
  }
  const out = new Map<string, number>();
  for (const [k, set] of byAction) out.set(k, set.size);
  return out;
}
