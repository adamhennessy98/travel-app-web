"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SavedHeroImage } from "@/components/TravelPhoto";

const SUGGESTIONS = [
  "Surfing in Ericeira",
  "Jazz weekend in Paris",
  "Hiking the Dolomites",
  "Food tour in San Sebastián",
];

interface LastTrip {
  id: string;
  trip_headline: string;
  destination_label: string;
  answers: { startDate: string; endDate: string };
  estimated_total: number;
  hero_image_url?: string | null;
  hero_image_attribution?: {
    photographerName: string;
    photographerUrl: string;
    unsplashPhotoPageUrl: string;
  } | null;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [lastTrip, setLastTrip] = useState<LastTrip | null>(null);

  useEffect(() => {
    async function loadLastTrip() {
      const supabase = createClient();
      const { data } = await supabase
        .from("saved_trips")
        .select("id, trip_headline, destination_label, answers, estimated_total, hero_image_url, hero_image_attribution")
        .order("saved_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setLastTrip(data as LastTrip);
    }
    loadLastTrip();
  }, []);

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/clarifying?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="text-center mt-16 mb-12 max-w-2xl mx-auto">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-text-primary leading-tight mb-6">
          Design your{" "}
          <span className="text-primary italic">perfect</span>
          <br />
          escape.
        </h1>
        <p className="text-text-secondary text-lg">
          Tell us where you&apos;re headed — we&apos;ll handle the rest.
        </p>
      </div>

      {/* Search bar */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center bg-surface rounded-2xl shadow-sm border border-border px-5 py-1 gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 text-text-placeholder shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Where are you headed? e.g. Beer festival in Munich..."
            className="flex-1 py-4 text-[15px] text-text-primary placeholder:text-text-placeholder outline-none bg-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            Search
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
            </svg>
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                router.push(`/clarifying?q=${encodeURIComponent(s)}`);
              }}
              className="bg-surface border border-border text-text-secondary text-sm px-4 py-2 rounded-full hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Last saved trip */}
      {lastTrip && (
        <div className="w-full max-w-2xl mt-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-text-primary">
              Your last saved trip
            </h2>
            <Link href="/saved" className="text-sm text-primary font-medium hover:underline">
              View all saved trips →
            </Link>
          </div>

          <Link href={`/saved/${lastTrip.id}`}>
            <div className="bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                  <SavedHeroImage
                    heroUrl={lastTrip.hero_image_url}
                    heroAttribution={lastTrip.hero_image_attribution}
                    fallbackQuery={lastTrip.destination_label}
                    seed={lastTrip.id}
                    alt={lastTrip.destination_label}
                    className="h-full w-full"
                    showAttribution
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="font-serif text-2xl font-bold text-white leading-tight">
                    {lastTrip.trip_headline}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  {lastTrip.answers?.startDate && (
                    <p className="text-sm text-text-secondary">
                      {lastTrip.answers.startDate} – {lastTrip.answers.endDate}
                    </p>
                  )}
                </div>
                <p className="font-bold text-primary text-lg">
                  Est. €{Math.round(lastTrip.estimated_total)}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
