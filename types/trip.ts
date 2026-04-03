export type DateFlexibility = "yesTotally" | "dayOrTwo" | "fixed";
export type BudgetBucket = "under200" | "b200to400" | "b400to700" | "over700";

export interface ClarifyingAnswers {
  startDate: string; // ISO date string e.g. "2025-04-29"
  endDate: string;
  flexibility: DateFlexibility;
  activitiesNote: string;
  budget: BudgetBucket;
}

export interface FlightOffer {
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
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

export interface Activity {
  name: string;
  description: string;
  whyThisUser: string;
  url: string;
}

export interface TripResult {
  tripHeadline: string;
  flights: FlightOffer[];
  hotels: HotelOffer[];
  mustDos: Activity[];
  whileYoureThere: Activity[];
}

export interface SavedTrip {
  id: string;
  destinationLabel: string;
  rawQuery: string;
  answers: ClarifyingAnswers;
  flight: FlightOffer;
  hotel: HotelOffer;
  estimatedTotal: number;
  tripHeadline: string;
  curatorPayload: TripResult;
  savedAt: string; // ISO timestamp
}

export interface UserPreferences {
  homeCity: string;
  favouriteTravelReasons: string[];
  favouriteDestinationType: string;
}
