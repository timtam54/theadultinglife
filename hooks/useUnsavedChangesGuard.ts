"use client";

import { useCallback, useEffect, useRef } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

interface Guard {
  markSaved: () => void;
}

export function useUnsavedChangesGuard(isDirty: boolean): Guard {
  const { setBlocked } = useNavigationBlocker();
  const activeRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return;
    activeRef.current = true;
    setBlocked(true);
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (activeRef.current) {
        activeRef.current = false;
        setBlocked(false);
      }
    };
  }, [isDirty, setBlocked]);

  const markSaved = useCallback(() => {
    if (activeRef.current) {
      activeRef.current = false;
      setBlocked(false);
    }
  }, [setBlocked]);

  return { markSaved };
}
