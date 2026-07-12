import { ListSkeleton } from "@/components/RouteSkeleton";

export default function RecordsLoading() {
  return (
    <div>
      <div className="h-8 w-40 bg-tal-cream-soft rounded mb-6 animate-pulse" />
      <ListSkeleton rows={8} />
    </div>
  );
}
