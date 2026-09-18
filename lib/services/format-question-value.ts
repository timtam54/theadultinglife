import type { PageQuestionRow } from "@/lib/db/types";

// Convert a raw stored `question_responses.value` into a human-readable
// string, based on the question type. Structured question types (address,
// dropdown) are stored as JSON in the DB; without this, read-only views
// would show raw JSON blobs like {"address":"…","lat":…,"lon":…}.
//
// Shared between the Planner shared-items feed and the Planner read-only /
// print / secure-share view so all three surfaces render identically.
export function formatQuestionValue(
  question: Pick<PageQuestionRow, "question_type" | "options"> | undefined,
  raw: string
): string {
  if (!question) return raw;
  switch (question.question_type) {
    case "address": {
      try {
        const parsed = JSON.parse(raw) as { address?: unknown };
        if (parsed && typeof parsed === "object" && typeof parsed.address === "string") {
          return parsed.address;
        }
      } catch {
        /* legacy plain string — fall through */
      }
      return raw;
    }
    case "dropdown": {
      const opt = (question.options ?? []).find((o) => o.value === raw);
      return opt?.label ?? raw;
    }
    case "date": {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return raw;
    }
    default:
      return raw;
  }
}
