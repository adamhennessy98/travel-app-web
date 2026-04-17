"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BudgetBucket, DateFlexibility, TravelCompanion, TripVibe } from "@/types/trip";

// ─── Constants ────────────────────────────────────────────────────────────────

const FLEX_OPTIONS: { value: DateFlexibility; label: string }[] = [
  { value: "yesTotally", label: "Totally flexible" },
  { value: "dayOrTwo", label: "A day or two either way" },
  { value: "fixed", label: "Fixed dates" },
];

const BUDGET_OPTIONS: { value: BudgetBucket; label: string }[] = [
  { value: "under200", label: "Under €200" },
  { value: "b200to400", label: "€200 – €400" },
  { value: "b400to700", label: "€400 – €700" },
  { value: "over700", label: "€700+" },
];

const COMPANION_OPTIONS: { value: TravelCompanion; label: string; icon: string }[] = [
  { value: "solo",    label: "Just me",  icon: "🙋"      },
  { value: "couple",  label: "Couple",   icon: "💑"      },
  { value: "friends", label: "Friends",  icon: "🍻"      },
  { value: "family",  label: "Family",   icon: "👨‍👩‍👧" },
];

const VIBE_OPTIONS: { value: TripVibe; label: string; icon: string }[] = [
  { value: "eating_out", label: "Eating out", icon: "🍽️" },
  { value: "culture",    label: "Culture",    icon: "🏛️" },
  { value: "nightlife",  label: "Nightlife",  icon: "🎶" },
  { value: "outdoors",   label: "Outdoors",   icon: "🌿" },
  { value: "shopping",   label: "Shopping",   icon: "🛍️" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

function ContinueArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function ClarifyingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawQuery = searchParams.get("q") ?? "";

  const [isLocal, setIsLocal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function checkLocal() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("home_city")
          .eq("id", user.id)
          .single();
        if (prefs?.home_city) {
          const home = prefs.home_city.toLowerCase().trim();
          const dest = rawQuery.toLowerCase().trim();
          setIsLocal(dest === home || dest.includes(home) || home.includes(dest));
        }
      }
      setLoadingProfile(false);
    }
    checkLocal();
  }, [rawQuery]);

  // Travel: step 0 = dates + flex + budget, step 1 = companion  (2 steps)
  // Local:  step 0 = dates, step 1 = vibes, step 2 = companion  (3 steps)
  const totalSteps = isLocal ? 3 : 2;

  const [step, setStep] = useState(0);
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");
  const [selectedFlex, setSelectedFlex] = useState<DateFlexibility | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetBucket | null>(null);
  const [selectedVibes, setSelectedVibes]   = useState<TripVibe[]>([]);
  const [answers, setAnswers]           = useState<string[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const questions = isLocal
    ? ["What dates are you exploring?", "What do you want to get up to?", "Who's going?"]
    : ["Tell us about your trip.", "Who's going?"];

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Travel step 0 — confirm dates + flex + budget together
  function handleTravelStep0() {
    if (!startDate || !endDate || !selectedFlex || !selectedBudget) return;
    const flexLabel   = FLEX_OPTIONS.find((o) => o.value === selectedFlex)?.label ?? selectedFlex;
    const budgetLabel = BUDGET_OPTIONS.find((o) => o.value === selectedBudget)?.label ?? selectedBudget;
    setAnswers([`${startDate} – ${endDate}`, flexLabel, budgetLabel]);
    setStep(1);
  }

  // Local step 0 — dates only
  function handleLocalDates() {
    if (!startDate || !endDate) return;
    setAnswers([`${startDate} – ${endDate}`]);
    setStep(1);
  }

  // Local step 1 — vibes
  function toggleVibe(vibe: TripVibe) {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  }
  function handleVibesConfirm() {
    if (selectedVibes.length === 0) return;
    const label = selectedVibes
      .map((v) => VIBE_OPTIONS.find((o) => o.value === v)?.label ?? v)
      .join(", ");
    setAnswers((prev) => [...prev, label]);
    setStep(2);
  }

  // Final step — companion
  function handleCompanion(value: TravelCompanion) {
    const params = new URLSearchParams({
      q: rawQuery,
      start: startDate,
      end: endDate,
      companion: value,
      isLocal: String(isLocal),
    });
    if (!isLocal && selectedFlex && selectedBudget) {
      params.set("flex", selectedFlex);
      params.set("budget", selectedBudget);
    } else {
      params.set("vibes", selectedVibes.join(","));
    }
    setTimeout(() => router.push(`/results?${params.toString()}`), 300);
  }

  const percent = Math.round(((step + 1) / totalSteps) * 100);

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loadingProfile) {
    return (
      <div
        className="-mt-10 -mb-10 flex items-center justify-center"
        style={{ height: "calc(100vh - 4rem)", width: "100vw", marginLeft: "calc(50% - 50vw)" }}
      >
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="-mt-10 -mb-10 flex overflow-hidden"
      style={{ height: "calc(100vh - 4rem)", width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative h-full min-h-0 flex-col justify-end">
        <img
          src="/Vintage travel excitement at the airport.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative px-10 pb-10">
          {isLocal && (
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
              Local explorer
            </span>
          )}
          <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-widest">
            {isLocal ? "Exploring" : "Your destination"}
          </p>
          <h2 className="font-serif text-4xl font-bold text-white leading-tight">
            {rawQuery}
          </h2>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">
            {isLocal
              ? "Let's find the best of your city for your dates."
              : "Planning your bespoke escape starts with a few quick questions."}
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

          {/* Previous answers as chips */}
          {answers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {answers.map((a, i) => (
                <span key={i} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Assistant bubble */}
          <div className="flex gap-3 items-start">
            <SparkleIcon />
            <div className="bg-bg-page rounded-2xl rounded-tl-sm px-5 py-4 flex-1">
              <p className="text-text-primary font-medium leading-relaxed">
                {questions[step]}
              </p>
            </div>
          </div>

          {/* ── Travel step 0: Dates + Flexibility + Budget ── */}
          {step === 0 && !isLocal && (
            <div className="flex flex-col gap-6">

              {/* Dates */}
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

              {/* Flexibility */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  How flexible are you on these dates?
                </p>
                <div className="flex flex-wrap gap-2">
                  {FLEX_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedFlex(value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedFlex === value
                          ? "bg-primary text-white border-primary"
                          : "bg-bg-page border-border hover:border-primary hover:bg-primary/5 text-text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  What is your budget range for this trip?
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedBudget(value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedBudget === value
                          ? "bg-primary text-white border-primary"
                          : "bg-bg-page border-border hover:border-primary hover:bg-primary/5 text-text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTravelStep0}
                disabled={!startDate || !endDate || !selectedFlex || !selectedBudget}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ContinueArrow />
              </button>
            </div>
          )}

          {/* ── Local step 0: Dates only ── */}
          {step === 0 && isLocal && (
            <div className="flex flex-col gap-4">
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
                onClick={handleLocalDates}
                disabled={!startDate || !endDate}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Confirm Dates
                <ContinueArrow />
              </button>
            </div>
          )}

          {/* ── Local step 1: Vibes ── */}
          {step === 1 && isLocal && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {VIBE_OPTIONS.map(({ value, label, icon }) => {
                  const selected = selectedVibes.includes(value);
                  return (
                    <button key={value} onClick={() => toggleVibe(value)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : "bg-bg-page border-border hover:border-primary hover:bg-primary/5 text-text-primary"
                      }`}>
                      <span>{icon}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleVibesConfirm}
                disabled={selectedVibes.length === 0}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ContinueArrow />
              </button>
            </div>
          )}

          {/* ── Travel step 1 / Local step 2: Who's going ── */}
          {((step === 1 && !isLocal) || (step === 2 && isLocal)) && (
            <div className="grid grid-cols-2 gap-2">
              {COMPANION_OPTIONS.map(({ value, label, icon }) => (
                <button key={value} onClick={() => handleCompanion(value)}
                  className="flex flex-col items-center gap-2 bg-bg-page border border-border hover:border-primary hover:bg-primary/5 text-text-primary px-4 py-5 rounded-xl transition-all">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ClarifyingPage() {
  return (
    <Suspense>
      <ClarifyingContent />
    </Suspense>
  );
}
