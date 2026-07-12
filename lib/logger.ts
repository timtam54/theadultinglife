import { insertLog } from "@/lib/db/app_logs";
import type { LogLevel } from "@/lib/db/types";

export interface LogContext {
  userId?: string | null;
  familyGroupId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

function extractError(err: unknown): { message: string; stack: string | null } {
  if (err instanceof Error) {
    return { message: err.message || err.name, stack: err.stack ?? null };
  }
  if (typeof err === "string") return { message: err, stack: null };
  try {
    return { message: JSON.stringify(err), stack: null };
  } catch {
    return { message: String(err), stack: null };
  }
}

async function write(
  level: LogLevel,
  source: string,
  err: unknown,
  ctx: LogContext
): Promise<void> {
  const { message, stack } = extractError(err);
  const consoleFn = level === "error" ? console.error : console.warn;
  consoleFn(`[${level}] ${source}: ${message}`, err);
  try {
    await insertLog({
      level,
      source,
      message,
      userId: ctx.userId ?? null,
      familyGroupId: ctx.familyGroupId ?? null,
      requestId: ctx.requestId ?? null,
      stack,
      metadata: ctx.metadata ?? null,
    });
  } catch (insertErr) {
    console.error("[logger] failed to persist log", insertErr);
  }
}

export const logger = {
  error(source: string, err: unknown, ctx: LogContext = {}): Promise<void> {
    return write("error", source, err, ctx);
  },
  warn(source: string, err: unknown, ctx: LogContext = {}): Promise<void> {
    return write("warn", source, err, ctx);
  },
};

export function newRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
}
