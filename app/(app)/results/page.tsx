"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flightSearchUrl, hotelSearchUrl } from "@/lib/bookingUrls";
import { TravelPhoto } from "@/components/TravelPhoto";
import type { ItineraryResult, FlightOffer, HotelOffer, TimeBlock, ItineraryDay } from "@/types/trip";

// ─── Icons ────────────────────────────────────────────────────────────────────

function BlockIcon({ type }: { type: TimeBlock["type"] }) {
  if (type === "restaurant") return (
    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-sm">🍽️</div>
  );
  if (type === "transport") return (
    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-sm">🚇</div>
  );
  if (type === "free_time") return (
    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 text-sm">☀️</div>
  );
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm">📍</div>
  );
}

// ─── Time Block ───────────────────────────────────────────────────────────────

function TimeBlockCard({ block, isLast }: { block: TimeBlock; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <BlockIcon type={block.type} />
        {!isLast && <div className="w-px flex-1 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
        {/* Travel connector */}
        {block.travelFromPrevious && block.travelFromPrevious !== "0 min" && (
          <p className="text-xs text-text-secondary mb-2 -mt-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04L7.25 12.388V1.75A.75.75 0 018 1z" clipRule="evenodd" />
            </svg>
            {block.travelFromPrevious}
          </p>
        )}

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-text-secondary">
                  {block.startTime}{block.endTime ? ` – ${block.endTime}` : ""}
                </span>
                {block.cuisine && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {block.cuisine}
                  </span>
                )}
              </div>
              <p className="font-bold text-text-primary">{block.title}</p>
              {block.location && block.location !== block.title && (
                <p className="text-xs text-text-secondary mt-0.5">{block.location}</p>
              )}
            </div>
            {block.estimatedCost != null && block.estimatedCost > 0 && (
              <p className="text-sm font-bold text-text-primary shrink-0">
                {block.currency ?? "€"}{block.estimatedCost}
              </p>
            )}
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">{block.description}</p>

          {block.whyThisUser && (
            <p className="text-xs text-primary font-medium italic">
              &ldquo;{block.whyThisUser}&rdquo;
            </p>
          )}

          {block.bookingUrl && (
            <a href={block.bookingUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Book
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({ day }: { day: ItineraryDay }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left group mb-4"
      >
        <div>
          <p className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-1">
            Day {day.dayNumber} · {day.date}
          </p>
          <h3 className="font-serif text-xl font-bold text-text-primary group-hover:text-primary transition-colors">
            {day.dayTitle}
          </h3>
          {day.dayNarrative && (
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">{day.dayNarrative}</p>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-5 h-5 text-text-secondary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="pl-2">
          {day.timeBlocks.map((block, i) => (
            <TimeBlockCard key={i} block={block} isLast={i === day.timeBlocks.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flight Card ──────────────────────────────────────────────────────────────

function FlightCard({ flight, selected, onSelect, departDate }: {
  flight: FlightOffer; selected: boolean; onSelect: () => void; departDate: string;
}) {
  const bookUrl = flightSearchUrl(flight.origin, flight.destination, departDate);
  return (
    <div onClick={onSelect}
      className={`bg-surface rounded-2xl border p-5 cursor-pointer transition-all space-y-3 ${selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-border"}`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
        <p className="text-xl font-extrabold text-text-primary">{flight.currency} {flight.price}</p>
      </div>
      <div>
        <p className="font-bold text-text-primary">{flight.airline}</p>
        <p className="text-sm text-text-secondary mt-0.5">{flight.origin} → {flight.destination}</p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
        <span>{flight.departureTime} – {flight.arrivalTime}</span>
        <span>·</span><span>{flight.duration}</span>
        <span>·</span><span>{flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
      </div>
      {flight.layovers && flight.layovers.length > 0 && (
        <p className="text-xs text-text-secondary">
          Via {flight.layovers.map((l) => `${l.city} · ${l.duration} layover`).join(" → ")}
        </p>
      )}
      {flight.isBestPick && flight.bestPickReason && (
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full w-fit">
          ⭐ Best pick — {flight.bestPickReason}
        </div>
      )}
      <a href={bookUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        Search Skyscanner
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────

function HotelCard({ hotel, selected, onSelect, checkin, checkout, destination }: {
  hotel: HotelOffer; selected: boolean; onSelect: () => void;
  checkin: string; checkout: string; destination: string;
}) {
  const bookUrl = hotelSearchUrl(hotel.name, checkin, checkout);
  return (
    <div onClick={onSelect}
      className={`bg-surface rounded-2xl border overflow-hidden cursor-pointer transition-all ${selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40"}`}>
      <div className="relative h-36 overflow-hidden">
        <img
          src="/hotel-headers.png"
          alt={hotel.neighbourhood}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-white bg-primary" : "border-white/70 bg-black/20"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <p className="absolute bottom-3 left-4 text-white text-xs font-semibold uppercase tracking-widest">{hotel.neighbourhood}</p>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-text-primary leading-snug">{hotel.name}</p>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-text-primary">{hotel.currency} {hotel.pricePerNight}</p>
            <p className="text-xs text-text-secondary">/ night</p>
          </div>
        </div>
        <span className="text-yellow-400 text-sm">{"★".repeat(hotel.starRating)}{"☆".repeat(Math.max(0, 5 - hotel.starRating))}</span>
        {hotel.isBestPick && hotel.bestPickReason && (
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full w-fit">
            ⭐ Best pick — {hotel.bestPickReason}
          </div>
        )}
        <a href={bookUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Search Booking.com
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState({ query }: { query: string }) {
  return (
    <div
      className="-mt-10 -mb-10 relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
        height: "calc(100vh - 4rem)",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
        <div className="w-12 h-12 border-4 border-white/70 border-t-white rounded-full animate-spin" />
        <div>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-2">Building your itinerary</p>
          <h2 className="font-serif text-4xl font-bold text-white">{query}</h2>
        </div>
        <p className="text-white/50 text-sm max-w-xs">
          Crafting a day-by-day plan with flights, hotels, restaurants, and experiences…
        </p>
      </div>
    </div>
  );
}

// ─── Results Content ──────────────────────────────────────────────────────────

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawQuery = searchParams.get("q") ?? "";
  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";
  const isLocal = searchParams.get("isLocal") === "true";

  const [trip, setTrip] = useState<ItineraryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlightIdx, setSelectedFlightIdx] = useState<number | null>(null);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchTrip() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let homeCity = "", travelsFor = "", destinationType = "";
      if (user) {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("home_city, favourite_travel_reasons, favourite_destination_type")
          .eq("id", user.id).single();
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
          q: rawQuery,
          start: startDate,
          end: endDate,
          flex: searchParams.get("flex") ?? "",
          budget: searchParams.get("budget") ?? "",
          budgetMin: searchParams.get("budgetMin") ?? "",
          budgetMax: searchParams.get("budgetMax") ?? "",
          companion: searchParams.get("companion") ?? "solo",
          groupSize: searchParams.get("groupSize") ?? "",
          vibes: searchParams.get("vibes") ?? "",
          isLocal: String(isLocal),
          isEvent: searchParams.get("isEvent") ?? "false",
          event: searchParams.get("event") ?? "",
          accommodation: searchParams.get("accommodation") ?? "",
          homeCity,
          travelsFor,
          destinationType,
        }),
      })
        .then(async (r) => {
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            throw new Error("Trip planning timed out — please try again.");
          }
        })
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const result = data as ItineraryResult;
          setTrip(result);
          if (result.flights.length > 0) {
            setSelectedFlightIdx(result.flights.findIndex((f) => f.isBestPick) ?? 0);
          }
          if (result.hotels.length > 0) {
            setSelectedHotelIdx(result.hotels.findIndex((h) => h.isBestPick) ?? 0);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
    fetchTrip();
  }, [searchParams, rawQuery, startDate, endDate, isLocal]);

  async function handleSave() {
    if (!trip) return;
    if (!isLocal && (selectedFlightIdx === null || selectedHotelIdx === null)) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const flight = selectedFlightIdx !== null ? trip.flights[selectedFlightIdx] : undefined;
    const hotel = selectedHotelIdx !== null ? trip.hotels[selectedHotelIdx] : undefined;

    const nights = startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
      : 1;
    const estimatedTotal = (flight?.price ?? 0) + (hotel?.pricePerNight ?? 0) * nights;

    await supabase.from("saved_trips").insert({
      user_id: user.id,
      destination_label: trip.tripHeadline || rawQuery,
      raw_query: rawQuery,
      answers: {
        startDate,
        endDate,
        flexibility: searchParams.get("flex"),
        budget: searchParams.get("budget"),
        companion: searchParams.get("companion"),
        isLocal,
      },
      flight: flight ?? null,
      hotel: hotel ?? null,
      estimated_total: estimatedTotal,
      trip_headline: trip.tripHeadline,
      itinerary_version: 2,
      curator_payload: trip,
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

  // ── Budget warning ────────────────────────────────────────────────────────
  const budgetParam    = searchParams.get("budget") ?? "";
  const budgetMaxParam = searchParams.get("budgetMax") ?? "";
  // Custom max from inputs takes priority; fall back to legacy bucket caps
  const BUDGET_CAPS: Record<string, number> = {
    under200: 200, b200to400: 400, b400to700: 700, over700: Infinity,
  };
  const budgetCap = budgetMaxParam
    ? parseInt(budgetMaxParam)
    : (BUDGET_CAPS[budgetParam] ?? Infinity);
  const budgetCapLabel = budgetMaxParam ? `€${budgetMaxParam}` : (
    { under200: "€200", b200to400: "€400", b400to700: "€700" }[budgetParam] ?? "stated"
  );
  const nights = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 1;
  const validFlights = trip.flights.map((f) => f.price).filter((p) => p > 0);
  const validHotels  = trip.hotels.map((h) => h.pricePerNight).filter((p) => p > 0);
  const minFlight    = validFlights.length > 0 ? Math.min(...validFlights) : 0;
  const minHotel     = validHotels.length  > 0 ? Math.min(...validHotels)  : 0;
  const estimatedMin = minFlight + minHotel * nights;
  const showBudgetWarning =
    !isLocal &&
    budgetParam !== "unsure" &&
    budgetCap < Infinity &&
    estimatedMin > 0 &&
    estimatedMin > budgetCap * 1.3;

  return (
    <div className="space-y-10">

      {/* ── Hero ── */}
      <div
        className="-mt-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #2563eb 100%)",
          height: "clamp(280px, 40vh, 420px)",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
        }}
      >
        {/* Fade the bottom edge into the page background */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #f0f4f9)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-20 flex items-end justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Your itinerary</p>
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-white leading-tight max-w-2xl">
              {trip.tripHeadline}
            </h1>
            {trip.tripNarrative && (
              <p className="text-white/70 text-sm mt-2 max-w-xl leading-relaxed">{trip.tripNarrative}</p>
            )}
            {startDate && endDate && (
              <p className="text-white/50 text-sm mt-1">{startDate} – {endDate}</p>
            )}
          </div>
          <button
            onClick={saved ? () => router.push("/saved") : handleSave}
            disabled={saving}
            className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
              saved ? "bg-green-500 text-white" : "bg-white hover:bg-white/90 disabled:opacity-50 text-text-primary"
            }`}
          >
            {saved ? (
              <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>Saved — view trips</>
            ) : saving ? "Saving…" : (
              <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>Save itinerary</>
            )}
          </button>
        </div>
      </div>

      {/* ── Budget warning ── */}
      {showBudgetWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <span className="text-lg shrink-0" aria-hidden>⚠️</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Heads up on budget</p>
            <p className="text-amber-700 text-sm mt-0.5 leading-relaxed">
              The cheapest options we found come to around{" "}
              <span className="font-bold">€{Math.round(estimatedMin)}</span>
              {" "}— over your {budgetCapLabel} budget.
              We&apos;ve picked the best value available.
            </p>
          </div>
        </div>
      )}

      {/* ── Flights (hidden for local trips or when none returned) ── */}
      {!isLocal && !trip.isLocal && trip.flights.length > 0 && trip.flights.some(f => f.price > 0) && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Flights — select one</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.flights.map((f, i) => (
              <FlightCard key={i} flight={f} selected={selectedFlightIdx === i}
                onSelect={() => setSelectedFlightIdx(i)} departDate={startDate} />
            ))}
          </div>
        </section>
      )}

      {/* ── Hotels (hidden for local trips) ── */}
      {!isLocal && !trip.isLocal && trip.hotels.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Where to stay — select one</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.hotels.map((h, i) => (
              <HotelCard key={i} hotel={h} selected={selectedHotelIdx === i}
                onSelect={() => setSelectedHotelIdx(i)}
                checkin={startDate} checkout={endDate} destination={rawQuery} />
            ))}
          </div>
        </section>
      )}

      {/* ── Day-by-day itinerary ── */}
      {trip.days && trip.days.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-6">Your itinerary</h2>
          <div className="space-y-8">
            {trip.days.map((day) => (
              <div key={day.dayNumber} className="bg-bg-page rounded-2xl p-6">
                <DayCard day={day} />
              </div>
            ))}
          </div>
        </section>
      )}
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
