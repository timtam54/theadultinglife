"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

type Props = ComponentProps<typeof Link>;

// Wraps next/link so that when unsaved changes exist (see
// useUnsavedChangesGuard) the user gets a confirm dialog BEFORE the
// navigation happens. Intercepts the click, prevents the browser's
// default follow, awaits the dialog, then routes manually.
//
// In Next 16 `Link.onNavigate` fires after the route has already been
// committed, so it can't block — we have to catch it on the DOM click
// event and call router.push ourselves.
export function GuardedLink(props: Props) {
  const { confirmDiscard, isBlocked } = useNavigationBlocker();
  const router = useRouter();
  const { onClick, href, replace, scroll, ...rest } = props;

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Only intercept plain-left-click (let cmd/ctrl/middle-click open in a
    // new tab, and only bother when nothing is blocked).
    if (!isBlocked) return;
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    const ok = await confirmDiscard();
    if (!ok) return;
    const url = typeof href === "string" ? href : href?.toString() ?? "";
    if (!url) return;
    if (replace) router.replace(url, { scroll });
    else router.push(url, { scroll });
  }

  return <Link {...rest} href={href} replace={replace} scroll={scroll} onClick={handleClick} />;
}

export default GuardedLink;
