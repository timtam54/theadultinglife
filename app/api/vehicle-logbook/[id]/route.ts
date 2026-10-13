import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { LOGBOOK_COST_FIELDS } from "@/lib/vehicle-logbook";
import {
  deleteVehicleLogbook,
  getVehicleLogbook,
  updateVehicleLogbook,
  type VehicleLogbookPatch,
} from "@/lib/db/vehicle-logbook";
import { handleError, parseDate } from "@/lib/services/life-goals-api";

type Ctx = { params: Promise<{ id: string }> };

const DATE_FIELDS = ["logbook_start", "logbook_end", "annual_start", "annual_end"] as const;
const ODO_FIELDS = ["odo_start", "odo_end", "annual_odo_start", "annual_odo_end"] as const;
const BOOL_FIELDS = ["reflects_usual", "all_trips_recorded"] as const;

const isOdometer = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9_999_999;
const isMoney = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 9_999_999;

async function owned(id: string, familyGroupId: string) {
  const logbook = await getVehicleLogbook(id);
  return logbook && logbook.family_group_id === familyGroupId ? logbook : null;
}

// PATCH — update the logbook's setup, confirmations or costs. Body keys are
// the column names; only the fields sent are changed, and null clears one.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!(await owned(id, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: VehicleLogbookPatch = {};
    for (const f of DATE_FIELDS) {
      if (body[f] === undefined) continue;
      const v = parseDate(body[f]);
      if (v === undefined) return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      patch[f] = v;
    }
    for (const f of ODO_FIELDS) {
      if (body[f] === undefined) continue;
      if (body[f] !== null && !isOdometer(body[f])) {
        return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      }
      patch[f] = body[f] as number | null;
    }
    for (const f of BOOL_FIELDS) {
      if (body[f] === undefined) continue;
      if (body[f] !== null && typeof body[f] !== "boolean") {
        return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      }
      patch[f] = body[f] as boolean | null;
    }
    for (const f of LOGBOOK_COST_FIELDS) {
      if (body[f] === undefined) continue;
      if (body[f] !== null && !isMoney(body[f])) {
        return NextResponse.json({ error: `bad_${f}` }, { status: 400 });
      }
      patch[f] = body[f] as number | null;
    }
    await updateVehicleLogbook(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:vehicle-logbook.PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!(await owned(id, session.user.familyGroupId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteVehicleLogbook(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError("api:vehicle-logbook.DELETE", e);
  }
}
