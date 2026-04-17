import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

// Allow up to 60 seconds for this route — Anthropic needs time to generate
// a full itinerary with flights, hotels and day-by-day time blocks.
export const maxDuration = 60;

const MAX_FIELD_LENGTH = 200;

function sanitise(value: string, maxLen = MAX_FIELD_LENGTH): string {
  return value.slice(0, maxLen).replace(/[^\w\s\-,.!?''éèêëàâäùûüôöîïçñ€£$@#&()/:\\]+/gi, "").trim();
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal travel editor for an app called YourWeekend. You create day-by-day itineraries that feel like they were written by a knowledgeable local friend — not a tourist board. Every recommendation is specific to this person. The best pick flight and hotel should feel obvious. Every time block should feel chosen for them, not copy-pasted from TripAdvisor.

Respond ONLY with a valid raw JSON object. No explanation, no preamble, no markdown, no code blocks. Just JSON.`;

function buildTravelPrompt(params: {
  homeCity: string;
  destination: string;
  dates: string;
  numDays: number;
  flexibility: string;
  budget: string;
  companion: string;
  travelsFor: string;
  destinationType: string;
}): string {
  return `Plan a trip for this person:

USER PROFILE
- Home city: ${params.homeCity}
- Travels for: ${params.travelsFor}
- Favourite destination type: ${params.destinationType}
- Travelling with: ${params.companion}

TRIP DETAILS
- Flying from: ${params.homeCity} (use nearest major airport)
- Destination: ${params.destination}
- Dates: ${params.dates} (${params.numDays} nights)
- Date flexibility: ${params.flexibility}
- Budget for flights + accommodation: ${params.budget}

Return a JSON object matching this schema EXACTLY:

{
  "tripHeadline": "Vivid, personal headline — never 'Your Trip to X'",
  "tripNarrative": "2 sentences setting the scene, specific to this person.",
  "isLocal": false,
  "flights": [
    {
      "airline": "",
      "origin": "IATA",
      "destination": "IATA",
      "departureTime": "HH:MM",
      "arrivalTime": "HH:MM",
      "duration": "Xh Ym",
      "stops": 0,
      "price": 0,
      "currency": "EUR",
      "bookingUrl": "",
      "isBestPick": false,
      "bestPickReason": ""
    }
  ],
  "hotels": [
    {
      "name": "",
      "neighbourhood": "",
      "starRating": 3,
      "pricePerNight": 0,
      "currency": "EUR",
      "bookingUrl": "",
      "isBestPick": false,
      "bestPickReason": ""
    }
  ],
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "dayTitle": "Short evocative title",
      "dayNarrative": "1 sentence.",
      "timeBlocks": [
        {
          "type": "activity | restaurant | transport | free_time",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "",
          "description": "1-2 sentences. Specific, not generic.",
          "location": "Venue or area",
          "estimatedCost": 0,
          "currency": "EUR",
          "travelFromPrevious": "e.g. 10 min walk",
          "bookingUrl": "",
          "whyThisUser": "One sentence — specific to this person.",
          "mealType": "breakfast | lunch | dinner (restaurants only)",
          "cuisine": "e.g. French (restaurants only)"
        }
      ]
    }
  ]
}

RULES:
- Return exactly 3 flights. Mark exactly 1 isBestPick true. Others false, bestPickReason "".
- Return exactly 3 hotels. Mark exactly 1 isBestPick true. Others false, bestPickReason "".
- Return exactly ${params.numDays} day objects.
- Each day has exactly 4 timeBlocks: morning activity, lunch restaurant, afternoon activity, dinner restaurant.
- travelFromPrevious: realistic walk/transit time. Use "0 min" if same location. Never empty.
- whyThisUser: specific to this person's profile. Never generic.
- Use real venues, real airlines, realistic prices for the route.`;
}

function buildLocalPrompt(params: {
  homeCity: string;
  destination: string;
  dates: string;
  numDays: number;
  companion: string;
  vibes: string;
  travelsFor: string;
}): string {
  return `Plan a local day-out for someone who lives in ${params.homeCity}:

USER PROFILE
- Lives in: ${params.homeCity}
- Travelling with: ${params.companion}

TRIP DETAILS
- Exploring: ${params.destination} (home city — no flights needed)
- Dates: ${params.dates} (${params.numDays} day${params.numDays > 1 ? "s" : ""})
- What they want: ${params.vibes}

Return a JSON object matching this schema EXACTLY:

{
  "tripHeadline": "Vivid, personal headline for this local experience",
  "tripNarrative": "2 sentences. Reference their vibes specifically.",
  "isLocal": true,
  "flights": [],
  "hotels": [],
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "dayTitle": "Short evocative title",
      "dayNarrative": "1 sentence.",
      "timeBlocks": [
        {
          "type": "activity | restaurant | transport | free_time",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "title": "",
          "description": "1-2 sentences. Specific, like a local tip.",
          "location": "Specific venue or area",
          "estimatedCost": 0,
          "currency": "EUR",
          "travelFromPrevious": "e.g. 10 min walk",
          "bookingUrl": "",
          "whyThisUser": "One sentence tied to their stated vibes.",
          "mealType": "breakfast | lunch | dinner (restaurants only)",
          "cuisine": "e.g. Italian (restaurants only)"
        }
      ]
    }
  ]
}

RULES:
- flights and hotels must be empty arrays [].
- Return exactly ${params.numDays} day object${params.numDays > 1 ? "s" : ""}.
- Each day has exactly 4 timeBlocks: morning activity, lunch, afternoon activity, dinner.
- travelFromPrevious: realistic walk/transit. Use "0 min" if same venue. Never empty.
- Real, specific venues only. whyThisUser must reference: ${params.vibes}.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in model response");
  return raw.slice(start, end + 1);
}

function humaniseFlex(flex: string): string {
  const map: Record<string, string> = {
    yesTotally: "Totally flexible",
    dayOrTwo: "A day or two either way",
    fixed: "Fixed dates",
  };
  return map[flex] ?? flex;
}

function humaniseBudget(budget: string): string {
  const map: Record<string, string> = {
    under200: "Under €200 total",
    b200to400: "€200–€400 total",
    b400to700: "€400–€700 total",
    over700: "€700+ total",
  };
  return map[budget] ?? budget;
}

function humaniseCompanion(companion: string): string {
  const map: Record<string, string> = {
    solo: "travelling solo",
    couple: "travelling as a couple",
    friends: "travelling with a group of friends",
    family: "travelling with family",
  };
  return map[companion] ?? companion;
}

function humaniseVibes(vibes: string[]): string {
  const map: Record<string, string> = {
    eating_out: "eating out and food",
    culture: "culture and sightseeing",
    nightlife: "nightlife and bars",
    outdoors: "outdoors and nature",
    shopping: "shopping",
  };
  return vibes.map((v) => map[v] ?? v).join(", ");
}

function calcNumDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth ──
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Rate limit: 10 trip generations per user per hour ──
  const { allowed } = rateLimit(`trip:${user.id}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "You've made too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    q, start, end, flex, budget,
    companion, vibes,
    homeCity, travelsFor, destinationType,
    isLocal,
  } = body;

  if (!q || !start || !end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const numDays = Math.min(calcNumDays(start, end), 4); // cap at 4 days to keep response fast
  const isLocalTrip = isLocal === "true";

  let userPrompt: string;
  if (isLocalTrip) {
    const vibesArr = vibes ? vibes.split(",").map((v) => v.trim()) : [];
    userPrompt = buildLocalPrompt({
      homeCity: sanitise(homeCity || q),
      destination: sanitise(q),
      dates: `${start} to ${end}`,
      numDays,
      companion: humaniseCompanion(sanitise(companion || "solo")),
      vibes: humaniseVibes(vibesArr),
      travelsFor: sanitise(travelsFor || "general experiences"),
    });
  } else {
    if (!flex || !budget) {
      return NextResponse.json({ error: "Missing required fields for travel trip" }, { status: 400 });
    }
    userPrompt = buildTravelPrompt({
      homeCity: sanitise(homeCity || "Unknown"),
      destination: sanitise(q),
      dates: `${start} to ${end}`,
      numDays,
      flexibility: humaniseFlex(flex),
      budget: humaniseBudget(budget),
      companion: humaniseCompanion(sanitise(companion || "solo")),
      travelsFor: sanitise(travelsFor || "general travel"),
      destinationType: sanitise(destinationType || "any destination"),
    });
  }

  // ── Call Anthropic ──
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    console.error("Anthropic API network error:", err);
    return NextResponse.json(
      { error: "Could not reach the trip planning service. Please try again." },
      { status: 502 }
    );
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text();
    console.error(`Anthropic API error ${anthropicRes.status}:`, text);
    return NextResponse.json(
      { error: `Anthropic error ${anthropicRes.status}: ${text.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const anthropicBody = await anthropicRes.json();
  const content = anthropicBody?.content;
  if (!Array.isArray(content)) {
    return NextResponse.json(
      { error: "Unexpected response shape from Anthropic" },
      { status: 502 }
    );
  }

  const rawText = content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  let tripData: Record<string, unknown>;
  try {
    tripData = JSON.parse(extractJson(rawText));
  } catch (err) {
    console.error("Failed to parse trip JSON:", err);
    return NextResponse.json(
      { error: "We received an unexpected response. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json(tripData);
}
