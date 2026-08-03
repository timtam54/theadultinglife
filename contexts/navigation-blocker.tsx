"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

interface NavigationBlockerContextValue {
  isBlocked: boolean;
  setBlocked: (blocked: boolean) => void;
  confirmDiscard: () => Promise<boolean>;
  pendingConfirm: {
    open: boolean;
    resolve: ((ok: boolean) => void) | null;
  };
  closeConfirm: (ok: boolean) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextValue>({
  isBlocked: false,
  setBlocked: () => {},
  confirmDiscard: async () => true,
  pendingConfirm: { open: false, resolve: null },
  closeConfirm: () => {},
});

export function useNavigationBlocker(): NavigationBlockerContextValue {
  return useContext(NavigationBlockerContext);
}

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const blockedCountRef = useRef(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    open: boolean;
    resolve: ((ok: boolean) => void) | null;
  }>({ open: false, resolve: null });

  const setBlocked = useCallback((blocked: boolean) => {
    blockedCountRef.current = Math.max(
      0,
      blockedCountRef.current + (blocked ? 1 : -1)
    );
    setIsBlocked(blockedCountRef.current > 0);
  }, []);

  const confirmDiscard = useCallback((): Promise<boolean> => {
    if (blockedCountRef.current === 0) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ open: true, resolve });
    });
  }, []);

  const closeConfirm = useCallback((ok: boolean) => {
    setPendingConfirm((prev) => {
      prev.resolve?.(ok);
      return { open: false, resolve: null };
    });
  }, []);

  const value = useMemo(
    () => ({
      isBlocked,
      setBlocked,
      confirmDiscard,
      pendingConfirm,
      closeConfirm,
    }),
    [isBlocked, setBlocked, confirmDiscard, pendingConfirm, closeConfirm]
  );

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}
