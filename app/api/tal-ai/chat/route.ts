import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { searchHelp, type HelpMatch } from "@/lib/help/vector-search";
import { enforceAiRateLimit } from "@/lib/services/rate-limit";
import {
  isRateLimitOrSpendError,
  rateLimitResponse,
} from "@/lib/services/rate-limit-response";

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

## Boundary: education vs personalised advice

You are an educational and organising tool, NOT a lawyer, accountant, doctor, or financial adviser. You must draw a firm line between explaining concepts (fine) and giving personalised advice (not fine).

FINE — explain concepts, systems, what a field on a form means, general processes:
- "What is superannuation?"
- "How does the Australian tax year work?"
- "What documents does an executor typically need?"
- "What's the difference between an Advance Health Directive and a Will?"
- "How do I lodge a tax return via myGov, in general?"

NOT FINE — personalised recommendations, specific numbers for THIS person, or decisions that need a licensed professional:
- "Which super fund should I choose?" → Explain what to look at (fees, returns, insurance, MySuper), then say a licensed financial adviser can compare specific funds for their situation.
- "What deductions can I claim?" → Explain the general categories (work-related, self-education, home office) and the ATO's substantiation rules, then say an accountant will confirm what applies to their specific income and role.
- "Is this lump on my arm serious?" → Do not attempt to diagnose. Say to see their GP.
- "Should I sign this contract?" → Explain what to look out for generally, then say a solicitor should review anything with real financial or legal consequence.
- "How much life insurance do I need?" → Explain what influences the number (income, dependents, debts, existing cover), then say a licensed adviser can model their specific numbers.
- "Am I entitled to Centrelink payment X?" → Explain what the payment is and the general eligibility categories, then direct to Services Australia's payment finder and a Centrelink officer for their circumstances.

When in doubt, err on the side of educational + "for your specific situation, check with {relevant professional or authority}." Never fabricate a personalised recommendation to seem helpful.`;

// High-risk topic keywords: personalised advice in these areas needs a
// qualified professional. Matched with word-boundary awareness on the latest
// user message. False positives are fine (the extra nudge just reinforces
// what SYSTEM_PROMPT already says); false negatives are the risk we're
// managing.
const HIGH_RISK_TOPICS: Array<{
  label: string;
  professional: string;
  patterns: RegExp[];
}> = [
  {
    label: "tax",
    professional: "a registered tax agent or accountant",
    patterns: [
      /\b(tax deduction|deductions?|write off|write-off|claim(ing)?\s+(back|on|for)|refund amount|capital gain|cgt|depreciation|salary sacrifice|negative gear|franking|gst\s+claim)\b/i,
      /\bhow much (can|should) i claim\b/i,
      /\bam i entitled to a refund\b/i,
    ],
  },
  {
    label: "financial",
    professional: "a licensed financial adviser",
    patterns: [
      /\b(which\s+(super|fund|etf|share|stock|investment|broker|bank)|best\s+(super|fund|etf|share|broker|bank|savings\s+account|mortgage|loan)|should i (buy|sell|invest|refinance)|switch\s+(super|fund|banks?)|salary sacrifice|insurance\s+cover|life\s+insurance\s+(amount|need))\b/i,
      /\bhow much (super|insurance|life cover) (do|should) i (need|have)\b/i,
    ],
  },
  {
    label: "medical",
    professional: "your GP or a qualified medical professional",
    patterns: [
      /\b(diagnose|diagnosis|symptom|lump|rash|pain in|is this (serious|normal|cancer)|should i see a doctor|medication (dose|dosage|interaction)|mental health crisis)\b/i,
      /\bam i (having|suffering from)\b/i,
    ],
  },
  {
    label: "legal",
    professional: "a solicitor",
    patterns: [
      /\b(sue|lawsuit|court|custody|divorce settlement|contract review|should i sign|is this legal|my rights|breach of contract|defamation|restraining order)\b/i,
    ],
  },
  {
    label: "government-payment",
    professional: "Services Australia (Centrelink)",
    patterns: [
      /\b(am i (entitled|eligible) to|do i qualify for|can i get)\s+(centrelink|newstart|jobseeker|austudy|abstudy|youth allowance|family tax|parenting payment|carer|disability support|age pension|jobkeeper)\b/i,
      /\bhow much (centrelink|payment) will i get\b/i,
    ],
  },
];

function detectHighRiskTopics(text: string): typeof HIGH_RISK_TOPICS {
  return HIGH_RISK_TOPICS.filter((t) =>
    t.patterns.some((p) => p.test(text))
  );
}

function buildHighRiskNudge(topics: typeof HIGH_RISK_TOPICS): string {
  if (topics.length === 0) return "";
  const lines = [
    "",
    "## Extra caution needed for this question",
    "",
    "The user's question touches on personalised advice in one or more high-risk areas:",
  ];
  for (const t of topics) {
    lines.push(`- **${t.label}** → for their specific situation, direct them to ${t.professional}.`);
  }
  lines.push(
    "",
    "Explain the general concept and what typically influences the answer. Do NOT quote specific dollar figures, percentages, product names, or 'you should' recommendations for this person. End with a clear pointer to the professional above."
  );
  return lines.join("\n");
}

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
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "no_messages" }, { status: 400 });
    }

    await enforceAiRateLimit(session.user.id, "tal-ai-chat");

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

    // High-risk topic detection: if the user is asking for personalised
    // tax/financial/medical/legal/government-payment advice, add an extra
    // nudge so the model errs even harder on the side of "consult a
    // professional." Layer 2 defence on top of the general SYSTEM_PROMPT.
    const highRiskTopics = latestUser
      ? detectHighRiskTopics(latestUser.content)
      : [];
    const highRiskNudge = buildHighRiskNudge(highRiskTopics);

    // Combined system prompt (persona + high-risk nudge + retrieved context).
    // Some model SDKs reject two consecutive system messages; concatenating
    // is safer.
    const systemContent = `${SYSTEM_PROMPT}${highRiskNudge}\n\n${buildContextMessage(contextMatches)}`;
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
    if (isRateLimitOrSpendError(e)) {
      return rateLimitResponse(e);
    }
    return apiError("api:tal-ai.chat", e);
  }
}
