"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useEffect, useState } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import type {
  VehicleLogbookPatch,
  VehicleLogbookTripPatch,
  VehicleLogbookTripRow,
  VehicleLogbookWithTrips,
} from "@/lib/db/vehicle-logbook";
import {
  COST_LABELS,
  LOGBOOK_COST_FIELDS,
  MIN_LOGBOOK_DAYS,
  summariseLogbook,
  tripIssues,
  tripKm,
  workKm,
} from "@/lib/vehicle-logbook";

/*
 * Vehicle logbook for personal.vehicle_logbook, per Donna's simplified
 * template: pick a vehicle and tax year, fill in the logbook setup and the
 * "My trips" table, and the summary and estimated deduction are worked out.
 * Every field saves when you leave it.
 */

const VEHICLES_URL =
  "/api/linked-entries/personal.vehicle_details?labelFields=pom.vehicle.make_model,pom.vehicle.rego";
const VEHICLE_DETAILS_HREF = "/records/personal/personal.vehicle_details";

interface Vehicle {
  instance_id: string;
  label: string;
}

const km = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("en-AU")} km`);
const money = (n: number | null) =>
  n == null
    ? "—"
    : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const taxYearLabel = (y: number) => `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
/** Tax years start in July, so Jan–Jun belongs to the year before. */
const currentTaxYear = () => {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
};

export function VehicleLogbook({ userId }: { userId: string }) {
  const [logbooks, setLogbooks] = useState<VehicleLogbookWithTrips[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = encodeURIComponent(userId);
        const [lRes, vRes] = await Promise.all([
          fetch(`/api/vehicle-logbook?userId=${u}`),
          fetch(`${VEHICLES_URL}&targetUserId=${u}`),
        ]);
        if (!lRes.ok || !vRes.ok) throw new Error("load_failed");
        const { logbooks: l } = (await lRes.json()) as { logbooks: VehicleLogbookWithTrips[] };
        const { entries } = (await vRes.json()) as { entries: Vehicle[] };
        if (cancelled) return;
        setLogbooks(l);
        setVehicles(entries);
        setFailed(false);
        setLoaded(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  async function send(url: string, method: string, body?: unknown): Promise<Response | null> {
    setStatus("Saving…");
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok && res.status !== 409) throw new Error("save_failed");
      setStatus(res.ok ? "Saved" : null);
      return res;
    } catch {
      setStatus("Couldn’t save — check your connection and try again.");
      return null;
    }
  }

  function saveLogbook(id: string, patch: VehicleLogbookPatch) {
    setLogbooks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    void send(`/api/vehicle-logbook/${id}`, "PATCH", patch);
  }

  function saveTrip(logbookId: string, tripId: string, patch: VehicleLogbookTripPatch) {
    setLogbooks((ls) =>
      ls.map((l) =>
        l.id === logbookId
          ? { ...l, trips: l.trips.map((t) => (t.id === tripId ? { ...t, ...patch } : t)) }
          : l
      )
    );
    void send(`/api/vehicle-logbook/trips/${tripId}`, "PATCH", patch);
  }

  async function addTrip(logbookId: string) {
    const res = await send(`/api/vehicle-logbook/${logbookId}/trips`, "POST");
    if (!res) return;
    const { trip } = (await res.json()) as { trip: VehicleLogbookTripRow };
    setLogbooks((ls) =>
      ls.map((l) => (l.id === logbookId ? { ...l, trips: [...l.trips, trip] } : l))
    );
  }

  async function removeTrip(logbookId: string, tripId: string) {
    if (!(await send(`/api/vehicle-logbook/trips/${tripId}`, "DELETE"))) return;
    setLogbooks((ls) =>
      ls.map((l) =>
        l.id === logbookId ? { ...l, trips: l.trips.filter((t) => t.id !== tripId) } : l
      )
    );
  }

  async function createLogbook(vehicle: Vehicle, taxYear: number): Promise<string | null> {
    const res = await send("/api/vehicle-logbook", "POST", {
      userId,
      vehicleInstanceId: vehicle.instance_id,
      vehicleLabel: vehicle.label,
      taxYear,
    });
    if (!res) return "Couldn’t start the logbook — try again.";
    if (res.status === 409) {
      return `You already have a ${taxYearLabel(taxYear)} logbook for that vehicle.`;
    }
    const { logbook } = (await res.json()) as { logbook: VehicleLogbookWithTrips };
    setLogbooks((ls) => [logbook, ...ls]);
    setSelectedId(logbook.id);
    setCreating(false);
    return null;
  }

  async function removeLogbook(id: string) {
    if (!(await send(`/api/vehicle-logbook/${id}`, "DELETE"))) return;
    setLogbooks((ls) => ls.filter((l) => l.id !== id));
    setSelectedId(null);
  }

  if (failed) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
        Couldn&apos;t load the vehicle logbook.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => {
            setFailed(false);
            setReloadKey((k) => k + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }
  if (!loaded) {
    return <p className="text-sm text-tal-plum-soft">Loading vehicle logbook…</p>;
  }

  const selected = logbooks.find((l) => l.id === selectedId) ?? logbooks[0] ?? null;
  const showCreate = creating || !selected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {selected && (
          <label className="flex items-center gap-2 text-sm text-tal-plum">
            Logbook
            <select
              value={selected.id}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setCreating(false);
              }}
              className="h-10 max-w-xs rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
            >
              {logbooks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.vehicle_label} · {taxYearLabel(l.tax_year)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-tal-plum-soft" aria-live="polite">
            {status}
          </span>
          {selected && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="h-10 px-4 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft"
            >
              + New logbook
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <NewLogbookForm
          vehicles={vehicles}
          onCreate={createLogbook}
          onCancel={selected ? () => setCreating(false) : undefined}
        />
      )}

      {selected && !creating && (
        <LogbookView
          // Re-seed every field's draft when switching logbooks.
          key={selected.id}
          logbook={selected}
          onSave={(patch) => saveLogbook(selected.id, patch)}
          onSaveTrip={(tripId, patch) => saveTrip(selected.id, tripId, patch)}
          onAddTrip={() => addTrip(selected.id)}
          onRemoveTrip={(tripId) => removeTrip(selected.id, tripId)}
          onRemove={() => removeLogbook(selected.id)}
        />
      )}
    </div>
  );
}

function NewLogbookForm({
  vehicles,
  onCreate,
  onCancel,
}: {
  vehicles: Vehicle[];
  onCreate: (vehicle: Vehicle, taxYear: number) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.instance_id ?? "");
  const [taxYear, setTaxYear] = useState(currentTaxYear);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-6">
        <h2 className="font-display text-lg text-tal-plum mb-1">Add a vehicle first</h2>
        <p className="text-sm text-tal-plum-soft">
          A logbook is kept for one vehicle. Add the car to{" "}
          <Link href={VEHICLE_DETAILS_HREF} className="text-tal-plum underline">
            Vehicle Details
          </Link>
          , then come back here to start its logbook.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const vehicle = vehicles.find((v) => v.instance_id === vehicleId);
        if (!vehicle) return;
        setBusy(true);
        setError(await onCreate(vehicle, taxYear));
        setBusy(false);
      }}
      className="rounded-2xl border border-tal-line bg-white p-6"
    >
      <h2 className="font-display text-lg text-tal-plum mb-1">Start a logbook</h2>
      <p className="text-sm text-tal-plum-soft mb-4">
        One logbook per vehicle for each tax year. Record a representative,
        continuous 12-week period.
      </p>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="block text-sm text-tal-plum mb-1.5">Vehicle</span>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
          >
            {vehicles.map((v) => (
              <option key={v.instance_id} value={v.instance_id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-tal-plum mb-1.5">
            Tax year starts in July
          </span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            Start logbook
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </form>
  );
}

function LogbookView({
  logbook,
  onSave,
  onSaveTrip,
  onAddTrip,
  onRemoveTrip,
  onRemove,
}: {
  logbook: VehicleLogbookWithTrips;
  onSave: (patch: VehicleLogbookPatch) => void;
  onSaveTrip: (tripId: string, patch: VehicleLogbookTripPatch) => void;
  onAddTrip: () => void;
  onRemoveTrip: (tripId: string) => void;
  onRemove: () => void;
}) {
  const summary = summariseLogbook(logbook);
  const enoughDays = (summary.daysRecorded ?? 0) >= MIN_LOGBOOK_DAYS;

  return (
    <>
      <Section title="1. My logbook">
        <div className="p-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnly label="Vehicle" value={logbook.vehicle_label} />
          <ReadOnly label="Tax year" value={taxYearLabel(logbook.tax_year)} />
          <DateField
            label="Logbook start date"
            value={logbook.logbook_start}
            onChange={(v) => onSave({ logbook_start: v })}
          />
          <DateField
            label="Logbook end date"
            value={logbook.logbook_end}
            onChange={(v) => onSave({ logbook_end: v })}
          />
          <NumberField
            label="Odometer at logbook start (km)"
            value={logbook.odo_start}
            onCommit={(v) => onSave({ odo_start: v })}
          />
          <NumberField
            label="Odometer at logbook end (km)"
            value={logbook.odo_end}
            onCommit={(v) => onSave({ odo_end: v })}
          />
          <YesNo
            label="Does this reflect my usual work travel?"
            value={logbook.reflects_usual}
            onChange={(v) => onSave({ reflects_usual: v })}
          />
          <YesNo
            label="Have I recorded all my work trips?"
            value={logbook.all_trips_recorded}
            onChange={(v) => onSave({ all_trips_recorded: v })}
          />
        </div>
        <div className="border-t border-tal-line p-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateField
            label="Annual record start date (usually 1 July)"
            value={logbook.annual_start}
            onChange={(v) => onSave({ annual_start: v })}
          />
          <DateField
            label="Annual record end date (usually 30 June)"
            value={logbook.annual_end}
            onChange={(v) => onSave({ annual_end: v })}
          />
          <NumberField
            label="Odometer at annual start (km)"
            value={logbook.annual_odo_start}
            onCommit={(v) => onSave({ annual_odo_start: v })}
          />
          <NumberField
            label="Odometer at annual end (km)"
            value={logbook.annual_odo_end}
            onCommit={(v) => onSave({ annual_odo_end: v })}
          />
        </div>
        <Notes
          items={[
            "Record a representative continuous 12-week period. Total km includes ALL driving.",
            "Keep annual odometer records. Review an existing logbook each year; it may last up to 5 income years.",
          ]}
        />
      </Section>

      <Section title="My trips">
        <p className="px-4 pt-3 text-sm text-tal-plum-soft">
          Enter each work trip — one row per journey. Kilometres are calculated
          for you. Example reason: Office to client meeting at Smith Farm.
        </p>
        <div className="p-4">
          <div className="hidden xl:grid grid-cols-[8.5rem_8.5rem_minmax(0,1.3fr)_minmax(0,1.6fr)_6.5rem_6.5rem_6.5rem_5rem_5rem_minmax(0,1.2fr)_5.5rem_2rem] gap-2 px-2 pb-2 text-[10px] uppercase tracking-widest text-tal-plum-soft">
            <div>Start date</div>
            <div>End date</div>
            <div>From / to</div>
            <div>Reason for trip</div>
            <div>Work or private</div>
            <div>Start odo (km)</div>
            <div>End odo (km)</div>
            <div>Trip km</div>
            <div>Work km</div>
            <div>Entry check</div>
            <div>Recorded on</div>
            <div />
          </div>
          <ul className="space-y-2">
            {logbook.trips.map((t) => (
              <TripRow
                key={t.id}
                trip={t}
                issues={tripIssues(t, logbook)}
                onSave={(patch) => onSaveTrip(t.id, patch)}
                onRemove={() => onRemoveTrip(t.id)}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={onAddTrip}
            className="mt-3 h-10 px-4 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft"
          >
            + Add trip
          </button>
        </div>
        <Notes
          items={[
            "Work trips: record them promptly. Private trips are optional.",
            "For an ordinary same-day trip, use the same start and end date.",
            "Home to your regular workplace is generally private travel.",
            "Keep work parking and toll receipts separately for your tax agent to review.",
          ]}
        />
      </Section>

      <Section title="2. My automatic summary">
        <dl className="divide-y divide-tal-line">
          <SummaryRow
            label={`Days recorded (minimum ${MIN_LOGBOOK_DAYS})`}
            value={summary.daysRecorded == null ? "—" : String(summary.daysRecorded)}
            tone={summary.daysRecorded == null ? undefined : enoughDays ? "good" : "warn"}
          />
          <SummaryRow label="Total kilometres in logbook period" value={km(summary.totalKm)} />
          <SummaryRow label="Work kilometres in logbook period" value={km(summary.workKm)} />
          <SummaryRow label="Private kilometres in logbook period" value={km(summary.privateKm)} />
          <SummaryRow
            label="My work-use percentage"
            value={summary.workUsePct == null ? "Not ready yet" : `${summary.workUsePct.toFixed(1)}%`}
            tone={summary.workUsePct == null ? undefined : "good"}
            strong
          />
          <SummaryRow label="Annual kilometres travelled" value={km(summary.annualKm)} />
          <SummaryRow
            label="Trip entries needing attention"
            value={String(summary.tripsNeedingAttention)}
            tone={summary.tripsNeedingAttention > 0 ? "warn" : "good"}
          />
        </dl>
        {summary.workUseBlockers.length > 0 && (
          <div className="border-t border-tal-line bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-medium mb-1">
              Your work-use percentage will appear once you:
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {summary.workUseBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Notes
          items={[
            "The percentage appears after 84 days and both Yes confirmations.",
            "Fix trip warnings and check for duplicates before confirming all trips are recorded.",
          ]}
        />
      </Section>

      <Section title="3. Optional: my costs for this tax year">
        <div className="p-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOGBOOK_COST_FIELDS.map((f) => (
            <NumberField
              key={f}
              label={COST_LABELS[f]}
              value={logbook[f]}
              money
              onCommit={(v) => onSave({ [f]: v })}
            />
          ))}
        </div>
        <dl className="border-t border-tal-line divide-y divide-tal-line">
          <SummaryRow label="Total eligible costs entered" value={money(summary.totalCosts)} />
          <SummaryRow
            label="Estimated deduction from entered costs"
            value={
              summary.estimatedDeduction != null
                ? money(summary.estimatedDeduction)
                : summary.totalCosts == null
                  ? "—"
                  : "Needs your work-use percentage"
            }
            strong
          />
        </dl>
        <Notes
          items={[
            "Costs: enter annual totals you paid yourself; exclude reimbursements and refunds.",
            "Keep receipts and statements. Only loan interest goes in here, not loan repayments.",
            "Depreciation: enter the annual amount BEFORE work-use %, confirmed by your accountant.",
            "Blank cost fields are left out. The estimate covers entered costs only; it is not a refund.",
            "This is a record-keeping tool, not tax advice — check the figures with your tax agent.",
          ]}
        />
      </Section>

      <div className="text-right">
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this logbook and all its trips? This can't be undone.")) onRemove();
          }}
          className="text-sm text-red-700 hover:underline"
        >
          Delete this logbook
        </button>
      </div>
    </>
  );
}

function TripRow({
  trip,
  issues,
  onSave,
  onRemove,
}: {
  trip: VehicleLogbookTripRow;
  issues: string[];
  onSave: (patch: VehicleLogbookTripPatch) => void;
  onRemove: () => void;
}) {
  const tKm = tripKm(trip);
  const wKm = workKm(trip);
  return (
    <li
      className={
        "rounded-xl border p-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-[8.5rem_8.5rem_minmax(0,1.3fr)_minmax(0,1.6fr)_6.5rem_6.5rem_6.5rem_5rem_5rem_minmax(0,1.2fr)_5.5rem_2rem] xl:items-start " +
        (issues.length > 0 ? "border-amber-300 bg-amber-50/60" : "border-tal-line bg-tal-cream-soft/40")
      }
    >
      <DateField
        cell
        label="Start date"
        value={trip.start_date}
        // Most trips are same-day, so the end date follows the start date
        // until it's been set separately.
        onChange={(v) =>
          onSave(
            !trip.end_date || trip.end_date === trip.start_date
              ? { start_date: v, end_date: v }
              : { start_date: v }
          )
        }
      />
      <DateField
        cell
        label="End date"
        value={trip.end_date}
        onChange={(v) => onSave({ end_date: v })}
      />
      <TextField
        label="From / to"
        value={trip.from_to}
        onCommit={(v) => onSave({ from_to: v })}
      />
      <TextField
        label="Reason for trip"
        value={trip.reason}
        onCommit={(v) => onSave({ reason: v })}
      />
      <label className="block">
        <CellLabel>Work or private</CellLabel>
        <select
          value={trip.trip_type ?? ""}
          onChange={(e) => {
            if (e.target.value) onSave({ trip_type: e.target.value as "work" | "private" });
          }}
          className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum"
        >
          {!trip.trip_type && <option value="">Choose…</option>}
          <option value="work">Work</option>
          <option value="private">Private</option>
        </select>
      </label>
      <NumberField
        cell
        label="Start odo (km)"
        value={trip.odo_start}
        onCommit={(v) => onSave({ odo_start: v })}
      />
      <NumberField
        cell
        label="End odo (km)"
        value={trip.odo_end}
        onCommit={(v) => onSave({ odo_end: v })}
      />
      <Computed label="Trip km" value={tKm == null ? "—" : tKm.toLocaleString("en-AU")} />
      <Computed label="Work km" value={wKm == null ? "—" : wKm.toLocaleString("en-AU")} />
      <div>
        <CellLabel>Entry check</CellLabel>
        {issues.length === 0 ? (
          <div className="h-9 flex items-center text-sm text-emerald-700">
            {tKm == null ? "—" : "OK"}
          </div>
        ) : (
          <ul className="text-xs text-amber-900 space-y-0.5 py-1">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </div>
      <Computed label="Recorded on" value={format(parseISO(trip.recorded_on), "d MMM yy")} />
      <div className="flex xl:justify-center">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove trip"
          title="Remove trip"
          className="h-9 w-8 rounded-lg text-tal-plum-soft hover:bg-red-50 hover:text-red-700"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <h2 className="px-4 py-2.5 text-sm font-semibold bg-black text-white">{title}</h2>
      {children}
    </section>
  );
}

function Notes({ items }: { items: string[] }) {
  return (
    <ul className="border-t border-tal-line bg-tal-cream-soft/50 px-4 py-3 text-xs text-tal-plum-soft space-y-1">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className={"text-sm text-tal-plum " + (strong ? "font-semibold" : "")}>{label}</dt>
      <dd
        className={
          "text-sm text-right " +
          (strong ? "font-semibold " : "") +
          (tone === "good"
            ? "text-emerald-700"
            : tone === "warn"
              ? "text-amber-700"
              : "text-tal-plum")
        }
      >
        {value}
      </dd>
    </div>
  );
}

/** Trip-row labels sit in the column header at xl, so hide them there. */
function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block xl:hidden text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
      {children}
    </span>
  );
}

function FieldLabel({ cell, children }: { cell?: boolean; children: React.ReactNode }) {
  return cell ? (
    <CellLabel>{children}</CellLabel>
  ) : (
    <span className="block text-sm text-tal-plum mb-1.5">{children}</span>
  );
}

const inputClass = (cell?: boolean) =>
  "w-full border border-tal-line bg-white px-2 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30 " +
  (cell ? "h-9 rounded-lg" : "h-10 rounded-xl px-3");

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-sm text-tal-plum mb-1.5">{label}</span>
      <div className="h-10 flex items-center text-sm font-medium text-tal-plum">{value}</div>
    </div>
  );
}

function Computed({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <CellLabel>{label}</CellLabel>
      <div className="h-9 flex items-center text-sm text-tal-plum">{value}</div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  cell,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  cell?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel cell={cell}>{label}</FieldLabel>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass(cell)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  cell,
  money: isMoney = false,
}: {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  cell?: boolean;
  /** Dollars and cents rather than whole kilometres. */
  money?: boolean;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  return (
    <label className="block">
      <FieldLabel cell={cell}>{label}</FieldLabel>
      <input
        type="number"
        inputMode={isMoney ? "decimal" : "numeric"}
        min={0}
        step={isMoney ? "0.01" : "1"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = draft.trim() === "" ? null : Number(draft);
          const clean =
            n == null || !Number.isFinite(n) || n < 0
              ? null
              : isMoney
                ? Math.round(n * 100) / 100
                : Math.round(n);
          setDraft(clean == null ? "" : String(clean));
          if (clean !== value) onCommit(clean);
        }}
        className={inputClass(cell)}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <label className="block">
      <CellLabel>{label}</CellLabel>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const clean = draft.trim() || null;
          if (clean !== value) onCommit(clean);
        }}
        className={inputClass(true)}
      />
    </label>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-tal-plum mb-1.5">{label}</span>
      <select
        value={value == null ? "" : value ? "yes" : "no"}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value === "yes")
        }
        className={inputClass()}
      >
        <option value="">Choose…</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}
