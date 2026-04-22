import { Duffel } from "@duffel/api";
import type { FlightOffer, HotelOffer, FlightLayover } from "@/types/trip";

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Duffel | null = null;

function getClient(): Duffel {
  if (!_client) {
    const token = process.env.DUFFEL_API_KEY;
    if (!token) throw new Error("DUFFEL_API_KEY not configured");
    _client = new Duffel({ token });
  }
  return _client;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** "PT10H30M" → "10h 30m"  |  "PT45M" → "45m"  |  null → "" */
function isoToDuration(iso: string | null): string {
  if (!iso) return "";
  const h = parseInt(iso.match(/(\d+)H/)?.[1] ?? "0");
  const m = parseInt(iso.match(/(\d+)M/)?.[1] ?? "0");
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "2024-07-21T08:30:00" → "08:30" */
function isoToTime(iso: string): string {
  return iso.slice(11, 16);
}

// ─── IATA lookup ──────────────────────────────────────────────────────────────

/**
 * Look up the best-matching airport IATA code for a city or airport name.
 * Prefers results of type "airport"; falls back to any place with an IATA code.
 * Returns null on error or if no match found.
 */
export async function getIata(cityName: string): Promise<string | null> {
  try {
    const res = await getClient().suggestions.list({ query: cityName });
    const places = res.data ?? [];
    const airport = places.find((p) => p.type === "airport" && p.iata_code);
    if (airport?.iata_code) return airport.iata_code;
    const fallback = places.find((p) => p.iata_code);
    return fallback?.iata_code ?? null;
  } catch (err) {
    console.error("[duffel] getIata failed for", cityName, err);
    return null;
  }
}

// ─── Geocoding (Open-Meteo) ───────────────────────────────────────────────────

/**
 * Get latitude/longitude for a city name via the Open-Meteo geocoding API.
 * Returns null on error or if the city is not found.
 */
export async function getCoordinates(
  cityName: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
    const first = json?.results?.[0];
    if (!first) return null;
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}

// ─── Flight search ────────────────────────────────────────────────────────────

/**
 * Search for one-way economy flights from originIata → destIata on departDate.
 * Returns up to 4 FlightOffer objects sorted cheapest-first.
 * The cheapest offer is marked isBestPick=true.
 */
export async function searchFlights(
  originIata: string,
  destIata: string,
  departDate: string,
  numPassengers = 1
): Promise<FlightOffer[]> {
  const passengers = Array.from({ length: Math.max(1, numPassengers) }, () => ({
    type: "adult" as const,
  }));

  const res = await getClient().offerRequests.create({
    slices: [
      {
        origin: originIata,
        destination: destIata,
        departure_date: departDate,
        arrival_time: null,
        departure_time: null,
      },
    ],
    passengers,
    cabin_class: "economy",
    return_offers: true,
  });

  const offers = res.data?.offers ?? [];
  if (offers.length === 0) return [];

  // Sort cheapest first, cap at 4
  const sorted = [...offers].sort(
    (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
  );
  const picks = sorted.slice(0, Math.min(4, sorted.length));

  return picks.map((offer, i): FlightOffer => {
    const slice = offer.slices[0];
    const segs = slice?.segments ?? [];
    const first = segs[0];
    const last = segs[segs.length - 1];
    const stops = Math.max(0, segs.length - 1);

    // Build layovers from intermediate segment destinations
    const layovers: FlightLayover[] = segs.slice(0, -1).map((seg) => ({
      airport: seg.destination.iata_code ?? "",
      city: seg.destination.city_name,
      duration: isoToDuration(seg.duration),
    }));

    return {
      airline: offer.owner.name,
      origin: first?.origin.iata_code ?? originIata,
      destination: last?.destination.iata_code ?? destIata,
      departureTime: first ? isoToTime(first.departing_at) : "",
      arrivalTime: last ? isoToTime(last.arriving_at) : "",
      duration: isoToDuration(slice?.duration ?? null),
      stops,
      layovers,
      price: Math.round(parseFloat(offer.total_amount)),
      currency: offer.total_currency,
      bookingUrl: "",
      isBestPick: i === 0,
      bestPickReason: i === 0 ? "Cheapest option" : "",
    };
  });
}

// ─── Hotel search ─────────────────────────────────────────────────────────────

/**
 * Search for hotels within 10 km of lat/lng for the given date range.
 * Returns up to 4 HotelOffer objects sorted cheapest-first.
 * The cheapest is marked isBestPick=true.
 */
export async function searchStays(
  lat: number,
  lng: number,
  checkin: string,
  checkout: string,
  rooms = 1,
  guests = 1
): Promise<HotelOffer[]> {
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000
    )
  );

  const guestList = Array.from({ length: Math.max(1, guests) }, () => ({
    type: "adult" as const,
  }));

  const res = await getClient().stays.search({
    check_in_date: checkin,
    check_out_date: checkout,
    rooms: Math.max(1, rooms),
    guests: guestList,
    location: {
      geographic_coordinates: { latitude: lat, longitude: lng },
      radius: 10,
    },
  });

  const results = (res.data?.results ?? []).filter(
    (r) => r.cheapest_rate_total_amount
  );
  if (results.length === 0) return [];

  const sorted = [...results].sort(
    (a, b) =>
      parseFloat(a.cheapest_rate_total_amount) -
      parseFloat(b.cheapest_rate_total_amount)
  );
  const picks = sorted.slice(0, Math.min(4, sorted.length));

  return picks.map((r, i): HotelOffer => {
    const acc = r.accommodation;
    const total = parseFloat(r.cheapest_rate_total_amount);
    const perNight = Math.round(total / nights);
    const starRating = acc.rating ?? (acc.ratings?.[0]?.value ?? 3);

    return {
      name: acc.name,
      neighbourhood: acc.location.address.city_name ?? "",
      starRating: Math.min(5, Math.max(1, Math.round(starRating))),
      pricePerNight: perNight,
      currency: r.cheapest_rate_currency,
      bookingUrl: "",
      isBestPick: i === 0,
      bestPickReason: i === 0 ? "Best value" : "",
    };
  });
}

// ─── Summary helpers (for Claude prompt context) ──────────────────────────────

export function flightSummary(flights: FlightOffer[]): string {
  if (flights.length === 0) return "No flight data available.";
  return flights
    .map(
      (f, i) =>
        `${i + 1}. ${f.airline}: ${f.origin}→${f.destination}, departs ${f.departureTime} arrives ${f.arrivalTime}, ${f.duration}, ${f.stops === 0 ? "direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}, ${f.currency} ${f.price}${i === 0 ? " [cheapest]" : ""}`
    )
    .join("\n");
}

export function hotelSummary(hotels: HotelOffer[]): string {
  if (hotels.length === 0) return "No hotel data available.";
  return hotels
    .map(
      (h, i) =>
        `${i + 1}. ${h.name} (${h.neighbourhood}), ${"★".repeat(h.starRating)}, ${h.currency} ${h.pricePerNight}/night${i === 0 ? " [best value]" : ""}`
    )
    .join("\n");
}
