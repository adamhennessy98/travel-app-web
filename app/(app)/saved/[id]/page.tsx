"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { flightSearchUrl, hotelSearchUrl, activitySearchUrl } from "@/lib/bookingUrls";
import type { FlightOffer, HotelOffer, Activity, TripResult } from "@/types/trip";
import { SavedHeroImage, TravelPhoto } from "@/components/TravelPhoto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(count)}{"☆".repeat(Math.max(0, 5 - count))}
    </span>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function FlightCard({ flight, departDate }: { flight: FlightOffer; departDate: string }) {
  const bookUrl = flightSearchUrl(flight.origin, flight.destination, departDate);
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-text-primary">{flight.airline}</p>
          <p className="text-sm text-text-secondary mt-0.5">{flight.origin} → {flight.destination}</p>
        </div>
        <p className="text-xl font-extrabold text-text-primary shrink-0">{flight.currency} {flight.price}</p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
        <span>{flight.departureTime} – {flight.arrivalTime}</span>
        <span>·</span>
        <span>{flight.duration}</span>
        <span>·</span>
        <span>{flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
      </div>
      <a href={bookUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        Search Skyscanner
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

function HotelCard({ hotel, checkin, checkout, destination, photoSeed }: {
  hotel: HotelOffer; checkin: string; checkout: string; destination: string;
  photoSeed: string;
}) {
  const bookUrl = hotelSearchUrl(hotel.name, checkin, checkout);
  const imgKeyword = `${hotel.neighbourhood} ${destination}`;
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="relative h-36 overflow-hidden">
        <TravelPhoto
          query={imgKeyword}
          seed={photoSeed}
          alt={hotel.neighbourhood}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-3 left-4 text-white text-xs font-semibold uppercase tracking-widest">
          {hotel.neighbourhood}
        </p>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-text-primary leading-snug">{hotel.name}</p>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-text-primary">{hotel.currency} {hotel.pricePerNight}</p>
            <p className="text-xs text-text-secondary">/ night</p>
          </div>
        </div>
        <StarRating count={hotel.starRating} />
        <a href={bookUrl} target="_blank" rel="noopener noreferrer"
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

function ActivityCard({ activity, destination }: { activity: Activity; destination: string }) {
  const mapsUrl = activitySearchUrl(activity.name, destination);
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-2">
      <p className="font-bold text-text-primary">{activity.name}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{activity.description}</p>
      {activity.whyThisUser && (
        <p className="text-xs text-primary font-medium italic">&ldquo;{activity.whyThisUser}&rdquo;</p>
      )}
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        Find on Google Maps
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SavedTripDetail {
  destination_label: string;
  trip_headline: string;
  estimated_total: number;
  raw_query: string;
  answers: { startDate: string; endDate: string };
  flight: FlightOffer;
  hotel: HotelOffer;
  curator_payload: TripResult;
  hero_image_url?: string | null;
  hero_image_attribution?: {
    photographerName: string;
    photographerUrl: string;
    unsplashPhotoPageUrl: string;
  } | null;
}

export default function SavedTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<SavedTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("saved_trips").select("*").eq("id", id).single();
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

  async function handleShare() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setSharing(true);
    const res = await fetch("/api/trip/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tripId: id }),
    });
    const data = await res.json();
    if (data.shareId) {
      const url = `${window.location.origin}/trip/${data.shareId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setSharing(false);
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
    <div className="space-y-10">
      {/* ── Hero ── */}
      <div className="-mx-4 sm:-mx-6 -mt-6 sm:-mt-10 relative h-56 sm:h-64 lg:h-80 overflow-hidden">
        <SavedHeroImage
          heroUrl={trip.hero_image_url}
          heroAttribution={trip.hero_image_attribution}
          fallbackQuery={trip.raw_query}
          seed={id}
          alt={trip.raw_query}
          className="absolute inset-0 z-0"
          showAttribution
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 sm:pb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <Link href="/saved" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-xs font-semibold mb-3 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M11.78 4.22a.75.75 0 010 1.06L7.06 10h3.69a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75v-5.5a.75.75 0 011.5 0v3.69l4.72-4.72a.75.75 0 011.06 0z" clipRule="evenodd" />
              </svg>
              Your escapes
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-xl break-words">
              {trip.trip_headline}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {trip.answers?.startDate && (
                <p className="text-white/70 text-sm">{trip.answers.startDate} – {trip.answers.endDate}</p>
              )}
              <p className="text-white font-extrabold">Est. €{Math.round(trip.estimated_total)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-2 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 px-4 py-2 rounded-full backdrop-blur-sm transition-colors"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : sharing ? "Generating…" : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
                  </svg>
                  Share
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-semibold text-white/60 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Flight + Hotel side by side ── */}
      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Your flight</h2>
          <FlightCard flight={trip.flight} departDate={trip.answers?.startDate ?? ""} />
        </section>
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Your hotel</h2>
          <HotelCard
            hotel={trip.hotel}
            checkin={trip.answers?.startDate ?? ""}
            checkout={trip.answers?.endDate ?? ""}
            destination={trip.raw_query}
            photoSeed={`saved-${id}-hotel`}
          />
        </section>
      </div>

      {/* ── Activities ── */}
      {payload?.mustDos?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Must dos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payload.mustDos.map((a, i) => <ActivityCard key={i} activity={a} destination={trip.raw_query} />)}
          </div>
        </section>
      )}

      {payload?.whileYoureThere?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">While you&apos;re there</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payload.whileYoureThere.map((a, i) => <ActivityCard key={i} activity={a} destination={trip.raw_query} />)}
          </div>
        </section>
      )}
    </div>
  );
}
