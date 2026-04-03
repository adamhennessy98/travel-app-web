"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flightSearchUrl, hotelSearchUrl, activitySearchUrl } from "@/lib/bookingUrls";
import type { TripResult, FlightOffer, HotelOffer, Activity } from "@/types/trip";
import { TravelPhoto } from "@/components/TravelPhoto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(count)}{"☆".repeat(Math.max(0, 5 - count))}
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

// ─── Flight Card ──────────────────────────────────────────────────────────────

function FlightCard({
  flight, selected, onSelect, departDate,
}: {
  flight: FlightOffer; selected: boolean; onSelect: () => void; departDate: string;
}) {
  const bookUrl = flightSearchUrl(flight.origin, flight.destination, departDate);
  return (
    <div
      onClick={onSelect}
      className={`bg-surface rounded-2xl border p-5 cursor-pointer transition-all space-y-3 ${
        selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Selection indicator */}
      <div className="flex items-center justify-between">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-border"}`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
        <p className="text-xl font-extrabold text-text-primary">
          {flight.currency} {flight.price}
        </p>
      </div>

      <div>
        <p className="font-bold text-text-primary">{flight.airline}</p>
        <p className="text-sm text-text-secondary mt-0.5">
          {flight.origin} → {flight.destination}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
        <span>{flight.departureTime} – {flight.arrivalTime}</span>
        <span className="text-border">·</span>
        <span>{flight.duration}</span>
        <span className="text-border">·</span>
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
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Search Skyscanner
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────

function HotelCard({
  hotel, selected, onSelect, checkin, checkout, destination, photoSeed,
}: {
  hotel: HotelOffer; selected: boolean; onSelect: () => void;
  checkin: string; checkout: string; destination: string;
  photoSeed: string;
}) {
  const bookUrl = hotelSearchUrl(hotel.name, checkin, checkout);
  const imgKeyword = `${hotel.neighbourhood} ${destination}`;
  return (
    <div
      onClick={onSelect}
      className={`bg-surface rounded-2xl border overflow-hidden cursor-pointer transition-all ${
        selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <TravelPhoto
          query={imgKeyword}
          seed={photoSeed}
          alt={hotel.neighbourhood}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Selection dot */}
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "border-white bg-primary" : "border-white/70 bg-black/20"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <p className="absolute bottom-3 left-4 text-white text-xs font-semibold uppercase tracking-widest">
          {hotel.neighbourhood}
        </p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-text-primary leading-snug">{hotel.name}</p>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-text-primary">{hotel.currency} {hotel.pricePerNight}</p>
            <p className="text-xs text-text-secondary">/ night</p>
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
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Search Booking.com
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────

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
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Find on Google Maps
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState({ query }: { query: string }) {
  return (
    <div
      className="-mx-6 -mt-10 -mb-10 h-[calc(100vh-4rem)] relative flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)" }}
    >
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        <div className="w-12 h-12 border-4 border-white/70 border-t-white rounded-full animate-spin" />
        <div>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-2">Planning your escape</p>
          <h2 className="font-serif text-4xl font-bold text-white">{query}</h2>
        </div>
        <p className="text-white/50 text-sm max-w-xs">
          Finding flights, hotels, and hand-picked experiences just for you…
        </p>
      </div>
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

      fetch("/api/trip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q: searchParams.get("q") ?? "",
          start: searchParams.get("start") ?? "",
          end: searchParams.get("end") ?? "",
          flex: searchParams.get("flex") ?? "",
          budget: searchParams.get("budget") ?? "",
          homeCity,
          travelsFor,
          destinationType,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const result = data as TripResult;
          setTrip(result);
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
    const nights = start && end
      ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
      : 1;
    const estimatedTotal = flight.price + hotel.pricePerNight * nights;

    const photoQuery = rawQuery || trip.tripHeadline || "travel";
    let hero_image_url: string | null = null;
    let hero_image_thumb_url: string | null = null;
    let hero_image_attribution: Record<string, string> | null = null;
    try {
      const photoRes = await fetch(
        `/api/photos/search?q=${encodeURIComponent(photoQuery)}&seed=${encodeURIComponent(trip.tripHeadline || rawQuery || "save")}`,
      );
      if (photoRes.ok) {
        const p = (await photoRes.json()) as {
          url: string;
          thumbUrl: string;
          attribution: Record<string, string>;
        };
        if (p?.url) {
          hero_image_url = p.url;
          hero_image_thumb_url = p.thumbUrl ?? null;
          hero_image_attribution = p.attribution ?? null;
        }
      }
    } catch {
      /* hero image optional */
    }

    await supabase.from("saved_trips").insert({
      user_id: user.id,
      destination_label: trip.tripHeadline || rawQuery,
      raw_query: rawQuery,
      answers: { startDate: start, endDate: end, flexibility: searchParams.get("flex"), budget: searchParams.get("budget") },
      flight,
      hotel,
      estimated_total: estimatedTotal,
      trip_headline: trip.tripHeadline,
      curator_payload: trip,
      ...(hero_image_url
        ? {
            hero_image_url,
            hero_image_thumb_url,
            hero_image_attribution,
          }
        : {}),
    });

    setSaving(false);
    setSaved(true);
  }

  if (loading) return <LoadingState query={rawQuery} />;

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
    <div className="space-y-10">
      {/* ── Hero ── */}
      <div className="-mx-6 -mt-10 relative h-72 lg:h-96 overflow-hidden">
        <TravelPhoto
          query={rawQuery}
          seed={`hero-${trip.tripHeadline}`}
          alt={rawQuery}
          className="absolute inset-0 z-0"
          priority
          showAttribution
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Trip headline */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Your trip</p>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-white leading-tight max-w-xl">
              {trip.tripHeadline}
            </h1>
            {startDate && endDate && (
              <p className="text-white/70 text-sm mt-2">{startDate} – {endDate}</p>
            )}
          </div>
          <button
            onClick={saved ? () => router.push("/saved") : handleSave}
            disabled={saving}
            className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
              saved
                ? "bg-green-500 text-white"
                : "bg-white hover:bg-white/90 disabled:opacity-50 text-text-primary"
            }`}
          >
            {saved ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Saved — view trips
              </>
            ) : saving ? "Saving…" : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Save trip
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Flights + Hotels side by side ── */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Flights */}
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">
            Flights — select one
          </h2>
          <div className="space-y-3">
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
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">
            Where to stay — select one
          </h2>
          <div className="space-y-3">
            {trip.hotels.map((h, i) => (
              <HotelCard
                key={i}
                hotel={h}
                selected={selectedHotelIdx === i}
                onSelect={() => setSelectedHotelIdx(i)}
                checkin={startDate}
                checkout={endDate}
                destination={rawQuery}
                photoSeed={`hotel-${i}-${h.neighbourhood}-${h.name}`}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ── Activities ── */}
      <section>
        <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Must dos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trip.mustDos.map((a, i) => (
            <ActivityCard key={i} activity={a} destination={rawQuery} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">
          While you&apos;re there
        </h2>
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
