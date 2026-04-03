"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SavedHeroImage } from "@/components/TravelPhoto";

interface SavedTripRow {
  id: string;
  destination_label: string;
  trip_headline: string;
  estimated_total: number;
  answers: { startDate: string; endDate: string };
  saved_at: string;
  hero_image_url?: string | null;
  hero_image_thumb_url?: string | null;
  hero_image_attribution?: {
    photographerName: string;
    photographerUrl: string;
    unsplashPhotoPageUrl: string;
  } | null;
}

export default function SavedPage() {
  const [trips, setTrips] = useState<SavedTripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("saved_trips")
        .select("id, destination_label, trip_headline, estimated_total, answers, saved_at")
        .order("saved_at", { ascending: false });
      setTrips((data as SavedTripRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 text-text-secondary opacity-40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <div>
          <p className="font-serif text-2xl font-bold text-text-primary">No saved trips yet</p>
          <p className="text-text-secondary text-sm mt-1">Save a trip from results to see it here.</p>
        </div>
        <Link
          href="/"
          className="bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
        >
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
          Your escapes
        </h1>
        <p className="text-text-secondary mt-1">{trips.length} saved {trips.length === 1 ? "trip" : "trips"}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/saved/${trip.id}`} className="group block min-w-0">
            <div className="bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                  <SavedHeroImage
                    heroUrl={trip.hero_image_url ?? trip.hero_image_thumb_url}
                    heroAttribution={trip.hero_image_attribution}
                    fallbackQuery={trip.destination_label}
                    seed={trip.id}
                    alt={trip.destination_label}
                    className="h-full w-full"
                    showAttribution
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-serif text-xl font-bold text-white leading-tight">
                    {trip.trip_headline}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-text-secondary">
                  {trip.answers?.startDate
                    ? `${trip.answers.startDate} – ${trip.answers.endDate}`
                    : "Dates TBC"}
                </p>
                <p className="font-extrabold text-primary">
                  €{Math.round(trip.estimated_total)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
