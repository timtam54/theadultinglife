"use client";

import { usePathname } from "next/navigation";
import { useAudit } from "@/hooks/useAudit";

export function AuditPath() {
  const pathname = usePathname();
  useAudit(pathname || "unknown");
  return null;
}
