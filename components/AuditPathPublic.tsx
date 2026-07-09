"use client";

import { usePathname } from "next/navigation";
import { usePublicAudit } from "@/hooks/usePublicAudit";

export function AuditPathPublic() {
  const pathname = usePathname();
  usePublicAudit(pathname || "unknown");
  return null;
}
