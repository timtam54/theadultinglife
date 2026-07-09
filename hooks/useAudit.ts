"use client";

import { useCallback, useEffect, useRef } from "react";
import { getAuditPlatform } from "./platform";

async function postAudit(page: string, action: string): Promise<void> {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page, action }),
      keepalive: true,
    });
  } catch (e) {
    console.warn("[useAudit] failed", e);
  }
}

export function useAudit(page: string, options: { autoLog?: boolean } = {}) {
  const { autoLog = true } = options;
  const firedRef = useRef(false);

  const logAudit = useCallback(
    async (action?: string) => {
      await postAudit(page, action ?? getAuditPlatform());
    },
    [page]
  );

  useEffect(() => {
    if (!autoLog || firedRef.current) return;
    firedRef.current = true;
    void logAudit();
  }, [autoLog, logAudit]);

  return logAudit;
}
