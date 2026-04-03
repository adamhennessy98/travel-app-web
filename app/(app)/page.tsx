"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/clarifying?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold text-text-primary mb-1">
        Where are you headed?
      </h1>
      <p className="text-text-secondary mb-8">
        Tell us about your trip and we&apos;ll plan it for you.
      </p>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={4}
          placeholder="e.g. I'm going to a beer festival in Munich on April 29th"
          className="w-full resize-none text-[15px] text-text-primary placeholder:text-text-placeholder outline-none leading-relaxed"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
