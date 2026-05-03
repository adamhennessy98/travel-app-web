import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

// Just a Claude destination pick — no Duffel needed here
export const maxDuration = 30;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a travel expert for VOYA. Your job is to pick the single best travel destination for a user based on their preferences.

Be opinionated. The user wants a recommendation, not a list of options.
Respond ONLY with valid raw JSON. No explanation, no markdown, no code blocks.`;

function buildPrompt(params: {
  query: string;
  companion: string;
  when: string;
  nights: number;
  budget: string;
  extraContext: string;
  today: string;
}): string {
  return `Pick the single best travel destination for this person.

WHAT THEY'RE AFTER: "${params.query || "open to anything"}"
TRAVELLING: ${params.companion}
WHEN: ${params.when}
NIGHTS: ${params.nights}
BUDGET: ${params.budget}
EXTRA CONTEXT: ${params.extraContext || "none provided"}
TODAY'S DATE: ${params.today}

Return ONLY this JSON:

{
  "destination": "Specific City, Country",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "reason": "One punchy sentence: why this place, why these exact dates"
}

RULES:
- ONE destination only — no alternatives, no hedging
- Be opinionated and specific (not just "Croatia" — say "Hvar, Croatia")
- start date must be after ${params.today} and fall within the timing they specified
- end = start + ${params.nights} nights exactly
- reason must mention the destination, the season, and why it suits this specific person — never generic
- If they mention somewhere they've been or want to avoid, pick somewhere else`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON found in response");
  return raw.slice(start, end + 1);
}

function humaniseCompanion(companion: string, groupSize?: number): string {
  const map: Record<string, string> = {
    solo:    "travelling solo",
    couple:  "travelling as a couple",
    friends: groupSize ? `group of ${groupSize} friends` : "group of friends",
    family:  "family trip",
  };
  return map[companion] ?? companion;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit — slightly more generous than full trip generation
  const { allowed } = rateLimit(`inspire:${user.id}`, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { query, companion, groupSize, when, nights, budgetMin, budgetMax, extraContext } = body;

  if (!companion || !when) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const budget =
    budgetMin && budgetMax
      ? `€${budgetMin}–€${budgetMax} total`
      : "flexible / not specified";

  const prompt = buildPrompt({
    query:        String(query ?? "").slice(0, 500),
    companion:    humaniseCompanion(String(companion), groupSize ? Number(groupSize) : undefined),
    when:         String(when).slice(0, 100),
    nights:       Math.min(14, Math.max(2, Number(nights) || 5)),
    budget,
    extraContext: String(extraContext ?? "").slice(0, 500),
    today:        new Date().toISOString().split("T")[0],
  });

  // ── Call Claude ──
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":          apiKey,
        "anthropic-version":  "2023-06-01",
        "content-type":       "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 300,           // destination pick only — intentionally tight
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[inspire] Network error:", err);
    return NextResponse.json(
      { error: "Could not reach the recommendation service. Please try again." },
      { status: 502 }
    );
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text();
    console.error(`[inspire] Anthropic error ${anthropicRes.status}:`, text.slice(0, 300));
    return NextResponse.json(
      { error: "Could not generate a recommendation. Please try again." },
      { status: 502 }
    );
  }

  const anthropicBody = (await anthropicRes.json()) as {
    content?: { type: string; text: string }[];
  };
  const rawText = (anthropicBody.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  let data: { destination: string; start: string; end: string; reason: string };
  try {
    data = JSON.parse(extractJson(rawText));
  } catch (err) {
    console.error("[inspire] JSON parse failed:", err, rawText.slice(0, 200));
    return NextResponse.json(
      { error: "We received an unexpected response. Please try again." },
      { status: 502 }
    );
  }

  // Validate dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!data.destination || !dateRegex.test(data.start) || !dateRegex.test(data.end)) {
    console.error("[inspire] Invalid response shape:", data);
    return NextResponse.json(
      { error: "We received an unexpected response. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json(data);
}
