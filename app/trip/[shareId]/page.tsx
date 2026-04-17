import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { ItineraryResult, ItineraryDay, TimeBlock, FlightOffer, HotelOffer } from "@/types/trip";
import { flightSearchUrl, hotelSearchUrl } from "@/lib/bookingUrls";

// ─── Metadata (OG tags for WhatsApp / iMessage previews) ─────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ shareId: string }> }
): Promise<Metadata> {
  const { shareId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_trips")
    .select("trip_headline, raw_query, answers")
    .eq("share_id", shareId)
    .eq("is_shared", true)
    .single();

  if (!data) return { title: "YourWeekend" };

  const answers = data.answers as { startDate?: string; endDate?: string };
  const dates = answers?.startDate ? `${answers.startDate} – ${answers.endDate}` : "";
  const description = dates ? `${data.trip_headline} · ${dates}` : data.trip_headline;
  const heroKeyword = encodeURIComponent((data.raw_query ?? "").split(" ").slice(0, 3).join(" "));

  return {
    title: data.trip_headline,
    description,
    openGraph: {
      title: data.trip_headline,
      description,
      images: [`https://source.unsplash.com/featured/1200x630/?${heroKeyword},travel`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: data.trip_headline,
      description,
      images: [`https://source.unsplash.com/featured/1200x630/?${heroKeyword},travel`],
    },
  };
}

// ─── Time Block ───────────────────────────────────────────────────────────────

function BlockIcon({ type }: { type: TimeBlock["type"] }) {
  if (type === "restaurant") return <span className="text-lg">🍽️</span>;
  if (type === "transport") return <span className="text-lg">🚇</span>;
  if (type === "free_time") return <span className="text-lg">☀️</span>;
  return <span className="text-lg">📍</span>;
}

function PublicTimeBlock({ block, isLast }: { block: TimeBlock; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <BlockIcon type={block.type} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/10 mt-2" />}
      </div>
      <div className="flex-1 pb-6">
        {block.travelFromPrevious && block.travelFromPrevious !== "0 min" && (
          <p className="text-xs text-white/40 mb-2 -mt-1">{block.travelFromPrevious}</p>
        )}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold text-white/50">
                  {block.startTime}{block.endTime ? ` – ${block.endTime}` : ""}
                </span>
                {block.cuisine && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                    {block.cuisine}
                  </span>
                )}
              </div>
              <p className="font-bold text-white">{block.title}</p>
              {block.location && block.location !== block.title && (
                <p className="text-xs text-white/40 mt-0.5">{block.location}</p>
              )}
            </div>
            {block.estimatedCost != null && block.estimatedCost > 0 && (
              <p className="text-sm font-bold text-white/70 shrink-0">
                {block.currency ?? "€"}{block.estimatedCost}
              </p>
            )}
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{block.description}</p>
          {block.whyThisUser && (
            <p className="text-xs text-blue-300 font-medium italic">&ldquo;{block.whyThisUser}&rdquo;</p>
          )}
          {block.bookingUrl && (
            <a href={block.bookingUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">
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

function PublicDayCard({ day }: { day: ItineraryDay }) {
  return (
    <div className="space-y-0">
      <div className="mb-5">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-1">
          Day {day.dayNumber} · {day.date}
        </p>
        <h3 className="font-serif text-2xl font-bold text-white">{day.dayTitle}</h3>
        {day.dayNarrative && (
          <p className="text-sm text-white/60 mt-1 leading-relaxed">{day.dayNarrative}</p>
        )}
      </div>
      <div className="pl-2">
        {day.timeBlocks.map((block, i) => (
          <PublicTimeBlock key={i} block={block} isLast={i === day.timeBlocks.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SavedTripRow {
  id: string;
  trip_headline: string;
  raw_query: string;
  answers: { startDate?: string; endDate?: string; isLocal?: boolean };
  flight?: FlightOffer | null;
  hotel?: HotelOffer | null;
  curator_payload: ItineraryResult;
  itinerary_version: number;
}

export default async function SharedTripPage(
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("saved_trips")
    .select("id, trip_headline, raw_query, answers, flight, hotel, curator_payload, itinerary_version")
    .eq("share_id", shareId)
    .eq("is_shared", true)
    .single();

  if (!data) notFound();

  const trip = data as SavedTripRow;
  const payload = trip.curator_payload as ItineraryResult;
  const answers = trip.answers;
  const isLocal = answers?.isLocal ?? payload?.isLocal ?? false;
  const heroKeyword = encodeURIComponent((trip.raw_query ?? "").split(" ").slice(0, 3).join(" "));

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, #0f172a, #1e1e2e)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-md border-b border-white/10">
        <Link href="/" className="font-serif text-xl font-bold text-white">YourWeekend</Link>
        <Link href="/"
          className="text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 px-4 py-2 rounded-full transition-colors">
          Plan your own trip
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative h-80 lg:h-[28rem] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://source.unsplash.com/featured/1400x600/?${heroKeyword},travel,destination`}
          alt={trip.raw_query}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-12 pb-10">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Shared itinerary</p>
          <h1 className="font-serif text-3xl lg:text-5xl font-bold text-white leading-tight max-w-3xl">
            {trip.trip_headline}
          </h1>
          {answers?.startDate && (
            <p className="text-white/50 text-sm mt-3">{answers.startDate} – {answers.endDate}</p>
          )}
          {payload?.tripNarrative && (
            <p className="text-white/70 text-sm lg:text-base mt-3 max-w-2xl leading-relaxed">
              {payload.tripNarrative}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 space-y-12">

        {/* Flights */}
        {!isLocal && trip.flight && (
          <section>
            <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">Flight</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{trip.flight.airline}</p>
                  <p className="text-sm text-white/50">{trip.flight.origin} → {trip.flight.destination}</p>
                </div>
                <p className="text-xl font-extrabold text-white">{trip.flight.currency} {trip.flight.price}</p>
              </div>
              <p className="text-sm text-white/50">
                {trip.flight.departureTime} – {trip.flight.arrivalTime} · {trip.flight.duration} · {trip.flight.stops === 0 ? "Direct" : `${trip.flight.stops} stop`}
              </p>
              <a href={flightSearchUrl(trip.flight.origin, trip.flight.destination, answers?.startDate ?? "")}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300">
                Search Skyscanner
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </section>
        )}

        {/* Hotel */}
        {!isLocal && trip.hotel && (
          <section>
            <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">Hotel</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{trip.hotel.name}</p>
                  <p className="text-sm text-white/50">{trip.hotel.neighbourhood}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-white">{trip.hotel.currency} {trip.hotel.pricePerNight}</p>
                  <p className="text-xs text-white/40">/ night</p>
                </div>
              </div>
              <p className="text-yellow-400 text-sm">{"★".repeat(trip.hotel.starRating)}{"☆".repeat(Math.max(0, 5 - trip.hotel.starRating))}</p>
              <a href={hotelSearchUrl(trip.hotel.name, answers?.startDate ?? "", answers?.endDate ?? "")}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300">
                Search Booking.com
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </section>
        )}

        {/* Itinerary */}
        {payload?.days && payload.days.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-8">Day by day</h2>
            <div className="space-y-12">
              {payload.days.map((day) => (
                <PublicDayCard key={day.dayNumber} day={day} />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="border-t border-white/10 pt-10 text-center space-y-4">
          <p className="font-serif text-2xl font-bold text-white">Ready to plan your own escape?</p>
          <p className="text-white/50 text-sm">YourWeekend builds your perfect day-by-day itinerary in seconds.</p>
          <Link href="/"
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-white/90 font-semibold px-8 py-3.5 rounded-full transition-colors text-sm">
            Plan a trip
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
