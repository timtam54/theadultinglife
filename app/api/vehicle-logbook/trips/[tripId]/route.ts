import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  deleteVehicleLogbookTrip,
  getVehicleLogbook,
  getVehicleLogbookTrip,
  updateVehicleLogbookTrip,
  type VehicleLogbookTripPatch,
} from "@/lib/db/vehicle-logbook";
import { handleError, parseDate, parseText } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ tripId: string }> };

async function ownedTrip(tripId: string, familyGroupId: string) {
  const trip = await getVehicleLogbookTrip(tripId);
  if (!trip) return null;
  const logbook = await getVehicleLogbook(trip.logbook_id);
  return logbook && logbook.family_group_id === familyGroupId ? trip : null;
}

// PATCH — update one trip. Body keys are the column names; only the fields
// sent are changed, and null clears one.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { tripId } = await ctx.params;
    if (!(await ownedTrip(tripId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: VehicleLogbookTripPatch = {};
    for (const f of ["start_date", "end_date"] as const) {
      if (body[f] === undefined) continue;
      const v = parseDate(body[f]);
      if (v === undefined) return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      patch[f] = v;
    }
    for (const f of ["from_to", "reason"] as const) {
      if (body[f] === undefined) continue;
      const v = parseText(body[f]);
      if (v === undefined) return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      patch[f] = v;
    }
    if (body.trip_type !== undefined) {
      if (body.trip_type !== "work" && body.trip_type !== "private") {
        return NextResponse.json({ error: "bad_trip_type" }, { status: 400 });
      }
      patch.trip_type = body.trip_type;
    }
    for (const f of ["odo_start", "odo_end"] as const) {
      if (body[f] === undefined) continue;
      const v = body[f];
      if (
        v !== null &&
        !(typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9_999_999)
      ) {
        return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      }
      patch[f] = v as number | null;
    }
    await updateVehicleLogbookTrip(tripId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:vehicle-logbook.trip.PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { tripId } = await ctx.params;
    if (!(await ownedTrip(tripId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteVehicleLogbookTrip(tripId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:vehicle-logbook.trip.DELETE", e);
  }
}
