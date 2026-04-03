"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BudgetBucket, DateFlexibility } from "@/types/trip";

type Sender = "assistant" | "user";
interface Message { sender: Sender; text: string; }

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

export default function ClarifyingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawQuery = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "What dates are you thinking?" },
  ]);
  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const flexValueRef = useRef<DateFlexibility>("yesTotally");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function pushAssistant(text: string) {
    setMessages((prev) => [...prev, { sender: "assistant", text }]);
  }
  function pushUser(text: string) {
    setMessages((prev) => [...prev, { sender: "user", text }]);
  }

  // Step 0 → confirm dates
  function handleDatesConfirm() {
    if (!startDate || !endDate) return;
    pushUser(`${startDate} – ${endDate}`);
    setStep(1);
    pushAssistant("Are you flexible on those dates?");
  }

  // Step 1 → pick flexibility
  function handleFlex(value: DateFlexibility, label: string) {
    flexValueRef.current = value;
    pushUser(label);
    setStep(2);
    pushAssistant("Roughly what is your budget for flights and accommodation?");
  }

  // Step 2 → pick budget → navigate to results
  function handleBudget(value: BudgetBucket, label: string) {
    pushUser(label);
    const params = new URLSearchParams({
      q: rawQuery,
      start: startDate,
      end: endDate,
      flex: flexValueRef.current,
      budget: value,
    });
    setTimeout(() => router.push(`/results?${params.toString()}`), 400);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-border mb-4 shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Plan your trip</h1>
        {rawQuery && (
          <p className="text-sm text-text-secondary mt-0.5 truncate">
            &ldquo;{rawQuery}&rdquo;
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.sender === "assistant"
                ? "bg-surface border border-border text-text-primary rounded-tl-sm"
                : "bg-primary text-white rounded-tr-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-4 border-t border-border space-y-3">
        {/* Step 0 — Date range */}
        {step === 0 && (
          <div className="flex items-end gap-3">
            <div className="flex-1 flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">From</label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">To</label>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <button
              onClick={handleDatesConfirm}
              disabled={!startDate || !endDate}
              className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              Confirm
            </button>
          </div>
        )}

        {/* Step 1 — Flexibility chips */}
        {step === 1 && (
          <div className="flex flex-wrap gap-2">
            {FLEX_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFlex(value, label)}
                className="bg-surface border border-border hover:border-primary hover:text-primary text-text-primary text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Budget chips */}
        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleBudget(value, label)}
                className="bg-surface border border-border hover:border-primary hover:text-primary text-text-primary text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-text-secondary tracking-wide">
            {step + 1} OF 3 QUESTIONS
          </span>
        </div>
      </div>
    </div>
  );
}
