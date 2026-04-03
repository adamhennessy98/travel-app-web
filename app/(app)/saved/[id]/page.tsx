"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flightSearchUrl, hotelSearchUrl, activitySearchUrl } from "@/lib/bookingUrls";
import type { FlightOffer, HotelOffer, Activity, TripResult } from "@/types/trip";

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(count)}{"☆".repeat(Math.max(0, 5 - count))}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-3">
      {children}
    </h2>
  );
}

function FlightCard({ flight, departDate }: { flight: FlightOffer; departDate: string }) {
  const bookUrl = flightSearchUrl(flight.origin, flight.destination, departDate);
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-text-primary">{flight.airline}</p>
          <p className="text-sm text-text-secondary mt-0.5">{flight.origin} → {flight.destination}</p>
        </div>
        <p className="text-lg font-extrabold text-text-primary shrink-0">{flight.currency} {flight.price}</p>
      </div>
      <div className="flex gap-4 text-sm text-text-secondary flex-wrap">
        <span>{flight.departureTime} – {flight.arrivalTime}</span>
        <span>·</span>
        <span>{flight.duration}</span>
        <span>·</span>
        <span>{flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
      </div>
      <a href={bookUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-primary hover:underline">Search on Skyscanner →</a>
    </div>
  );
}

function HotelCard({ hotel, checkin, checkout }: { hotel: HotelOffer; checkin: string; checkout: string }) {
  const bookUrl = hotelSearchUrl(hotel.name, checkin, checkout);
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-text-primary">{hotel.name}</p>
          <p className="text-sm text-text-secondary mt-0.5">{hotel.neighbourhood}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-text-primary">{hotel.currency} {hotel.pricePerNight}</p>
          <p className="text-xs text-text-secondary">per night</p>
        </div>
      </div>
      <StarRating count={hotel.starRating} />
      <a href={bookUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-primary hover:underline">Search on Booking.com →</a>
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
        <p className="text-xs text-primary font-medium italic">&ldquo;{activity.whyThisUser}&rdquo;</p>
      )}
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-primary hover:underline">Find on Google Maps →</a>
    </div>
  );
}

interface SavedTripDetail {
  destination_label: string;
  trip_headline: string;
  estimated_total: number;
  raw_query: string;
  answers: { startDate: string; endDate: string };
  flight: FlightOffer;
  hotel: HotelOffer;
  curator_payload: TripResult;
}

export default function SavedTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<SavedTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("saved_trips")
        .select("*")
        .eq("id", id)
        .single();
      setTrip(data as SavedTripDetail);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Remove this saved trip?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("saved_trips").delete().eq("id", id);
    router.push("/saved");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) return <p className="text-text-secondary">Trip not found.</p>;

  const payload = trip.curator_payload;

  return (
    <div className="max-w-3xl space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-text-accent uppercase mb-2">Saved trip</p>
          <h1 className="text-3xl font-extrabold text-text-primary leading-tight">{trip.trip_headline}</h1>
          <div className="flex gap-4 mt-3 text-sm text-text-secondary">
            {trip.answers?.startDate && (
              <span>{trip.answers.startDate} – {trip.answers.endDate}</span>
            )}
            <span className="text-primary font-bold">Est. €{Math.round(trip.estimated_total)}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>

      {/* Selected flight */}
      <section>
        <SectionHeading>Your flight</SectionHeading>
        <div className="max-w-sm">
          <FlightCard flight={trip.flight} departDate={trip.answers?.startDate ?? ""} />
        </div>
      </section>

      {/* Selected hotel */}
      <section>
        <SectionHeading>Your hotel</SectionHeading>
        <div className="max-w-sm">
          <HotelCard hotel={trip.hotel} checkin={trip.answers?.startDate ?? ""} checkout={trip.answers?.endDate ?? ""} />
        </div>
      </section>

      {/* Full results if available */}
      {payload?.mustDos?.length > 0 && (
        <section>
          <SectionHeading>Must dos</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {payload.mustDos.map((a, i) => <ActivityCard key={i} activity={a} destination={trip.raw_query} />)}
          </div>
        </section>
      )}

      {payload?.whileYoureThere?.length > 0 && (
        <section>
          <SectionHeading>While you&apos;re there</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payload.whileYoureThere.map((a, i) => <ActivityCard key={i} activity={a} destination={trip.raw_query} />)}
          </div>
        </section>
      )}
    </div>
  );
}
