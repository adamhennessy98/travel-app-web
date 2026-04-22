import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import {
  getIata,
  getCoordinates,
  searchFlights,
  searchStays,
  flightSummary,
  hotelSummary,
} from "@/lib/duffel";
import type { FlightOffer, HotelOffer, ItineraryResult } from "@/types/trip";

// Allow up to 60 seconds — Duffel + Claude can take a while
export const maxDuration = 60;

const MAX_FIELD_LENGTH = 200;

function sanitise(value: string, maxLen = MAX_FIELD_LENGTH): string {
  return value
    .slice(0, maxLen)
    .replace(/[^\w\s\-,.!?''éèêëàâäùûüôöîïçñ€£$@#&()/:\\]+/gi, "")
    .trim();
}

// ─── Duration / date helpers ──────────────────────────────────────────────────

function calcNumDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

// ─── Humanisers ───────────────────────────────────────────────────────────────

function humaniseCompanion(companion: string, groupSize?: string): string {
  const map: Record<string, string> = {
    solo: "travelling solo",
    couple: "travelling as a couple",
    friends: groupSize
      ? `travelling with a group of ${groupSize} friends`
      : "travelling with a group of friends",
    family: "travelling with family",
  };
  return map[companion] ?? companion;
}

function humaniseBudget(budget: string, budgetMin?: string, budgetMax?: string): string {
  if (budgetMin && budgetMax) return `€${budgetMin}–€${budgetMax} total`;
  if (budget === "unsure" || !budget) return "flexible / not specified";
  const map: Record<string, string> = {
    under200: "Under €200 total",
    b200to400: "€200–€400 total",
    b400to700: "€400–€700 total",
    over700: "€700+ total",
  };
  return map[budget] ?? budget;
}

// ─── Claude prompt builders ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal travel editor for VOYA. Real flight and hotel options have already been retrieved from a booking API. Your job is to write the trip headline, narrative, and day-by-day itinerary only.

Respond ONLY with a valid raw JSON object. No explanation, no preamble, no markdown, no code blocks. Just JSON.`;

/** Lean prompt used when real Duffel data is available */
function buildNarrativePrompt(params: {
  destination: string;
  dates: string;
  numDays: number;
  companion: string;
  travelsFor: string;
  destinationType: string;
  budget: string;
  eventName?: string;
  accommodation?: string;
  flightContext: string;
  hotelContext: string;
}): string {
  const accomHint =
    params.accommodation === "near_venue"
      ? "close to the event venue"
      : params.accommodation === "city_centre"
      ? "in the city centre"
      : "best value";

  return `Write a day-by-day travel itinerary. Real flights and hotels have already been found via booking API — do NOT invent new ones.

DESTINATION: ${params.destination}
DATES: ${params.dates} (${params.numDays} nights)
TRAVELLING: ${params.companion}
TRAVELS FOR: ${params.travelsFor}
FAVOURITE DESTINATION TYPE: ${params.destinationType}
BUDGET: ${params.budget}
${params.eventName ? `EVENT: ${params.eventName}` : ""}
${params.accommodation ? `ACCOMMODATION PREFERENCE: ${accomHint}` : ""}

REAL FLIGHTS FOUND:
${params.flightContext}

REAL HOTELS FOUND:
${params.hotelContext}

Return ONLY this JSON (no flights or hotels fields — those are already provided):

{
  "tripHeadline": "Vivid, personal headline${params.eventName ? ` — reference ${params.eventName}` : ""}",
  "tripNarrative": "2 sentences setting the scene for this specific trip. Reference the destination and travel style.",
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
          "whyThisUser": "One sentence tied to their profile.",
          "mealType": "breakfast | lunch | dinner (restaurants only)",
          "cuisine": "e.g. French (restaurants only)"
        }
      ]
    }
  ]
}

RULES:
- Return exactly ${params.numDays} day objects.
${
  params.eventName
    ? `- The day ${params.eventName} takes place must have it as a dedicated timeBlock (type "activity"), given a 4–6 hour window. This is the centrepiece.\n- Every other day: exactly 3 timeBlocks — morning activity, lunch, dinner.`
    : "- Each day: exactly 3 timeBlocks — morning activity, lunch, dinner."
}
- travelFromPrevious: realistic walk/transit. Use "0 min" if same venue. Never empty.
- whyThisUser: specific to this person's travel style. Never generic.
- Use real, specific venues in ${params.destination}.`;
}

/** Full Claude prompt used as fallback when Duffel returns no data */
function buildFullPrompt(params: {
  homeCity: string;
  destination: string;
  dates: string;
  numDays: number;
  companion: string;
  travelsFor: string;
  destinationType: string;
  budget: string;
  isEvent: boolean;
  eventName?: string;
  accommodation?: string;
}): string {
  const accomMap: Record<string, string> = {
    near_venue: "as close to the event venue as possible",
    city_centre: "in the city centre (willing to commute to the venue)",
    best_value: "best value available",
  };
  const accomPref = accomMap[params.accommodation ?? ""] ?? "best value available";

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
- Budget: ${params.budget}
${params.isEvent ? `- Event: ${params.eventName}` : ""}
${params.isEvent ? `- Accommodation preference: ${accomPref}` : ""}

Return a JSON object matching this schema EXACTLY:

{
  "tripHeadline": "${params.isEvent ? `Vivid headline — reference ${params.eventName}` : "Vivid, personal headline"}",
  "tripNarrative": "2 sentences setting the scene.",
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
      "layovers": [],
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
          "whyThisUser": "One sentence.",
          "mealType": "breakfast | lunch | dinner (restaurants only)",
          "cuisine": "e.g. French (restaurants only)"
        }
      ]
    }
  ]
}

RULES:
- Return exactly 2 flights. Mark exactly 1 isBestPick true.
- Return exactly 2 hotels. Mark exactly 1 isBestPick true.
- layovers: empty [] for direct; one entry per stop with IATA, city, layover duration.
- Return exactly ${params.numDays} day objects.
${
  params.isEvent && params.eventName
    ? `- The day ${params.eventName} takes place must have it as a dedicated timeBlock (type "activity"), 4–6 hour window.\n- Every other day: morning activity, lunch, dinner.`
    : "- Each day: morning activity, lunch, dinner."
}
- travelFromPrevious: realistic. Never empty.
- Use real venues, real airlines, realistic prices.`;
}

/** Local trip prompt (no flights/hotels needed) */
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
          "description": "1-2 sentences.",
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
- travelFromPrevious: realistic walk/transit. Never empty.
- Real, specific venues only. whyThisUser must reference: ${params.vibes}.`;
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model response");
  return raw.slice(start, end + 1);
}

// ─── Anthropic call ───────────────────────────────────────────────────────────

async function callClaude(apiKey: string, userPrompt: string): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(40_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = await res.json() as { content?: { type: string; text: string }[] };
  const rawText = (body.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return JSON.parse(extractJson(rawText));
}

// ─── Humanise vibes ───────────────────────────────────────────────────────────

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

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 trip generations per user per hour
  const { allowed } = rateLimit(`search:${user.id}`, {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  });
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
    q,
    start,
    end,
    flex,
    budget,
    budgetMin,
    budgetMax,
    companion,
    groupSize,
    vibes,
    homeCity,
    travelsFor,
    destinationType,
    isLocal,
    isEvent,
    event,
    accommodation,
  } = body;

  if (!q || !start || !end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const numDays = Math.min(calcNumDays(start, end), 3);
  const isLocalTrip = isLocal === "true";
  const isEventTrip = isEvent === "true";

  const destination = sanitise(q);
  const homeCitySafe = sanitise(homeCity || "Unknown");
  const companionStr = humaniseCompanion(sanitise(companion || "solo"), groupSize);
  const budgetStr = humaniseBudget(budget || "", budgetMin, budgetMax);

  // ── LOCAL TRIP: Claude-only, no Duffel ──────────────────────────────────────
  if (isLocalTrip) {
    const vibesArr = vibes ? vibes.split(",").map((v) => v.trim()) : [];
    const prompt = buildLocalPrompt({
      homeCity: homeCitySafe,
      destination,
      dates: `${start} to ${end}`,
      numDays,
      companion: companionStr,
      vibes: humaniseVibes(vibesArr),
      travelsFor: sanitise(travelsFor || "general experiences"),
    });

    try {
      const data = await callClaude(apiKey, prompt);
      return NextResponse.json(data);
    } catch (err) {
      console.error("[search] Claude local trip failed:", err);
      return NextResponse.json(
        { error: "Could not generate your itinerary. Please try again." },
        { status: 502 }
      );
    }
  }

  // ── TRAVEL / EVENT TRIP: Duffel + Claude ────────────────────────────────────

  // Derive passenger / room counts from companion type
  const numPax =
    companion === "couple"
      ? 2
      : companion === "friends" && groupSize
      ? Math.max(2, parseInt(groupSize))
      : companion === "family"
      ? 3
      : 1;
  const numRooms =
    companion === "friends"
      ? Math.max(1, Math.ceil(numPax / 2))
      : 1;

  // ── Step 1: Resolve IATA codes + coordinates in parallel ──
  const [originIata, destIata, coords] = await Promise.all([
    getIata(homeCitySafe),
    getIata(destination),
    getCoordinates(destination),
  ]);

  console.log(
    `[search] ${homeCitySafe} → ${originIata ?? "?"} | ${destination} → ${destIata ?? "?"} | coords: ${JSON.stringify(coords)}`
  );

  // ── Step 2: Fetch flights + stays in parallel (with fallbacks) ──
  let flights: FlightOffer[] = [];
  let hotels: HotelOffer[] = [];
  let duffelOk = false;

  if (originIata && destIata) {
    const flightPromise = searchFlights(originIata, destIata, start, numPax).catch(
      (err) => {
        console.error("[search] searchFlights failed:", err);
        return [] as FlightOffer[];
      }
    );

    const stayPromise =
      coords
        ? searchStays(coords.lat, coords.lng, start, end, numRooms, numPax).catch(
            (err) => {
              console.error("[search] searchStays failed:", err);
              return [] as HotelOffer[];
            }
          )
        : Promise.resolve<HotelOffer[]>([]);

    [flights, hotels] = await Promise.all([flightPromise, stayPromise]);
    duffelOk = flights.length > 0 || hotels.length > 0;
  }

  console.log(
    `[search] Duffel results — flights: ${flights.length}, hotels: ${hotels.length}`
  );

  // ── Step 3: Claude ──
  let tripData: ItineraryResult;

  if (duffelOk) {
    // Lean prompt — Claude writes narrative + days only; we inject real Duffel data
    const prompt = buildNarrativePrompt({
      destination,
      dates: `${start} to ${end}`,
      numDays,
      companion: companionStr,
      travelsFor: sanitise(travelsFor || "general travel"),
      destinationType: sanitise(destinationType || "any destination"),
      budget: budgetStr,
      eventName: isEventTrip ? sanitise(event || "") : undefined,
      accommodation: isEventTrip ? accommodation : undefined,
      flightContext: flightSummary(flights),
      hotelContext: hotelSummary(hotels),
    });

    try {
      const partial = (await callClaude(apiKey, prompt)) as {
        tripHeadline?: string;
        tripNarrative?: string;
        days?: ItineraryResult["days"];
      };

      tripData = {
        tripHeadline: partial.tripHeadline ?? destination,
        tripNarrative: partial.tripNarrative ?? "",
        isLocal: false,
        flights,
        hotels,
        days: partial.days ?? [],
      };
    } catch (err) {
      console.error("[search] Claude narrative failed:", err);
      return NextResponse.json(
        { error: "Could not generate your itinerary. Please try again." },
        { status: 502 }
      );
    }
  } else {
    // Fallback: Duffel had no results — Claude generates everything
    console.log("[search] No Duffel data — falling back to full Claude generation");

    if (isEventTrip && !event) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    const prompt = buildFullPrompt({
      homeCity: homeCitySafe,
      destination,
      dates: `${start} to ${end}`,
      numDays,
      companion: companionStr,
      travelsFor: sanitise(travelsFor || "general travel"),
      destinationType: sanitise(destinationType || "any destination"),
      budget: budgetStr,
      isEvent: isEventTrip,
      eventName: isEventTrip ? sanitise(event || "") : undefined,
      accommodation: isEventTrip ? accommodation : undefined,
    });

    try {
      const data = (await callClaude(apiKey, prompt)) as Omit<ItineraryResult, "isLocal"> & {
        isLocal?: boolean;
      };
      tripData = { ...data, isLocal: false } as ItineraryResult;
    } catch (err) {
      console.error("[search] Claude fallback failed:", err);
      return NextResponse.json(
        { error: "Could not generate your itinerary. Please try again." },
        { status: 502 }
      );
    }
  }

  // Validation: also allow regular travel trips without flex (they now go to search not trip)
  if (!flex && !isEventTrip) {
    // Non-event trips from the old flow that don't have flex — still ok, just note it
    console.log("[search] No flex param — regular travel trip via search endpoint");
  }

  return NextResponse.json(tripData);
}
