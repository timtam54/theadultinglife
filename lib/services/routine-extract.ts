import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { READER_RULES } from "@/lib/services/ai-reader-rules";

// Reads a photo / PDF of a daily routine (e.g. a filled-in TAL Daily Routine
// Planner) into a list of timed activities for the calendar. The AI returns
// each entry as it is written — the time printed on that line and the
// activity — instead of filling a fixed set of time-slot fields, which made
// it slip entries into neighbouring empty slots.

const routineSchema = z.object({
  entries: z.array(
    z.object({
      time: z.string().describe("24-hour HH:MM, exactly as printed on the line"),
      activity: z.string(),
    })
  ),
  days: z
    .array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]))
    .describe("Days the routine says it applies to; empty if it doesn't say"),
});

export interface RoutineEntry {
  time: string; // HH:MM, 24-hour
  activity: string;
}

export interface RoutineResult {
  entries: RoutineEntry[];
  days: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
}

const SYSTEM = `You read a photo, scan or PDF of a person's daily routine or timetable (often handwritten on a printed planner with one line per time slot) for an Australian life-admin app.

Go down the page one printed line at a time and return EVERY time line, in order from the top, as { time, activity } — including lines where nothing is written (activity ""):
- time: the time printed on that line, as 24-hour HH:MM (e.g. "6:30 pm" → "18:30").
- activity: what is handwritten or typed on that same line, transcribed faithfully (keep abbreviations as written), or "" if the line is empty.

Rules:
${READER_RULES}
- Every printed time gets exactly one element, even when its line is empty. Never move writing onto a neighbouring line's time.
- days: the days the routine applies to if the page says so (e.g. "Mon – Fri" → mon, tue, wed, thu, fri); otherwise an empty list.`;

export async function extractRoutine(fileBase64: string, mimeType: string): Promise<RoutineResult> {
  const filePart =
    mimeType === "application/pdf"
      ? { type: "file" as const, data: fileBase64, mediaType: "application/pdf", filename: "routine.pdf" }
      : { type: "image" as const, image: fileBase64, mediaType: mimeType };
  const result = await generateObject({
    // The larger model keeps its place in long timetables much better.
    model: openai("gpt-4o"),
    schema: routineSchema,
    system: SYSTEM,
    messages: [{ role: "user", content: [filePart, { type: "text", text: "List every printed time line, with what is written on it (or empty)." }] }],
  });
  const entries = result.object.entries
    .map((e) => ({ time: e.time.trim(), activity: e.activity.trim() }))
    .filter((e) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(e.time) && e.activity)
    .map((e) => ({ ...e, time: e.time.padStart(5, "0") }));
  return { entries, days: result.object.days };
}
