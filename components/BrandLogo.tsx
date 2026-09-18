/*
 * The Adulting Life brand mark — the square PWA icon (the same one a
 * user sees on their phone home screen after installing) rendered at
 * whatever size the parent asks for.
 */

import Image from "next/image";

interface Props {
  /** Tailwind class controlling the icon's size. */
  iconClassName?: string;
  /** Extra classes for the wrapping container. */
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  iconClassName = "h-10 w-10",
  className = "",
  priority = false,
}: Props) {
  return (
    <div className={"flex items-center " + className}>
      <Image
        src="/icons-pwa/icon-192.png"
        alt="The Adulting Life"
        width={192}
        height={192}
        priority={priority}
        className={"rounded-xl " + iconClassName}
      />
    </div>
  );
}
