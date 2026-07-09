export function getAuditPlatform(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent || "";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (standalone) return "pwa";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios-safari";
  if (/Android/i.test(ua)) return "android-chrome";
  return "web";
}
