import { ListSkeleton } from "@/components/RouteSkeleton";

export default function FilesLoading() {
  return (
    <div>
      <div className="h-8 w-40 bg-tal-cream-soft rounded mb-6 animate-pulse" />
      <ListSkeleton rows={6} />
    </div>
  );
}
