import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { listFamilyMapLocations } from "@/lib/services/map-locations";
import { MapsClient } from "./MapsClient";

export const metadata: Metadata = {
  title: "Maps",
  description:
    "Every address stored across your family's Adulting Life records, plotted on one map.",
};

export default async function MapsPage() {
  const session = await requireSession();
  const locations = await listFamilyMapLocations(session.user.familyGroupId);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_API ?? null;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <span className="text-tal-plum-soft">Maps</span>
      </div>

      <div className="rounded-2xl bg-tal-plum text-white px-5 py-4 mb-4 shadow-md">
        <h1 className="font-display text-2xl leading-tight">Maps</h1>
        <p className="text-white/80 text-sm mt-1">
          Every address saved across your family's records, plotted on a single
          map.{" "}
          {locations.length > 0 && (
            <>
              Showing <span className="font-medium">{locations.length}</span>{" "}
              location{locations.length === 1 ? "" : "s"}.
            </>
          )}
        </p>
      </div>

      <MapsClient locations={locations} apiKey={apiKey} />
    </div>
  );
}
