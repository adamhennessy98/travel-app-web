"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SavedHeroImage } from "@/components/TravelPhoto";

// ── Types ────────────────────────────────────────────────────────────────────

interface GeoCity {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string;
}

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

// ── Quick-pick chips ─────────────────────────────────────────────────────────

const QUICK_PICKS = [
  { label: "Paris",     city: "Paris",     country: "France" },
  { label: "Lisbon",    city: "Lisbon",    country: "Portugal" },
  { label: "Tokyo",     city: "Tokyo",     country: "Japan" },
  { label: "Barcelona", city: "Barcelona", country: "Spain" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  // Search
  const [query, setQuery]               = useState("");
  const [verified, setVerified]         = useState(false);
  const [suggestions, setSuggestions]   = useState<GeoCity[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSugs, setLoadingSugs]   = useState(false);
  const [activeIndex, setActiveIndex]   = useState(-1);
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Last trip
  const [lastTrip, setLastTrip] = useState<LastTrip | null>(null);

  // Close dropdown when clicking outside the search wrapper
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // Fetch last saved trip for the "pick up where you left off" card
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("saved_trips")
        .select(
          "id, trip_headline, destination_label, answers, estimated_total, hero_image_url, hero_image_attribution"
        )
        .order("saved_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setLastTrip(data as LastTrip);
    }
    load();
  }, []);

  // ── Geocoding ─────────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoadingSugs(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=6&language=en&format=json`
      );
      const data = await res.json();
      const results: GeoCity[] = (data.results ?? []).slice(0, 6);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoadingSugs(false);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleQueryChange(value: string) {
    setQuery(value);
    setVerified(false); // editing invalidates any prior selection
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 350);
  }

  function selectCity(city: GeoCity) {
    const display = `${city.name}, ${city.country}`;
    setQuery(display);
    setVerified(true);
    setSuggestions([]);
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          selectCity(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  }

  function handleSubmit() {
    if (!verified) return;
    router.push(`/clarifying?q=${encodeURIComponent(query)}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center w-full min-w-0 px-0">

      {/* Hero */}
      <div className="text-center mt-8 sm:mt-16 mb-8 sm:mb-12 max-w-2xl mx-auto px-1">
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary leading-tight mb-6">
          Design your{" "}
          <span className="text-primary italic">perfect</span>
          <br />
          escape.
        </h1>
        <p className="text-text-secondary text-lg">
          Tell us where you&apos;re headed — we&apos;ll handle the rest.
        </p>
      </div>

      {/* Search wrapper — relative so the dropdown is anchored here */}
      <div ref={searchWrapperRef} className="relative w-full max-w-2xl min-w-0">

        {/* Input bar */}
        <div className="flex flex-col sm:flex-row sm:items-center bg-surface rounded-2xl shadow-sm border border-border px-4 sm:px-5 py-3 sm:py-1 gap-3 sm:gap-3">

          {/* Icon: checkmark when verified, pin otherwise */}
          {verified ? (
            <svg
              className="w-5 h-5 text-primary shrink-0 transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-text-placeholder shrink-0 transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!verified && suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Where are you headed? e.g. Paris, Tokyo…"
            className="flex-1 py-4 text-[15px] text-text-primary placeholder:text-text-placeholder outline-none bg-transparent"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Spinner while fetching */}
          {loadingSugs && (
            <svg
              className="w-4 h-4 text-text-placeholder animate-spin shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}

          <button
            onClick={handleSubmit}
            disabled={!verified}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-xl transition-colors shrink-0 w-full sm:w-auto"
          >
            Search
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
            </svg>
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-2 bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
            {suggestions.map((city, i) => (
              <li key={city.id} className="first:pt-1 last:pb-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur firing before the click registers
                    e.preventDefault();
                    selectCity(city);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                    i === activeIndex
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-bg-page text-text-primary"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      i === activeIndex ? "text-primary" : "text-text-placeholder"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                    />
                  </svg>
                  <span>
                    <span className="font-medium">{city.name}</span>
                    {city.admin1 && city.admin1 !== city.name && (
                      <span className="text-text-secondary">, {city.admin1}</span>
                    )}
                    <span className="text-text-secondary">, {city.country}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Quick-pick chips */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center px-1">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.label}
              onClick={() => {
                const display = `${pick.city}, ${pick.country}`;
                setQuery(display);
                setVerified(true);
                setSuggestions([]);
                setShowDropdown(false);
                router.push(`/clarifying?q=${encodeURIComponent(display)}`);
              }}
              className="bg-surface border border-border text-text-secondary text-sm px-4 py-2 rounded-full hover:border-primary hover:text-primary transition-colors"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Last saved trip */}
      {lastTrip && (
        <div className="w-full max-w-2xl mt-12 sm:mt-16 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="font-serif text-xl font-bold text-text-primary">
              Your last saved trip
            </h2>
            <Link
              href="/saved"
              className="text-sm text-primary font-medium hover:underline shrink-0"
            >
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
                <div className="absolute bottom-4 left-4 right-4 sm:left-5 sm:right-5">
                  <p className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-3">
                    {lastTrip.trip_headline}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-4">
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
