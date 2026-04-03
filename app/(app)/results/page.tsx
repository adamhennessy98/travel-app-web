"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flightSearchUrl, hotelSearchUrl, activitySearchUrl } from "@/lib/bookingUrls";
import type { TripResult, FlightOffer, HotelOffer, Activity } from "@/types/trip";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(count)}
      {"☆".repeat(Math.max(0, 5 - count))}
    </span>
  );
}

function BestPickBadge({ reason }: { reason: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full w-fit">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
        <path fillRule="evenodd" d="M8 1.75a.75.75 0 01.692.462l1.41 3.393 3.664.293a.75.75 0 01.428 1.317l-2.791 2.39.853 3.575a.75.75 0 01-1.12.814L8 11.82l-3.136 1.974a.75.75 0 01-1.12-.814l.852-3.574-2.79-2.39a.75.75 0 01.427-1.318l3.663-.293 1.41-3.393A.75.75 0 018 1.75z" clipRule="evenodd" />
      </svg>
      Best pick — {reason}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-3">
      {children}
    </h2>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function FlightCard({
  flight,
  selected,
  onSelect,
  departDate,
}: {
  flight: FlightOffer;
  selected: boolean;
  onSelect: () => void;
  departDate: string;
}) {
  const bookUrl = flightSearchUrl(flight.origin, flight.destination, departDate);
  return (
    <div
      onClick={onSelect}
      className={`bg-surface rounded-2xl border p-5 space-y-3 cursor-pointer transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : flight.isBestPick ? "border-primary/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-text-primary">{flight.airline}</p>
          <p className="text-sm text-text-secondary mt-0.5">
            {flight.origin} → {flight.destination}
          </p>
        </div>
        <p className="text-lg font-extrabold text-text-primary shrink-0">
          {flight.currency} {flight.price}
        </p>
      </div>
      <div className="flex gap-4 text-sm text-text-secondary flex-wrap">
        <span>{flight.departureTime} – {flight.arrivalTime}</span>
        <span>·</span>
        <span>{flight.duration}</span>
        <span>·</span>
        <span>{flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
      </div>
      {flight.isBestPick && flight.bestPickReason && (
        <BestPickBadge reason={flight.bestPickReason} />
      )}
      <a
        href={bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        Search on Skyscanner →
      </a>
    </div>
  );
}

function HotelCard({
  hotel,
  selected,
  onSelect,
  checkin,
  checkout,
}: {
  hotel: HotelOffer;
  selected: boolean;
  onSelect: () => void;
  checkin: string;
  checkout: string;
}) {
  const bookUrl = hotelSearchUrl(hotel.name, checkin, checkout);
  return (
    <div
      onClick={onSelect}
      className={`bg-surface rounded-2xl border p-5 space-y-3 cursor-pointer transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : hotel.isBestPick ? "border-primary/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-text-primary">{hotel.name}</p>
          <p className="text-sm text-text-secondary mt-0.5">{hotel.neighbourhood}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-text-primary">
            {hotel.currency} {hotel.pricePerNight}
          </p>
          <p className="text-xs text-text-secondary">per night</p>
        </div>
      </div>
      <StarRating count={hotel.starRating} />
      {hotel.isBestPick && hotel.bestPickReason && (
        <BestPickBadge reason={hotel.bestPickReason} />
      )}
      <a
        href={bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        Search on Booking.com →
      </a>
    </div>
  );
}

function ActivityCard({ activity, destination }: { activity: Activity; destination: string }) {
  const mapsUrl = activitySearchUrl(activity.name, destination);
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-2">
      <p className="font-bold text-text-primary">{activity.name}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{activity.description}</p>
      {activity.whyThisUser && (
        <p className="text-xs text-primary font-medium italic">
          &ldquo;{activity.whyThisUser}&rdquo;
        </p>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        Find on Google Maps →
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<TripResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";
  const rawQuery = searchParams.get("q") ?? "";
  const [selectedFlightIdx, setSelectedFlightIdx] = useState<number | null>(null);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchTrip() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let homeCity = "";
      let travelsFor = "";
      let destinationType = "";

      if (user) {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("home_city, favourite_travel_reasons, favourite_destination_type")
          .eq("id", user.id)
          .single();

        if (prefs) {
          homeCity = prefs.home_city ?? "";
          travelsFor = (prefs.favourite_travel_reasons as string[] ?? []).join(", ");
          destinationType = prefs.favourite_destination_type ?? "";
        }
      }

      const params = {
        q: searchParams.get("q") ?? "",
        start: searchParams.get("start") ?? "",
        end: searchParams.get("end") ?? "",
        flex: searchParams.get("flex") ?? "",
        budget: searchParams.get("budget") ?? "",
        homeCity,
        travelsFor,
        destinationType,
      };

      fetch("/api/trip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const result = data as TripResult;
          setTrip(result);
          // Pre-select best picks
          setSelectedFlightIdx(result.flights.findIndex((f) => f.isBestPick) ?? 0);
          setSelectedHotelIdx(result.hotels.findIndex((h) => h.isBestPick) ?? 0);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
    fetchTrip();
  }, [searchParams]);

  async function handleSave() {
    if (!trip || selectedFlightIdx === null || selectedHotelIdx === null) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const flight = trip.flights[selectedFlightIdx];
    const hotel = trip.hotels[selectedHotelIdx];
    const start = searchParams.get("start") ?? "";
    const end = searchParams.get("end") ?? "";

    // Calculate nights for total estimate
    const nights = start && end
      ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
      : 1;
    const estimatedTotal = flight.price + hotel.pricePerNight * nights;

    const rawQuery = searchParams.get("q") ?? "";
    const destinationLabel = trip.tripHeadline || rawQuery;

    await supabase.from("saved_trips").insert({
      user_id: user.id,
      destination_label: destinationLabel,
      raw_query: rawQuery,
      answers: {
        startDate: start,
        endDate: end,
        flexibility: searchParams.get("flex"),
        budget: searchParams.get("budget"),
      },
      flight,
      hotel,
      estimated_total: estimatedTotal,
      trip_headline: trip.tripHeadline,
      curator_payload: trip,
    });

    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Planning your trip…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="font-semibold text-red-700 mb-1">Something went wrong</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="max-w-3xl space-y-10">
      {/* Headline + save */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-text-accent uppercase mb-2">
            Your trip
          </p>
          <h1 className="text-3xl font-extrabold text-text-primary leading-tight">
            {trip.tripHeadline}
          </h1>
        </div>
        <button
          onClick={saved ? () => router.push("/saved") : handleSave}
          disabled={saving}
          className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-primary hover:bg-primary-hover disabled:opacity-50 text-white"
          }`}
        >
          {saved ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Saved — view trips
            </>
          ) : saving ? (
            "Saving…"
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Save trip
            </>
          )}
        </button>
      </div>

      {/* Flights */}
      <section>
        <SectionHeading>Flights — click to select</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trip.flights.map((f, i) => (
            <FlightCard
              key={i}
              flight={f}
              selected={selectedFlightIdx === i}
              onSelect={() => setSelectedFlightIdx(i)}
              departDate={startDate}
            />
          ))}
        </div>
      </section>

      {/* Hotels */}
      <section>
        <SectionHeading>Where to stay — click to select</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trip.hotels.map((h, i) => (
            <HotelCard
              key={i}
              hotel={h}
              selected={selectedHotelIdx === i}
              onSelect={() => setSelectedHotelIdx(i)}
              checkin={startDate}
              checkout={endDate}
            />
          ))}
        </div>
      </section>

      {/* Must dos */}
      <section>
        <SectionHeading>Must dos</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          {trip.mustDos.map((a, i) => (
            <ActivityCard key={i} activity={a} destination={rawQuery} />
          ))}
        </div>
      </section>

      {/* While you're there */}
      <section>
        <SectionHeading>While you&apos;re there</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trip.whileYoureThere.map((a, i) => (
            <ActivityCard key={i} activity={a} destination={rawQuery} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
