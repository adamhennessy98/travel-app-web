"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SavedTripRow {
  id: string;
  destination_label: string;
  trip_headline: string;
  estimated_total: number;
  answers: { startDate: string; endDate: string };
  saved_at: string;
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
          <p className="font-bold text-text-primary text-lg">No saved trips yet</p>
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
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold text-text-primary mb-8">Saved trips</h1>
      <div className="space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/saved/${trip.id}`}
            className="flex items-center justify-between bg-surface border border-border rounded-2xl px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="min-w-0">
              <p className="font-bold text-text-primary truncate">{trip.destination_label}</p>
              <p className="text-sm text-text-secondary mt-0.5">
                {trip.answers?.startDate && trip.answers?.endDate
                  ? `${trip.answers.startDate} – ${trip.answers.endDate}`
                  : "Dates TBC"}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <p className="text-primary font-extrabold">
                €{Math.round(trip.estimated_total)}
              </p>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
