import { createServiceClient } from "@/lib/supabase/server";
import type { LogbookCostField } from "@/lib/vehicle-logbook";

export interface VehicleLogbookTripRow {
  id: string;
  logbook_id: string;
  start_date: string | null;
  end_date: string | null;
  from_to: string | null;
  reason: string | null;
  trip_type: "work" | "private" | null;
  odo_start: number | null;
  odo_end: number | null;
  recorded_on: string;
}


export interface VehicleLogbookRow extends Record<LogbookCostField, number | null> {
  id: string;
  user_id: string;
  family_group_id: string;
  vehicle_instance_id: string;
  vehicle_label: string;
  tax_year: number;
  logbook_start: string | null;
  logbook_end: string | null;
  odo_start: number | null;
  odo_end: number | null;
  reflects_usual: boolean | null;
  all_trips_recorded: boolean | null;
  annual_start: string | null;
  annual_end: string | null;
  annual_odo_start: number | null;
  annual_odo_end: number | null;
}

export interface VehicleLogbookWithTrips extends VehicleLogbookRow {
  trips: VehicleLogbookTripRow[];
}

const TRIP_COLS =
  "id, logbook_id, start_date, end_date, from_to, reason, trip_type, odo_start, odo_end, recorded_on";

export async function listVehicleLogbooks(
  userId: string
): Promise<VehicleLogbookWithTrips[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("vehicle_logbooks")
    .select("*")
    .eq("user_id", userId)
    .order("tax_year", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data as VehicleLogbookRow[] | null) ?? [];
  if (rows.length === 0) return [];
  const { data: trips, error: tErr } = await supabase
    .from("vehicle_logbook_trips")
    .select(TRIP_COLS)
    .in("logbook_id", rows.map((r) => r.id))
    .order("created_at", { ascending: true });
  if (tErr) throw tErr;
  const byLogbook = new Map<string, VehicleLogbookTripRow[]>();
  for (const t of (trips as VehicleLogbookTripRow[] | null) ?? []) {
    const list = byLogbook.get(t.logbook_id) ?? [];
    list.push(t);
    byLogbook.set(t.logbook_id, list);
  }
  return rows.map((r) => ({ ...r, trips: byLogbook.get(r.id) ?? [] }));
}

export async function getVehicleLogbook(id: string): Promise<VehicleLogbookRow | null> {
  const { data, error } = await createServiceClient()
    .from("vehicle_logbooks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as VehicleLogbookRow | null) ?? null;
}

/** Returns null when this person already has a logbook for that vehicle and year. */
export async function createVehicleLogbook(input: {
  userId: string;
  familyGroupId: string;
  vehicleInstanceId: string;
  vehicleLabel: string;
  taxYear: number;
}): Promise<VehicleLogbookWithTrips | null> {
  const { data, error } = await createServiceClient()
    .from("vehicle_logbooks")
    .insert({
      user_id: input.userId,
      family_group_id: input.familyGroupId,
      vehicle_instance_id: input.vehicleInstanceId,
      vehicle_label: input.vehicleLabel,
      tax_year: input.taxYear,
      // The annual record usually runs 1 July – 30 June.
      annual_start: `${input.taxYear}-07-01`,
      annual_end: `${input.taxYear + 1}-06-30`,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return null; // unique (user, vehicle, tax year)
    throw error;
  }
  return { ...(data as VehicleLogbookRow), trips: [] };
}

export type VehicleLogbookPatch = Partial<
  Omit<
    VehicleLogbookRow,
    "id" | "user_id" | "family_group_id" | "vehicle_instance_id" | "vehicle_label" | "tax_year"
  >
>;

export async function updateVehicleLogbook(
  id: string,
  patch: VehicleLogbookPatch
): Promise<void> {
  const { error } = await createServiceClient()
    .from("vehicle_logbooks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVehicleLogbook(id: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("vehicle_logbooks")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getVehicleLogbookTrip(
  id: string
): Promise<VehicleLogbookTripRow | null> {
  const { data, error } = await createServiceClient()
    .from("vehicle_logbook_trips")
    .select(TRIP_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as VehicleLogbookTripRow | null) ?? null;
}

/**
 * Adds a trip row. Its start odometer is pre-filled from the highest end
 * odometer already recorded (or the logbook's opening reading), since the
 * next trip normally starts where the last one finished.
 */
export async function createVehicleLogbookTrip(
  logbook: VehicleLogbookRow
): Promise<VehicleLogbookTripRow> {
  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from("vehicle_logbook_trips")
    .select("odo_end")
    .eq("logbook_id", logbook.id)
    .not("odo_end", "is", null)
    .order("odo_end", { ascending: false })
    .limit(1);
  const odoStart =
    (last as { odo_end: number }[] | null)?.[0]?.odo_end ?? logbook.odo_start ?? null;
  const { data, error } = await supabase
    .from("vehicle_logbook_trips")
    .insert({ logbook_id: logbook.id, odo_start: odoStart, trip_type: "work" })
    .select(TRIP_COLS)
    .single();
  if (error) throw error;
  return data as VehicleLogbookTripRow;
}

export type VehicleLogbookTripPatch = Partial<
  Omit<VehicleLogbookTripRow, "id" | "logbook_id" | "recorded_on">
>;

export async function updateVehicleLogbookTrip(
  id: string,
  patch: VehicleLogbookTripPatch
): Promise<void> {
  const { error } = await createServiceClient()
    .from("vehicle_logbook_trips")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVehicleLogbookTrip(id: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("vehicle_logbook_trips")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
