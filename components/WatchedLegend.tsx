interface Props {
  className?: string;
}

export function WatchedLegend({ className }: Props) {
  return (
    <div
      className={
        "rounded-xl border border-tal-line bg-white px-4 py-3 flex flex-wrap items-center gap-4 text-sm text-tal-plum " +
        (className ?? "")
      }
    >
      <span className="font-medium text-tal-plum-soft text-xs uppercase tracking-wider">
        Key
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <span className="inline-block w-2 h-2 rounded-full bg-white" aria-hidden />
          Unseen
        </span>
        <span className="text-tal-plum-soft">You haven&apos;t watched this yet</span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m5 12 5 5L20 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Watched
        </span>
        <span className="text-tal-plum-soft">
          Played to the end, or you&apos;ve marked it watched
        </span>
      </span>
    </div>
  );
}
