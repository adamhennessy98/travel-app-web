// ─── Clarifying flow ──────────────────────────────────────────────────────────

export type DateFlexibility = "yesTotally" | "dayOrTwo" | "fixed";
export type BudgetBucket = "under200" | "b200to400" | "b400to700" | "over700";
export type TravelCompanion = "solo" | "couple" | "friends" | "family";
export type TripVibe = "eating_out" | "culture" | "nightlife" | "outdoors" | "shopping";

export interface ClarifyingAnswers {
  startDate: string;
  endDate: string;
  flexibility?: DateFlexibility;     // travel trips only
  budget?: BudgetBucket;             // travel trips only
  companion: TravelCompanion;
  vibes?: TripVibe[];                // local trips only
  isLocal?: boolean;
}

// ─── Flights & Hotels (kept for backward compat) ─────────────────────────────

export interface FlightLayover {
  airport: string;   // IATA code e.g. "DXB"
  city: string;      // e.g. "Dubai"
  duration: string;  // e.g. "2h 15m"
}

export interface FlightOffer {
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  layovers: FlightLayover[];   // empty [] for direct flights
  price: number;
  currency: string;
  bookingUrl: string;
  isBestPick: boolean;
  bestPickReason: string;
}

export interface HotelOffer {
  name: string;
  neighbourhood: string;
  starRating: number;
  pricePerNight: number;
  currency: string;
  bookingUrl: string;
  isBestPick: boolean;
  bestPickReason: string;
}

// ─── Day-by-day itinerary ─────────────────────────────────────────────────────

export type TimeBlockType = "activity" | "restaurant" | "transport" | "free_time";
export type MealType = "breakfast" | "lunch" | "dinner";

export interface TimeBlock {
  type: TimeBlockType;
  startTime: string;           // e.g. "09:00"
  endTime: string;             // e.g. "11:00"
  title: string;
  description: string;
  location?: string;           // venue / area name
  estimatedCost?: number;      // per person
  currency?: string;
  travelFromPrevious?: string; // e.g. "12 min walk", "20 min metro"
  bookingUrl?: string;
  whyThisUser?: string;        // personalisation note
  mealType?: MealType;         // set when type === "restaurant"
  cuisine?: string;            // set when type === "restaurant"
}

export interface ItineraryDay {
  dayNumber: number;           // 1-indexed
  date: string;                // ISO date e.g. "2025-07-14"
  dayTitle: string;            // e.g. "Arrival & First Taste of Rome"
  dayNarrative: string;        // 1-2 sentence editorial intro
  timeBlocks: TimeBlock[];
}

// ─── Legacy flat result (kept for existing saved trips) ───────────────────────

export interface Activity {
  name: string;
  description: string;
  whyThisUser: string;
  url: string;
}

/** @deprecated Use ItineraryResult for new trips */
export interface TripResult {
  tripHeadline: string;
  flights: FlightOffer[];
  hotels: HotelOffer[];
  mustDos: Activity[];
  whileYoureThere: Activity[];
}

// ─── New itinerary result ─────────────────────────────────────────────────────

export interface ItineraryResult {
  tripHeadline: string;
  tripNarrative: string;        // 2-3 sentence editorial summary shown in hero
  isLocal: boolean;             // true = home city trip, no flights
  flights: FlightOffer[];       // empty array when isLocal
  hotels: HotelOffer[];         // empty array when isLocal
  days: ItineraryDay[];
}

// ─── Saved trip ───────────────────────────────────────────────────────────────

export interface SavedTrip {
  id: string;
  destinationLabel: string;
  rawQuery: string;
  answers: ClarifyingAnswers;
  flight?: FlightOffer;
  hotel?: HotelOffer;
  estimatedTotal: number;
  tripHeadline: string;
  /** v1 = legacy TripResult, v2 = ItineraryResult */
  itineraryVersion: 1 | 2;
  curatorPayload: TripResult | ItineraryResult;
  savedAt: string;
}

// ─── User profile ─────────────────────────────────────────────────────────────

export interface UserPreferences {
  homeCity: string;
  favouriteTravelReasons: string[];
  favouriteDestinationType: string;
}
