"use client";

/*
 * User avatar with automatic fallback to an initial-in-circle.
 *
 * Google profile pictures (the most common avatarUrl source) fail to load
 * when the browser sends a Referer header they don't like — hence the
 * `referrerPolicy="no-referrer"` below. If the image still fails for any
 * other reason (URL expired, user hosted an image that later 404'd, network
 * error), onError flips to the initial fallback so we never render a
 * broken-image icon.
 */

import { useState } from "react";

interface Props {
  avatarUrl: string | null;
  firstName: string;
  /** Tailwind size classes, e.g. "w-16 h-16". */
  sizeClass: string;
  /** Font size for the initial fallback, e.g. "text-2xl". */
  initialTextClass?: string;
}

export function Avatar({
  avatarUrl,
  firstName,
  sizeClass,
  initialTextClass = "text-2xl",
}: Props) {
  const [failed, setFailed] = useState(false);
  const initial = firstName.charAt(0).toUpperCase() || "?";

  if (!avatarUrl || failed) {
    return (
      <span
        className={
          `${sizeClass} rounded-full bg-black text-white ${initialTextClass} font-semibold flex items-center justify-center shrink-0`
        }
      >
        {initial}
      </span>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0`}
    />
  );
}
