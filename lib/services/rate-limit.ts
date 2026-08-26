import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Per-feature limits. Tuned so real users never hit them but a script does.
// If a limit ever bites a real user, bump the daily cap first.
export const AI_LIMITS = {
  "tal-ai-chat": { perHour: 30, perDay: 100, estCostUsd: 0.02 },
  "scan-document": { perHour: 15, perDay: 40, estCostUsd: 0.05 },
  "receipt-scan": { perHour: 30, perDay: 80, estCostUsd: 0.03 },
  "transcribe": { perHour: 20, perDay: 60, estCostUsd: 0.04 },
  "template-generate": { perHour: 5, perDay: 15, estCostUsd: 0.03 },
} as const;

export type AiFeature = keyof typeof AI_LIMITS;

// Global daily USD spend cap across ALL users, ALL features. Kill-switch that
// stops OpenAI calls if a day's estimated cost crosses this. Configurable via
// AI_DAILY_SPEND_CAP_USD env var; defaults to $50 for pre-launch.
function dailySpendCapUsd(): number {
  const raw = process.env.AI_DAILY_SPEND_CAP_USD;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 50;
}

export class RateLimitError extends Error {
  constructor(
    public readonly reason: "per_hour" | "per_day",
    public readonly feature: AiFeature,
    public readonly retryAfterSeconds: number
  ) {
    super(`rate_limit_${reason}`);
    this.name = "RateLimitError";
  }
}

export class SpendCapError extends Error {
  constructor() {
    super("spend_cap_exceeded");
    this.name = "SpendCapError";
  }
}

// Call BEFORE hitting OpenAI. Throws RateLimitError or SpendCapError if the
// caller is over any limit. Otherwise records the event + estimated cost and
// returns.
export async function enforceAiRateLimit(
  userId: string,
  feature: AiFeature
): Promise<void> {
  const cfg = AI_LIMITS[feature];
  const supabase = createServiceClient();
  const nowMs = Date.now();
  const hourAgo = new Date(nowMs - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  // Fetch counts for this user + feature (both windows) and the global daily
  // spend total in parallel.
  const [hourRes, dayRes, spendRes] = await Promise.all([
    supabase
      .from("ai_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", hourAgo),
    supabase
      .from("ai_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", dayAgo),
    supabase
      .from("ai_spend_ledger")
      .select("cost_usd")
      .gte("created_at", startOfDayIso),
  ]);

  if (hourRes.error) throw hourRes.error;
  if (dayRes.error) throw dayRes.error;
  if (spendRes.error) throw spendRes.error;

  const hourCount = hourRes.count ?? 0;
  const dayCount = dayRes.count ?? 0;
  const todaySpend = (spendRes.data ?? []).reduce(
    (sum, row) => sum + Number((row as { cost_usd: number }).cost_usd ?? 0),
    0
  );

  // Global spend cap first — protects all features together.
  const cap = dailySpendCapUsd();
  if (todaySpend >= cap) {
    void logger.warn("ai-rate-limit", new Error("spend_cap_exceeded"), {
      userId,
      metadata: { feature, todaySpend, cap },
    });
    throw new SpendCapError();
  }

  if (hourCount >= cfg.perHour) {
    void logger.warn("ai-rate-limit", new Error("per_hour_limit"), {
      userId,
      metadata: { feature, hourCount, limit: cfg.perHour },
    });
    throw new RateLimitError("per_hour", feature, 60 * 60);
  }

  if (dayCount >= cfg.perDay) {
    void logger.warn("ai-rate-limit", new Error("per_day_limit"), {
      userId,
      metadata: { feature, dayCount, limit: cfg.perDay },
    });
    throw new RateLimitError("per_day", feature, 24 * 60 * 60);
  }

  // Under both limits — record the event and add estimated cost to today's
  // spend. Fire-and-forget so a slow write doesn't gate the AI call, but
  // await both writes to preserve ordering under test.
  const nowIso = new Date().toISOString();
  const [evtRes, spendWriteRes] = await Promise.all([
    supabase.from("ai_rate_limit_events").insert({
      user_id: userId,
      feature,
      created_at: nowIso,
    }),
    supabase.from("ai_spend_ledger").insert({
      user_id: userId,
      feature,
      cost_usd: cfg.estCostUsd,
      created_at: nowIso,
    }),
  ]);
  if (evtRes.error) {
    void logger.error("ai-rate-limit-insert", evtRes.error, {
      userId,
      metadata: { feature },
    });
  }
  if (spendWriteRes.error) {
    void logger.error("ai-spend-insert", spendWriteRes.error, {
      userId,
      metadata: { feature },
    });
  }
}
