import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";

// When the organiser search finds nothing — a typo ("pasport"), or a
// question ("how do I add a will") — TAL AI works out where in the app the
// person should go. It's only given the search words and the names of the
// app's folders and pages, never anything the person has stored.

export const APP_PAGES: { href: string; name: string; about: string }[] = [
  { href: "/dashboard", name: "Dashboard", about: "overview, emergency card, reminders, progress" },
  { href: "/welcome", name: "Setup guide", about: "step-by-step first-time setup" },
  { href: "/records", name: "The Adulting Life Organiser", about: "all folders by section and family member" },
  { href: "/documents", name: "Documents", about: "every uploaded file" },
  { href: "/receipts", name: "Receipts", about: "photograph receipts, GST, tax-time totals" },
  { href: "/templates/peace-of-mind-planner", name: "Peace of Mind Planner", about: "wishes, letters to loved ones, funeral wishes, sharing with next of kin" },
  { href: "/learn", name: "Learn", about: "life-skills articles and quizzes" },
  { href: "/tal-ai", name: "TAL AI", about: "ask any adulting question" },
  { href: "/tasks", name: "Tasks", about: "to-do list" },
  { href: "/reminders", name: "Reminders", about: "expiry dates, renewals, custom reminders" },
  { href: "/emergency", name: "Emergency", about: "emergency contacts, medications and insurance on one page" },
  { href: "/settings", name: "Settings", about: "PIN, Face ID, download everything, sharing, delete account" },
  { href: "/subscription", name: "Subscription", about: "TAL Premium plan and card" },
  { href: "/maps", name: "Maps", about: "saved places" },
];

const resultSchema = z.object({
  answer: z.string().describe("One or two friendly sentences saying where to go and what to do there."),
  matches: z
    .array(
      z.object({
        id: z.string().describe("A folder id or page href from the lists given."),
        why: z.string().describe("A few words on why this fits."),
      })
    )
    .max(5),
});

export interface SearchAssistMatch {
  kind: "folder" | "page";
  href: string;
  name: string;
  where: string;
  why: string;
}

export async function searchAssist(
  userId: string,
  query: string
): Promise<{ answer: string; matches: SearchAssistMatch[] }> {
  const { data, error } = await createServiceClient()
    .from("subcategories")
    .select("id, name, hint, category_id")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("template_group", null)
    .order("sort_order");
  if (error) throw error;
  const folders = (data ?? []) as { id: string; name: string; hint: string | null; category_id: CategoryId }[];

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: resultSchema,
    system: `You help people find things in The Adulting Life, an Australian life-admin app. The person searched their organiser and nothing matched, usually because of a typo or because they asked a question. Pick up to 5 folders or pages, best first, using ONLY the ids and hrefs listed. If nothing fits, return no matches and say so kindly. Australian spelling. Never ask for or mention tax file numbers being stored — the app doesn't store them.`,
    prompt: `Search: "${query.slice(0, 200)}"

Folders (id — name — section — hint):
${folders.map((f) => `${f.id} — ${f.name} — ${CATEGORY_LABELS[f.category_id] ?? f.category_id}${f.hint ? ` — ${f.hint}` : ""}`).join("\n")}

Pages (href — name — what's there):
${APP_PAGES.map((p) => `${p.href} — ${p.name} — ${p.about}`).join("\n")}`,
  });

  // Keep only real folders and pages (never trust an id the model made up).
  const byId = new Map(folders.map((f) => [f.id, f]));
  // Pages by href, with or without the slash, and by name.
  const byHref = new Map<string, (typeof APP_PAGES)[number]>();
  for (const p of APP_PAGES) for (const k of [p.href, p.href.slice(1), p.name.toLowerCase()]) byHref.set(k, p);
  const matches: SearchAssistMatch[] = [];
  for (const m of object.matches) {
    if (matches.some((x) => x.href.endsWith(m.id))) continue;
    const f = byId.get(m.id);
    if (f) {
      matches.push({
        kind: "folder",
        href: `/records/${f.category_id}/${encodeURIComponent(f.id)}`,
        name: f.name,
        where: CATEGORY_LABELS[f.category_id] ?? f.category_id,
        why: m.why,
      });
      continue;
    }
    const p = byHref.get(m.id) ?? byHref.get(m.id.toLowerCase().trim());
    if (p) matches.push({ kind: "page", href: p.href, name: p.name, where: "Page", why: m.why });
  }
  return { answer: object.answer.replace(/\*\*/g, ""), matches };
}
