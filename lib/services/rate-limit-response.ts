import { NextResponse } from "next/server";
import { RateLimitError, SpendCapError, AI_LIMITS, type AiFeature } from "./rate-limit";

// Friendly message per feature, keeps the UI copy consistent no matter which
// endpoint tripped the limit.
const FEATURE_LABEL: Record<AiFeature, string> = {
  "tal-ai-chat": "TAL AI chat",
  "scan-document": "document scanning",
  "receipt-scan": "receipt scanning",
  "transcribe": "voice transcription",
  "template-generate": "template generation",
};

export function isRateLimitOrSpendError(
  e: unknown
): e is RateLimitError | SpendCapError {
  return e instanceof RateLimitError || e instanceof SpendCapError;
}

export function rateLimitResponse(
  e: RateLimitError | SpendCapError
): NextResponse {
  if (e instanceof SpendCapError) {
    return NextResponse.json(
      {
        error: "ai_spend_cap",
        message:
          "Our AI features are temporarily paused for cost protection. Please try again later.",
      },
      { status: 503 }
    );
  }
  const label = FEATURE_LABEL[e.feature];
  const limitCfg = AI_LIMITS[e.feature];
  const message =
    e.reason === "per_hour"
      ? `You've hit this hour's limit for ${label} (${limitCfg.perHour}). Try again in a bit — it resets each hour.`
      : `You've hit today's limit for ${label} (${limitCfg.perDay}). It resets at midnight.`;
  return NextResponse.json(
    {
      error: "rate_limited",
      feature: e.feature,
      reason: e.reason,
      retryAfterSeconds: e.retryAfterSeconds,
      message,
    },
    {
      status: 429,
      headers: { "Retry-After": String(e.retryAfterSeconds) },
    }
  );
}
