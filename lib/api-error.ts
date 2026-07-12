import { NextResponse } from "next/server";
import { logger, newRequestId, type LogContext } from "@/lib/logger";

export interface ApiErrorBody {
  error: string;
  message: string;
  requestId: string;
}

export function apiError(
  source: string,
  err: unknown,
  opts: {
    status?: number;
    code?: string;
    ctx?: LogContext;
  } = {}
): NextResponse<ApiErrorBody> {
  const status = opts.status ?? 500;
  const code = opts.code ?? (status >= 500 ? "server_error" : "bad_request");
  const requestId = opts.ctx?.requestId ?? newRequestId();
  const message =
    err instanceof Error ? err.message : status >= 500 ? "Something went wrong." : String(err);

  const level = status >= 500 ? "error" : "warn";
  void logger[level](source, err, { ...opts.ctx, requestId });

  return NextResponse.json<ApiErrorBody>(
    { error: code, message, requestId },
    { status }
  );
}
