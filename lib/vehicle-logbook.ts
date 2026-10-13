/*
 * Vehicle logbook calculations — everything Donna's template works out
 * automatically. Pure functions, safe to import from client or server.
 */

import type {
  VehicleLogbookTripRow,
  VehicleLogbookWithTrips,
} from "@/lib/db/vehicle-logbook";

// Declared here rather than in lib/db so client components can import the
// list without pulling the server-only Supabase client into the bundle.
export const LOGBOOK_COST_FIELDS = [
  "cost_fuel_oil",
  "cost_rego_ctp",
  "cost_insurance",
  "cost_servicing",
  "cost_loan_interest",
  "cost_lease",
  "cost_depreciation",
] as const;
export type LogbookCostField = (typeof LOGBOOK_COST_FIELDS)[number];

/** A valid logbook covers a continuous period of at least 12 weeks. */
export const MIN_LOGBOOK_DAYS = 84;

export const COST_LABELS: Record<LogbookCostField, string> = {
  cost_fuel_oil: "Fuel and oil",
  cost_rego_ctp: "Registration and CTP",
  cost_insurance: "Car insurance",
  cost_servicing: "Servicing, repairs and tyres",
  cost_loan_interest: "Car loan interest (not repayments)",
  cost_lease: "Lease payments (if applicable)",
  cost_depreciation: "Annual depreciation — accountant confirmed",
};

const DAY_MS = 86_400_000;
const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

/** Odometer difference, or null when either reading is missing or it goes backwards. */
function kmBetween(start: number | null, end: number | null): number | null {
  if (start == null || end == null || end < start) return null;
  return end - start;
}

export function tripKm(trip: VehicleLogbookTripRow): number | null {
  return kmBetween(trip.odo_start, trip.odo_end);
}

export function workKm(trip: VehicleLogbookTripRow): number | null {
  const km = tripKm(trip);
  if (km == null) return null;
  return trip.trip_type === "work" ? km : 0;
}

/** A row nobody has typed anything into yet — not worth warning about. */
function isBlank(trip: VehicleLogbookTripRow): boolean {
  return (
    !trip.start_date &&
    !trip.end_date &&
    !trip.from_to &&
    !trip.reason &&
    trip.odo_end == null
  );
}

/** Problems with one trip row; empty means the entry is OK. */
export function tripIssues(
  trip: VehicleLogbookTripRow,
  logbook: VehicleLogbookWithTrips
): string[] {
  if (isBlank(trip)) return [];
  const issues: string[] = [];
  if (!trip.start_date) issues.push("Add a start date");
  if (trip.start_date && trip.end_date && trip.end_date < trip.start_date) {
    issues.push("End date is before the start date");
  }
  if (!trip.trip_type) issues.push("Choose work or private");
  if (trip.odo_start == null || trip.odo_end == null) {
    issues.push("Add both odometer readings");
  } else if (trip.odo_end < trip.odo_start) {
    issues.push("End odometer is lower than the start");
  }
  if (trip.trip_type === "work") {
    if (!trip.from_to) issues.push("Add where you travelled from and to");
    if (!trip.reason) issues.push("Add the reason for the trip");
  }
  if (
    trip.start_date &&
    ((logbook.logbook_start && trip.start_date < logbook.logbook_start) ||
      (logbook.logbook_end && (trip.end_date ?? trip.start_date) > logbook.logbook_end))
  ) {
    issues.push("Outside the logbook dates");
  }
  if (
    trip.start_date &&
    trip.odo_start != null &&
    trip.odo_end != null &&
    logbook.trips.some(
      (o) =>
        o.id !== trip.id &&
        o.start_date === trip.start_date &&
        o.odo_start === trip.odo_start &&
        o.odo_end === trip.odo_end
    )
  ) {
    issues.push("Looks like a duplicate of another trip");
  }
  return issues;
}

export interface LogbookSummary {
  daysRecorded: number | null;
  totalKm: number | null;
  workKm: number;
  privateKm: number | null;
  /** 0–100, or null until the logbook qualifies (see workUseBlockers). */
  workUsePct: number | null;
  /** Why the work-use percentage isn't showing yet; empty when it is. */
  workUseBlockers: string[];
  annualKm: number | null;
  tripsNeedingAttention: number;
  totalCosts: number | null;
  estimatedDeduction: number | null;
}

export function summariseLogbook(logbook: VehicleLogbookWithTrips): LogbookSummary {
  const daysRecorded =
    logbook.logbook_start && logbook.logbook_end && logbook.logbook_end >= logbook.logbook_start
      ? dayNumber(logbook.logbook_end) - dayNumber(logbook.logbook_start) + 1
      : null;
  const totalKm = kmBetween(logbook.odo_start, logbook.odo_end);
  const work = logbook.trips.reduce((sum, t) => sum + (workKm(t) ?? 0), 0);
  const privateKm = totalKm == null ? null : Math.max(totalKm - work, 0);

  const workUseBlockers: string[] = [];
  if (daysRecorded == null) workUseBlockers.push("Enter the logbook start and end dates");
  else if (daysRecorded < MIN_LOGBOOK_DAYS) {
    workUseBlockers.push(
      `Record at least ${MIN_LOGBOOK_DAYS} days (${daysRecorded} so far)`
    );
  }
  if (totalKm == null) workUseBlockers.push("Enter the odometer readings at logbook start and end");
  else if (totalKm === 0) workUseBlockers.push("The odometer readings show no kilometres travelled");
  else if (work > totalKm) {
    workUseBlockers.push("Work kilometres are more than the total — check the odometer readings");
  }
  if (logbook.reflects_usual !== true) {
    workUseBlockers.push("Confirm this reflects your usual work travel");
  }
  if (logbook.all_trips_recorded !== true) {
    workUseBlockers.push("Confirm you have recorded all your work trips");
  }
  const workUsePct =
    workUseBlockers.length === 0 && totalKm ? (work / totalKm) * 100 : null;

  const entered = LOGBOOK_COST_FIELDS
    .map((f) => logbook[f])
    .filter((v): v is number => v != null);
  const totalCosts = entered.length ? entered.reduce((a, b) => a + Number(b), 0) : null;

  return {
    daysRecorded,
    totalKm,
    workKm: work,
    privateKm,
    workUsePct,
    workUseBlockers,
    annualKm: kmBetween(logbook.annual_odo_start, logbook.annual_odo_end),
    tripsNeedingAttention: logbook.trips.filter((t) => tripIssues(t, logbook).length > 0).length,
    totalCosts,
    estimatedDeduction:
      totalCosts != null && workUsePct != null ? (totalCosts * workUsePct) / 100 : null,
  };
}
