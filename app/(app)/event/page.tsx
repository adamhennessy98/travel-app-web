"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TravelCompanion } from "@/types/trip";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccomPref = "near_venue" | "city_centre" | "best_value";

// ─── Known event dates (updated annually) ────────────────────────────────────

const KNOWN_EVENT_DATES: Record<string, { start: string; end: string }> = {
  "oktoberfest":                    { start: "2026-09-19", end: "2026-10-04" },
  "formula 1 monaco grand prix":    { start: "2026-05-21", end: "2026-05-24" },
  "tomorrowland music festival":    { start: "2026-07-17", end: "2026-07-19" },
  "venice carnival":                { start: "2026-02-07", end: "2026-02-17" },
};

function getSuggestedDates(event: string): { start: string; end: string } | null {
  const key = event.toLowerCase().trim();
  return KNOWN_EVENT_DATES[key] ?? null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOM_OPTIONS: { value: AccomPref; icon: string; label: string; desc: string }[] = [
  {
    value: "near_venue",
    icon: "🏨",
    label: "Near the venue",
    desc: "Walk straight there, no stress on the day",
  },
  {
    value: "city_centre",
    icon: "🏙️",
    label: "City centre",
    desc: "Better base, short commute to the event",
  },
  {
    value: "best_value",
    icon: "💰",
    label: "Best value",
    desc: "VOYA picks the best deal available",
  },
];

const COMPANION_OPTIONS: {
  value: TravelCompanion;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { value: "solo",    label: "Just me",  icon: "🙋", desc: "Single room"          },
  { value: "couple",  label: "Couple",   icon: "💑", desc: "Double room"          },
  { value: "friends", label: "Friends",  icon: "🍻", desc: "Multiple rooms"       },
  { value: "family",  label: "Family",   icon: "👨‍👩‍👧", desc: "Family room"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ContinueArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function EventContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventName   = searchParams.get("event") ?? "";
  const destination = searchParams.get("q") ?? "";

  const suggested = getSuggestedDates(eventName);
  const today = new Date().toISOString().split("T")[0];

  // Step state
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  // Step 0 — dates
  const [startDate, setStartDate] = useState(suggested?.start ?? "");
  const [endDate, setEndDate]     = useState(suggested?.end ?? "");

  // Step 1 — budget + accommodation
  const [budgetMin, setBudgetMin]       = useState("");
  const [budgetMax, setBudgetMax]       = useState("");
  const [budgetUnsure, setBudgetUnsure] = useState(false);
  const [accom, setAccom]               = useState<AccomPref | null>(null);

  // Step 2 — companion + group size
  const [companion, setCompanion]   = useState<TravelCompanion | null>(null);
  const [groupSize, setGroupSize]   = useState(2);

  // Summary chips shown above each step
  const [answers, setAnswers] = useState<string[]>([]);

  const budgetValid = budgetUnsure || (budgetMin !== "" && budgetMax !== "");
  const percent = Math.round(((step + 1) / totalSteps) * 100);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleDates() {
    if (!startDate || !endDate) return;
    setAnswers([`${startDate} – ${endDate}`]);
    setStep(1);
  }

  function handleStep1() {
    if (!budgetValid || !accom) return;
    const budgetLabel = budgetUnsure ? "Flexible budget" : `€${budgetMin} – €${budgetMax}`;
    const accomLabel  = ACCOM_OPTIONS.find((o) => o.value === accom)?.label ?? accom;
    setAnswers((prev) => [...prev, budgetLabel, accomLabel]);
    setStep(2);
  }

  function handleCompanion(value: TravelCompanion) {
    setCompanion(value);
    // For non-friends, navigate immediately
    if (value !== "friends") {
      navigate(value, groupSize);
    }
    // For friends, wait for group size confirmation via button
  }

  function navigate(comp: TravelCompanion, size: number) {
    const params = new URLSearchParams({
      q:             destination,
      event:         eventName,
      start:         startDate,
      end:           endDate,
      companion:     comp,
      accommodation: accom ?? "best_value",
      isEvent:       "true",
    });
    if (comp === "friends") params.set("groupSize", String(size));
    if (budgetUnsure) {
      params.set("budget", "unsure");
    } else {
      params.set("budgetMin", budgetMin);
      params.set("budgetMax", budgetMax);
    }
    router.push(`/results?${params.toString()}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="-mt-10 -mb-10 flex overflow-hidden"
      style={{ height: "calc(100vh - 4rem)", width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative h-full min-h-0 flex-col justify-end">
        <img
          src="/Firefly_coast.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative px-10 pb-10">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
            🎪 Event trip
          </span>
          <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-widest">
            You&apos;re going to
          </p>
          <h2 className="font-serif text-4xl font-bold text-white leading-tight">
            {eventName}
          </h2>
          <p className="text-white/60 text-sm mt-1">{destination}</p>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">
            We&apos;ll build your whole trip around the event.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 lg:w-[45%] flex flex-col bg-surface overflow-y-auto">

        {/* Progress bar */}
        <div className="px-10 pt-10 pb-6 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-xs font-semibold text-text-secondary">{percent}% Complete</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-10 py-8 flex flex-col gap-6">

          {/* Answer chips */}
          {answers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {answers.map((a, i) => (
                <span key={i} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* ── Step 0: Dates ── */}
          {step === 0 && (
            <>
              <div className="flex gap-3 items-start">
                <SparkleIcon />
                <div className="bg-bg-page rounded-2xl rounded-tl-sm px-5 py-4 flex-1">
                  <p className="text-text-primary font-medium leading-relaxed">
                    When are you going?
                    {suggested && (
                      <span className="block text-sm text-primary font-normal mt-1">
                        We&apos;ve pre-filled the {new Date(suggested.start).getFullYear()} dates — adjust if needed.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">From</label>
                  <input
                    type="date" min={today} value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">To</label>
                  <input
                    type="date" min={startDate || today} value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleDates}
                disabled={!startDate || !endDate}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Confirm dates
                <ContinueArrow />
              </button>
            </>
          )}

          {/* ── Step 1: Budget + Accommodation ── */}
          {step === 1 && (
            <>
              <div className="flex gap-3 items-start">
                <SparkleIcon />
                <div className="bg-bg-page rounded-2xl rounded-tl-sm px-5 py-4 flex-1">
                  <p className="text-text-primary font-medium leading-relaxed">
                    What&apos;s your budget, and where do you want to stay?
                  </p>
                </div>
              </div>

              {/* Budget */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Budget for flights + accommodation
                </p>
                <div className={`flex gap-3 items-end transition-opacity ${budgetUnsure ? "opacity-40 pointer-events-none" : ""}`}>
                  <div className="flex-1">
                    <label className="block text-xs text-text-secondary mb-1.5">Min (€)</label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <span className="text-text-secondary font-medium pb-3">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-text-secondary mb-1.5">Max (€)</label>
                    <input
                      type="number" min="0" placeholder="1000"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setBudgetUnsure((v) => !v); setBudgetMin(""); setBudgetMax(""); }}
                    className={`shrink-0 text-sm font-medium px-4 py-3 rounded-xl border transition-all ${
                      budgetUnsure
                        ? "bg-primary text-white border-primary"
                        : "bg-bg-page border-border text-text-secondary hover:border-primary/60 hover:text-text-primary"
                    }`}
                  >
                    Not sure
                  </button>
                </div>
              </div>

              {/* Accommodation preference */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Where do you want to stay?
                </p>
                <div className="flex flex-col gap-2">
                  {ACCOM_OPTIONS.map(({ value, icon, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccom(value)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                        accom === value
                          ? "bg-primary text-white border-primary"
                          : "bg-bg-page border-border hover:border-primary/40 text-text-primary"
                      }`}
                    >
                      <span className="text-xl shrink-0">{icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{label}</p>
                        <p className={`text-xs mt-0.5 ${accom === value ? "text-white/70" : "text-text-secondary"}`}>
                          {desc}
                        </p>
                      </div>
                      {accom === value && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-auto shrink-0">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStep1}
                disabled={!budgetValid || !accom}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ContinueArrow />
              </button>
            </>
          )}

          {/* ── Step 2: Who's going ── */}
          {step === 2 && (
            <>
              <div className="flex gap-3 items-start">
                <SparkleIcon />
                <div className="bg-bg-page rounded-2xl rounded-tl-sm px-5 py-4 flex-1">
                  <p className="text-text-primary font-medium leading-relaxed">
                    Who&apos;s going?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {COMPANION_OPTIONS.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => handleCompanion(value)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-5 rounded-xl border transition-all ${
                      companion === value
                        ? "bg-primary text-white border-primary"
                        : "bg-bg-page border-border hover:border-primary hover:bg-primary/5 text-text-primary"
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-semibold">{label}</span>
                    <span className={`text-xs ${companion === value ? "text-white/70" : "text-text-secondary"}`}>
                      {desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* Group size — only shown when Friends is selected */}
              {companion === "friends" && (
                <div className="bg-bg-page border border-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-text-primary mb-4">How many people in the group?</p>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => setGroupSize((n) => Math.max(2, n - 1))}
                      className="w-10 h-10 rounded-full border border-border bg-surface hover:border-primary hover:text-primary text-text-primary text-xl font-bold transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[3rem]">
                      <p className="text-3xl font-bold text-text-primary">{groupSize}</p>
                      <p className="text-xs text-text-secondary mt-0.5">people</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGroupSize((n) => Math.min(12, n + 1))}
                      className="w-10 h-10 rounded-full border border-border bg-surface hover:border-primary hover:text-primary text-text-primary text-xl font-bold transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => navigate("friends", groupSize)}
                    className="mt-5 w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Find our trip
                    <ContinueArrow />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventPage() {
  return (
    <Suspense>
      <EventContent />
    </Suspense>
  );
}
