import Link from "next/link";

export function FolderRow({
  index,
  href,
  name,
  hint,
  count,
}: {
  index: number;
  href: string;
  name: string;
  hint?: string | null;
  count?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3 hover:bg-tal-cream-soft transition"
      >
        <span className="w-6 text-right text-sm text-tal-plum-soft tabular-nums">
          {index}.
        </span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
            fill="#e6c48a"
            stroke="#b08a4e"
            strokeWidth="1"
          />
        </svg>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-tal-plum truncate">{name}</span>
          {hint && (
            <span className="block text-xs italic text-tal-plum-soft truncate">
              {hint}
            </span>
          )}
        </span>
        {typeof count === "number" && count > 0 && (
          <span className="text-xs text-tal-plum-soft tabular-nums">
            {count}
          </span>
        )}
        <span className="text-tal-plum-soft" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}
