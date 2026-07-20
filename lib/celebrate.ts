// Fires a celebration event that <CelebrationLayer /> listens for.
// Safe to call from any client component — no-ops on the server.

export interface CelebrateBadge {
  id: string;
  label: string;
  description: string;
  tone: string;
  icon: string;
}

export function celebrate(badges: CelebrateBadge[]): void {
  if (typeof window === "undefined") return;
  if (!badges || badges.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<CelebrateBadge[]>("tal:celebrate", { detail: badges })
  );
}
