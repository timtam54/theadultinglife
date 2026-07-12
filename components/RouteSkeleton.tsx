export function RouteSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-56 bg-tal-cream-soft rounded mb-6" />
      <div className="space-y-3">
        <div className="h-14 rounded-xl bg-tal-cream-soft" />
        <div className="h-14 rounded-xl bg-tal-cream-soft" />
        <div className="h-14 rounded-xl bg-tal-cream-soft" />
        <div className="h-14 rounded-xl bg-tal-cream-soft" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-2 animate-pulse" aria-busy="true" aria-live="polite">
      <li className="sr-only">Loading…</li>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="h-12 rounded-xl bg-tal-cream-soft" />
      ))}
    </ul>
  );
}
