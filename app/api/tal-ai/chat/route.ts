import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { searchHelp, type HelpMatch } from "@/lib/help/vector-search";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// System prompt: "loose grounding" — anchor to the retrieved TAL library
// first, extend with general knowledge only when the library is thin, and
// always flag Australian-specific caveats.
const SYSTEM_PROMPT = `You are TAL AI, the Adulting Life assistant. You help Australians with life admin — passports, tax, super, insurance, employment, health records, and more.

You have access to The Adulting Life help library (extracted from Donna Fitzgerald's Adulting Life Organiser). When answering a user's question:

1. FIRST, use the "Relevant help library sections" provided in the next message as your primary source. Quote or paraphrase them naturally — don't just dump them.
2. If the library covers the question well, base your answer on it and cite the section titles you used.
3. If the library is thin or missing on the topic, extend with your general knowledge, BUT clearly say so (e.g. "The library doesn't cover this specifically, but generally...").
4. For Australian-specific rules (ATO thresholds, Centrelink, Medicare, super rules), be extra cautious with anything not in the library — flag that rules change and suggest checking the official source (ato.gov.au, servicesaustralia.gov.au, etc.).
5. Match Donna's warm, practical, Australian tone. Direct but not clinical. Say "you've got this" naturally, not forced.
6. Keep answers focused — 2-4 short paragraphs unless the user asks for detail. Use bullet lists when giving steps.
7. Never invent official processes, form numbers, or dollar figures. If you're not sure, say so.

You are NOT a lawyer, accountant, doctor, or financial adviser. For decisions with real consequences, recommend the user check with a qualified professional.`;

function buildContextMessage(matches: HelpMatch[]): string {
  if (matches.length === 0) {
    return "Relevant help library sections: (no matching sections found — the user's question may be outside the current library, or phrased in a way that didn't match. Use your general knowledge, flag that the library doesn't cover this yet.)";
  }
  const lines: string[] = ["Relevant help library sections:\n"];
  matches.forEach((m, i) => {
    lines.push(
      `--- [${i + 1}] ${m.title} (similarity: ${m.similarity.toFixed(2)}) ---`
    );
    lines.push(m.content);
    lines.push("");
  });
  return lines.join("\n");
}

// Return the citations as a base64-encoded JSON header so the client can pick
// them up before the streamed text arrives. Text stream itself stays clean.
function encodeCitations(matches: HelpMatch[]): string {
  const payload = matches.map((m) => ({
    slug: m.slug,
    title: m.title,
    pdfPage: m.pdfPage,
    source: m.source,
    similarity: Number(m.similarity.toFixed(3)),
  }));
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "no_messages" }, { status: 400 });
    }

    // Retrieval: embed the latest user message only. History influences the
    // answer but not what we retrieve — keeps embeddings cheap and focused.
    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    const matches = latestUser
      ? await searchHelp(latestUser.content, 5)
      : [];

    // Drop any matches below a weak-similarity floor. text-embedding-3-small
    // cosine similarity above ~0.35 tends to be genuinely related; below is
    // often noise. Keep at least one though, to hint at the closest topic.
    const strongMatches = matches.filter((m) => m.similarity >= 0.35);
    const contextMatches =
      strongMatches.length > 0 ? strongMatches : matches.slice(0, 1);

    // Combined system prompt (persona + retrieved context). Some model SDKs
    // reject two consecutive system messages; concatenating is safer.
    const systemContent = `${SYSTEM_PROMPT}\n\n${buildContextMessage(contextMatches)}`;
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const result = streamText({
      model: openai("gpt-4o-mini"),
      instructions: systemContent,
      messages: nonSystemMessages,
    });

    const response = result.toTextStreamResponse();
    response.headers.set(
      "x-tal-citations",
      encodeCitations(contextMatches)
    );
    // Expose the header to the browser fetch — needed for cross-origin, and
    // good hygiene for same-origin too.
    response.headers.set("access-control-expose-headers", "x-tal-citations");
    return response;
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tal-ai.chat", e);
  }
}
