import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createVehicleLogbookTrip, getVehicleLogbook } from "@/lib/db/vehicle-logbook";
import { handleError } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

// POST — add a trip row to a logbook, with its start odometer pre-filled.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const logbook = await getVehicleLogbook(id);
    if (!logbook || logbook.family_group_id !== session.user.familyGroupId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const trip = await createVehicleLogbookTrip(logbook);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (e) {
    return handleError("api:vehicle-logbook.trips.POST", e);
  }
}
