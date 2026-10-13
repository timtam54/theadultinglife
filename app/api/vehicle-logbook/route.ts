import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createVehicleLogbook, listVehicleLogbooks } from "@/lib/db/vehicle-logbook";
import { canAccessUser, handleError } from "@/lib/services/life-goals-api";

// GET — one family member's vehicle logbooks, each with its trips.
// Query: ?userId=…
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = request.nextUrl.searchParams.get("userId") ?? session.user.id;
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ logbooks: await listVehicleLogbooks(userId) });
  } catch (e) {
    return handleError("api:vehicle-logbook.GET", e);
  }
}

// POST — start a logbook for a vehicle and tax year.
// Body: { userId, vehicleInstanceId, vehicleLabel, taxYear }
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : session.user.id;
    const { vehicleInstanceId, vehicleLabel, taxYear } = body;
    if (typeof vehicleInstanceId !== "string" || !vehicleInstanceId) {
      return NextResponse.json({ error: "vehicle_required" }, { status: 400 });
    }
    if (
      typeof taxYear !== "number" ||
      !Number.isInteger(taxYear) ||
      taxYear < 2000 ||
      taxYear > 2100
    ) {
      return NextResponse.json({ error: "bad_tax_year" }, { status: 400 });
    }
    if (!(await canAccessUser(userId, session.user.familyGroupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const logbook = await createVehicleLogbook({
      userId,
      familyGroupId: session.user.familyGroupId,
      vehicleInstanceId,
      vehicleLabel:
        typeof vehicleLabel === "string" && vehicleLabel.trim()
          ? vehicleLabel.trim().slice(0, 200)
          : "Vehicle",
      taxYear,
    });
    if (!logbook) {
      return NextResponse.json({ error: "already_exists" }, { status: 409 });
    }
    return NextResponse.json({ logbook }, { status: 201 });
  } catch (e) {
    return handleError("api:vehicle-logbook.POST", e);
  }
}
