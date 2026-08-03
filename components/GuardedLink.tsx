"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

type Props = ComponentProps<typeof Link>;

export function GuardedLink(props: Props) {
  const { confirmDiscard } = useNavigationBlocker();
  const { onNavigate, ...rest } = props;

  return (
    <Link
      {...rest}
      onNavigate={async (e) => {
        const ok = await confirmDiscard();
        if (!ok) {
          e.preventDefault();
          return;
        }
        onNavigate?.(e);
      }}
    />
  );
}

export default GuardedLink;
