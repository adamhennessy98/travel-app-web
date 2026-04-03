import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a personal travel curator for an app called YourWeekend. Your job is to create a single, cohesive, personalised trip plan based on everything you know about the user and their trip. You do not return generic results. Every recommendation should feel like it was chosen specifically for this person. The best pick flight and hotel should feel obvious. The activities should feel tailored — not tourist board filler. Respond only with a valid raw JSON object. No explanation, no preamble, no markdown, no code blocks. Just the JSON.";

function buildUserPrompt(params: {
  homeCity: string;
  travelsFor: string;
  destinationType: string;
  destination: string;
  dates: string;
  flexibility: string;
  interests: string;
  budget: string;
}): string {
  return `Plan a trip for a user with the following profile and trip details:

USER PROFILE
- Home city: ${params.homeCity}
- Travels for: ${params.travelsFor}
- Loves: ${params.destinationType}

TRIP DETAILS
- Flying from: ${params.homeCity} nearest airport
- Destination: ${params.destination}
- Dates: ${params.dates}
- Date flexibility: ${params.flexibility}
- Interests for this trip: ${params.interests}
- Budget: ${params.budget}

Return a JSON object matching this schema exactly:

{
  "tripHeadline": "",
  "flights": [
    {
      "airline": "",
      "origin": "",
      "destination": "",
      "departureTime": "",
      "arrivalTime": "",
      "duration": "",
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
      "starRating": 0,
      "pricePerNight": 0,
      "currency": "EUR",
      "bookingUrl": "",
      "isBestPick": false,
      "bestPickReason": ""
    }
  ],
  "mustDos": [
    {
      "name": "",
      "description": "",
      "whyThisUser": "",
      "url": ""
    }
  ],
  "whileYoureThere": [
    {
      "name": "",
      "description": "",
      "whyThisUser": "",
      "url": ""
    }
  ]
}

Rules:
- Return exactly 3 flights. Mark exactly one isBestPick true. Others false with empty bestPickReason.
- Return exactly 3 hotels. Mark exactly one isBestPick true. Others false with empty bestPickReason.
- Return exactly 2 mustDos personalised to this user's profile and interests.
- Return exactly 3 whileYoureThere items, lighter but still personalised.
- Use real airlines, real airport codes, realistic prices for the route and dates.
- Generate real airline booking URLs with origin, destination and dates as URL parameters.
- Generate real Booking.com URLs with destination and dates pre-filled.
- Generate real URLs for activities — venue websites, Google Maps, or booking pages.
- The whyThisUser field must reference something specific about this user. Never generic.
- The tripHeadline must feel personal and specific. Never generic.`;
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
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
    under200: "Under €200",
    b200to400: "€200–€400",
    b400to700: "€400–€700",
    over700: "€700+",
  };
  return map[budget] ?? budget;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { q, start, end, flex, budget, homeCity, travelsFor, destinationType } = body;

  if (!q || !start || !end || !flex || !budget) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userPrompt = buildUserPrompt({
    homeCity: homeCity || "Unknown",
    travelsFor: travelsFor || "general travel",
    destinationType: destinationType || "any destination",
    destination: q,
    dates: `${start} to ${end}`,
    flexibility: humaniseFlex(flex),
    interests: travelsFor || "general sightseeing",
    budget: humaniseBudget(budget),
  });

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
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach Anthropic API: ${err}` },
      { status: 502 }
    );
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text();
    return NextResponse.json(
      { error: `Anthropic API error ${anthropicRes.status}: ${text}` },
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

  let tripData: unknown;
  try {
    tripData = JSON.parse(extractJson(rawText));
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse trip JSON from model response: ${err}` },
      { status: 502 }
    );
  }

  return NextResponse.json(tripData);
}
