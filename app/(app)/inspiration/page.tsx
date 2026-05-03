"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowState = "form" | "finding" | "found";

interface DestinationResult {
  destination: string;
  start: string;
  end: string;
  reason: string;
}

// ─── Companion options ────────────────────────────────────────────────────────

const COMPANIONS = [
  { key: "solo",    label: "Solo" },
  { key: "couple",  label: "Couple" },
  { key: "friends", label: "Friends" },
  { key: "family",  label: "Family" },
];

// ─── Main content ─────────────────────────────────────────────────────────────

function InspirationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";

  // Flow state
  const [flowState, setFlowState]   = useState<FlowState>("form");
  const [result, setResult]         = useState<DestinationResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // Form state
  const [companion, setCompanion]   = useState<string | null>(null);
  const [groupSize, setGroupSize]   = useState(4);
  const [when, setWhen]             = useState("");
  const [nights, setNights]         = useState(5);
  const [budgetMin, setBudgetMin]   = useState("");
  const [budgetMax, setBudgetMax]   = useState("");
  const [budgetUnsure, setBudgetUnsure] = useState(false);
  const [extraContext, setExtraContext] = useState("");

  const canSubmit = companion !== null && when.trim().length > 0;

  // Auto-redirect after destination is found
  useEffect(() => {
    if (flowState !== "found" || !result || !companion) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q:         result.destination,
        start:     result.start,
        end:       result.end,
        companion,
        flex:      "flexible",
      });
      if (companion === "friends") params.set("groupSize", String(groupSize));
      if (!budgetUnsure && budgetMin) params.set("budgetMin", budgetMin);
      if (!budgetUnsure && budgetMax) params.set("budgetMax", budgetMax);
      if (budgetUnsure) params.set("budget", "unsure");

      router.push(`/results?${params}`);
    }, 2800);

    return () => clearTimeout(timer);
  }, [flowState, result, companion, groupSize, budgetMin, budgetMax, budgetUnsure, router]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canSubmit) return;
    setFlowState("finding");
    setError(null);

    try {
      const res = await fetch("/api/inspire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query:       rawQuery,
          companion,
          groupSize:   companion === "friends" ? groupSize : undefined,
          when,
          nights,
          budgetMin:   budgetUnsure ? "" : budgetMin,
          budgetMax:   budgetUnsure ? "" : budgetMax,
          extraContext: extraContext.trim(),
        }),
      });

      const data = (await res.json()) as DestinationResult & { error?: string };
      if (data.error) throw new Error(data.error);

      setResult(data);
      setFlowState("found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setFlowState("form");
    }
  }

  // ── Finding screen ──────────────────────────────────────────────────────────

  if (flowState === "finding") {
    return (
      <div
        className="-mt-10 -mb-10 flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
          height: "calc(100vh - 4rem)",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
        }}
      >
        <div className="flex flex-col items-center gap-5 text-center px-6">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">VOYA is thinking</p>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white">
              Finding your perfect destination…
            </h2>
          </div>
          <p className="text-white/50 text-sm max-w-xs leading-relaxed">
            Matching your vibe, budget, and timing to the right place at the right time
          </p>
        </div>
      </div>
    );
  }

  // ── Found screen ────────────────────────────────────────────────────────────

  if (flowState === "found" && result) {
    return (
      <div
        className="-mt-10 -mb-10 flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
          height: "calc(100vh - 4rem)",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
        }}
      >
        <div className="flex flex-col items-center gap-5 text-center px-6 max-w-lg">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
            We think you&apos;ll love
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white leading-tight">
            {result.destination}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            {result.reason}
          </p>
          <div className="flex items-center gap-2 text-white/40 text-sm mt-2">
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
            Building your itinerary…
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-16">

      {/* Hero */}
      <div
        className="-mt-10 relative overflow-hidden flex items-end"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #2563eb 100%)",
          height: "clamp(180px, 25vh, 260px)",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #f0f4f9)" }}
        />
        <div className="relative px-8 pb-12">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">
            Inspire me
          </p>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-white leading-tight">
            Let&apos;s find your perfect trip
          </h1>
          {rawQuery && (
            <p className="text-white/60 text-sm mt-2 max-w-md">
              You&apos;re looking for:{" "}
              <span className="text-white/90 italic">&ldquo;{rawQuery}&rdquo;</span>
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-8 max-w-xl">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <p className="font-semibold text-red-700 text-sm mb-0.5">Something went wrong</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Who's going */}
        <div>
          <p className="text-sm font-bold text-text-primary mb-3">Who&apos;s going?</p>
          <div className="flex flex-wrap gap-2">
            {COMPANIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCompanion(c.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                  companion === c.key
                    ? "bg-text-primary text-white border-text-primary"
                    : "bg-surface border-border text-text-secondary hover:border-text-primary/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Group size stepper */}
          {companion === "friends" && (
            <div className="mt-4 flex items-center gap-4">
              <p className="text-sm text-text-secondary">How many people?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGroupSize((g) => Math.max(2, g - 1))}
                  className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center font-bold text-text-primary hover:border-primary/40 transition-colors"
                >
                  −
                </button>
                <span className="text-lg font-bold text-text-primary w-6 text-center">
                  {groupSize}
                </span>
                <button
                  onClick={() => setGroupSize((g) => Math.min(12, g + 1))}
                  className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center font-bold text-text-primary hover:border-primary/40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* When */}
        <div>
          <label className="text-sm font-bold text-text-primary block mb-3">
            When are you thinking?
          </label>
          <input
            type="text"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="e.g. June 2026, late summer, end of July"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 text-sm transition-colors"
          />
        </div>

        {/* Nights stepper */}
        <div>
          <p className="text-sm font-bold text-text-primary mb-3">How many nights?</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setNights((n) => Math.max(2, n - 1))}
              className="w-10 h-10 rounded-full border border-border bg-surface flex items-center justify-center font-bold text-text-primary text-lg hover:border-primary/40 transition-colors"
            >
              −
            </button>
            <div className="text-center min-w-[3rem]">
              <span className="text-3xl font-extrabold text-text-primary">{nights}</span>
              <p className="text-xs text-text-secondary mt-0.5">nights</p>
            </div>
            <button
              onClick={() => setNights((n) => Math.min(14, n + 1))}
              className="w-10 h-10 rounded-full border border-border bg-surface flex items-center justify-center font-bold text-text-primary text-lg hover:border-primary/40 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Budget */}
        <div>
          <p className="text-sm font-bold text-text-primary mb-3">
            Budget{" "}
            <span className="font-normal text-text-secondary">(flights + hotel, total)</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
                €
              </span>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                disabled={budgetUnsure}
                placeholder="Min"
                className="w-full pl-7 pr-3 py-3 rounded-2xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 text-sm transition-colors disabled:opacity-40"
              />
            </div>
            <span className="text-text-secondary text-sm font-medium shrink-0">to</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
                €
              </span>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                disabled={budgetUnsure}
                placeholder="Max"
                className="w-full pl-7 pr-3 py-3 rounded-2xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 text-sm transition-colors disabled:opacity-40"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setBudgetUnsure((v) => !v);
              if (!budgetUnsure) { setBudgetMin(""); setBudgetMax(""); }
            }}
            className="flex items-center gap-2 mt-3 cursor-pointer"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                budgetUnsure ? "bg-primary border-primary" : "border-border bg-surface"
              }`}
            >
              {budgetUnsure && (
                <svg viewBox="0 0 10 8" className="w-3 h-3">
                  <path
                    d="M1 4l2.5 2.5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm text-text-secondary">Not sure yet</span>
          </button>
        </div>

        {/* Anything else */}
        <div>
          <label className="text-sm font-bold text-text-primary block mb-1">
            Anything else we should know?{" "}
            <span className="font-normal text-text-secondary">Optional</span>
          </label>
          <p className="text-xs text-text-secondary mb-3">
            Context that doesn&apos;t fit above — the more specific, the better.
          </p>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="e.g. I work for an airline so flights are cheap, travelling with a baby, need good nightlife, just want to completely switch off…"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 text-sm transition-colors resize-none"
          />
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-text-primary text-white hover:opacity-90"
        >
          Find my perfect trip →
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InspirationPage() {
  return (
    <Suspense>
      <InspirationContent />
    </Suspense>
  );
}
