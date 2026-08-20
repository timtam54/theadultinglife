"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RequiredPill({
  subcategoryId,
  initialRequired,
}: {
  subcategoryId: string;
  initialRequired: boolean;
}) {
  const router = useRouter();
  const [required, setRequired] = useState(initialRequired);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState(false);

  function toggle(e: React.MouseEvent) {
    // Card wrapper is a plain div now, but the icon buttons + this pill share
    // the same top row — stop propagation so accidental parent handlers don't
    // fire (also stops the browser trying to focus a parent link).
    e.preventDefault();
    e.stopPropagation();
    const next = !required;
    const label = next ? "mark as REQUIRED" : "mark as OPTIONAL";
    if (!confirm(`${label}?\n\n${subcategoryId}`)) return;
    setRequired(next);
    setError(false);
    startSaving(async () => {
      const res = await fetch(
        `/api/admin/subcategories/${encodeURIComponent(subcategoryId)}/priority`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isPriority: next }),
        }
      );
      if (!res.ok) {
        setRequired(!next); // rollback
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={
        required
          ? "Required — click to make optional"
          : "Optional — click to mark as required"
      }
      className={
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full ring-1 transition disabled:opacity-60 " +
        (required
          ? "bg-red-100 text-red-800 ring-red-200 hover:bg-red-200"
          : "bg-white text-tal-plum-soft ring-tal-line hover:bg-tal-cream-soft")
      }
    >
      {required ? "★ Required" : "Optional"}
      {error && <span className="ml-1 text-red-700">!</span>}
    </button>
  );
}
