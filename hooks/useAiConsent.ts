"use client";

import { useCallback, useState } from "react";
import {
  hasConsented,
  type AiConsentKind,
} from "@/components/AiConsentGate";

/**
 * Guards an AI action with a first-time consent prompt on this device.
 *
 * Usage:
 *   const { pendingKind, requestConsent, onGranted, onCancel } =
 *     useAiConsent();
 *   ...
 *   const ok = await requestConsent("scan-document");
 *   if (!ok) return;
 *   // proceed with the AI call
 *
 * Render <AiConsentGate kind={pendingKind} .../> when pendingKind is set.
 * The hook returns a promise that resolves true when the user accepts,
 * false when they cancel.
 */
export function useAiConsent() {
  const [pendingKind, setPendingKind] = useState<AiConsentKind | null>(null);
  const [resolver, setResolver] = useState<
    ((granted: boolean) => void) | null
  >(null);

  const requestConsent = useCallback(
    (kind: AiConsentKind): Promise<boolean> => {
      if (hasConsented(kind)) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        setPendingKind(kind);
        setResolver(() => resolve);
      });
    },
    []
  );

  const onGranted = useCallback(() => {
    resolver?.(true);
    setPendingKind(null);
    setResolver(null);
  }, [resolver]);

  const onCancel = useCallback(() => {
    resolver?.(false);
    setPendingKind(null);
    setResolver(null);
  }, [resolver]);

  return { pendingKind, requestConsent, onGranted, onCancel };
}
