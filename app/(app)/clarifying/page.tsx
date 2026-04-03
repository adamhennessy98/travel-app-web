"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BudgetBucket, DateFlexibility } from "@/types/trip";

const FLEX_OPTIONS: { value: DateFlexibility; label: string }[] = [
  { value: "yesTotally", label: "Yes, totally flexible" },
  { value: "dayOrTwo", label: "A day or two either way" },
  { value: "fixed", label: "No, fixed dates" },
];

const BUDGET_OPTIONS: { value: BudgetBucket; label: string }[] = [
  { value: "under200", label: "Under €200" },
  { value: "b200to400", label: "€200 – €400" },
  { value: "b400to700", label: "€400 – €700" },
  { value: "over700", label: "€700+" },
];

const STEP_QUESTIONS = [
  "What dates are you thinking?",
  "Are you flexible on those dates?",
  "What's your budget for flights and accommodation?",
];

function SparkleIcon() {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </div>
  );
}

function ClarifyingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawQuery = searchParams.get("q") ?? "";

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);

  const flexValueRef = useRef<DateFlexibility>("yesTotally");
  const today = new Date().toISOString().split("T")[0];

  function handleDatesConfirm() {
    if (!startDate || !endDate) return;
    setAnswers([`${startDate} – ${endDate}`]);
    setStep(1);
  }

  function handleFlex(value: DateFlexibility, label: string) {
    flexValueRef.current = value;
    setAnswers((prev) => [...prev, label]);
    setStep(2);
  }

  function handleBudget(value: BudgetBucket, label: string) {
    setAnswers((prev) => [...prev, label]);
    const params = new URLSearchParams({
      q: rawQuery,
      start: startDate,
      end: endDate,
      flex: flexValueRef.current,
      budget: value,
    });
    setTimeout(() => router.push(`/results?${params.toString()}`), 300);
  }

  const percent = Math.round(((step + 1) / 3) * 100);

  return (
    // Break out of parent padding to go full-bleed
    <div className="-mx-6 -mt-10 -mb-10 h-[calc(100vh-4rem)] flex overflow-hidden">

      {/* ── Left: destination panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative h-full min-h-0 flex-col justify-end">
        {/* Background illustration */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Vintage travel excitement at the airport.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlay so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Destination label */}
        <div className="relative px-10 pb-10">
          <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-widest">
            Your destination
          </p>
          <h2 className="font-serif text-4xl font-bold text-white leading-tight">
            {rawQuery}
          </h2>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">
            Planning your bespoke escape starts with a few quick questions.
          </p>
        </div>
      </div>

      {/* ── Right: questions panel ── */}
      <div className="flex-1 lg:w-[45%] flex flex-col bg-surface overflow-y-auto">
        {/* Progress */}
        <div className="px-10 pt-10 pb-6 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
              Step {step + 1} of 3
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              {percent}% Complete
            </span>
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
          {/* Previous answers */}
          {answers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {answers.map((a, i) => (
                <span
                  key={i}
                  className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Assistant message */}
          <div className="flex gap-3 items-start">
            <SparkleIcon />
            <div className="bg-bg-page rounded-2xl rounded-tl-sm px-5 py-4 flex-1">
              <p className="text-text-primary font-medium leading-relaxed">
                {STEP_QUESTIONS[step]}
              </p>
            </div>
          </div>

          {/* Step 0 — Dates */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                    From
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                    To
                  </label>
                  <input
                    type="date"
                    min={startDate || today}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleDatesConfirm}
                disabled={!startDate || !endDate}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Confirm Dates
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Step 1 — Flexibility */}
          {step === 1 && (
            <div className="flex flex-col gap-2">
              {FLEX_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleFlex(value, label)}
                  className="w-full text-left bg-bg-page border border-border hover:border-primary hover:bg-primary/5 text-text-primary text-sm font-medium px-5 py-4 rounded-xl transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Budget */}
          {step === 2 && (
            <div className="flex flex-col gap-2">
              {BUDGET_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleBudget(value, label)}
                  className="w-full text-left bg-bg-page border border-border hover:border-primary hover:bg-primary/5 text-text-primary text-sm font-medium px-5 py-4 rounded-xl transition-all"
                >
                  {label}
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
