import type { PlannerPerson } from "@/lib/services/planner-people";

// Read-only cards of people details for the Planner's "My Personal
// Information" and "Family Members" sections. Server component — used by
// both the section page and its print view.
export function PlannerPeopleView({
  people,
  emptyText,
}: {
  people: PlannerPerson[];
  emptyText: string;
}) {
  if (people.length === 0) {
    return <p className="text-sm text-tal-plum-soft italic">{emptyText}</p>;
  }
  return (
    <div className="space-y-4">
      {people.map((p) => (
        <section
          key={p.id}
          className="rounded-2xl border border-tal-line bg-white p-5 print-avoid-break"
        >
          <h2 className="font-display text-lg text-tal-plum mb-2">{p.name}</h2>
          {p.fields.length === 0 ? (
            <p className="text-sm text-tal-plum-soft italic">No details added yet.</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr] text-sm">
              {p.fields.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-tal-plum-soft">{f.label}</dt>
                  <dd className="text-tal-plum whitespace-pre-wrap">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}
