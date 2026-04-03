"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types/trip";

const TRAVEL_REASONS = ["Food & Drink", "Sport", "Culture", "Nightlife", "Nature", "Adventure"];
const DESTINATION_TYPES = ["City Break", "Beach", "Mountains", "Countryside", "Anywhere"];

// ─── Inline edit field ────────────────────────────────────────────────────────

function PrefRow({
  label,
  value,
  onSave,
  children,
}: {
  label: string;
  value: string;
  onSave?: (val: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
          {label}
        </p>
        {editing && onSave ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="flex-1 bg-bg-page border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(value); }}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        ) : children ? (
          <div className="mt-1">{children}</div>
        ) : (
          <p className="text-base font-bold text-text-primary">{value || "—"}</p>
        )}
      </div>
      {!editing && onSave && (
        <button
          onClick={() => { setEditing(true); setDraft(value); }}
          className="text-primary hover:text-primary-hover shrink-0 p-1"
          aria-label={`Edit ${label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setPrefs({
          homeCity: data.home_city,
          favouriteTravelReasons: data.favourite_travel_reasons ?? [],
          favouriteDestinationType: data.favourite_destination_type,
        });
      } else {
        // No row yet — show empty state ready to fill in
        setPrefs({ homeCity: "", favouriteTravelReasons: [], favouriteDestinationType: "" });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(updates: Partial<UserPreferences>) {
    if (!userId || !prefs) return;
    const merged = { ...prefs, ...updates };
    await supabase.from("user_preferences").upsert({
      id: userId,
      home_city: merged.homeCity,
      favourite_travel_reasons: merged.favouriteTravelReasons,
      favourite_destination_type: merged.favouriteDestinationType,
      updated_at: new Date().toISOString(),
    });
    setPrefs(merged);
  }

  async function toggleReason(reason: string) {
    if (!prefs) return;
    const current = prefs.favouriteTravelReasons;
    const updated = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason];
    await save({ favouriteTravelReasons: updated });
  }

  async function selectDestType(type: string) {
    await save({ favouriteDestinationType: type });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold text-text-primary mb-1">Profile</h1>
      <p className="text-text-secondary mb-8">
        This helps us personalise your trip recommendations.
      </p>

      <div className="bg-surface rounded-2xl border border-border px-6">
        {/* Home city */}
        <PrefRow
          label="Home city"
          value={prefs.homeCity}
          onSave={(val) => save({ homeCity: val })}
        />

        {/* Travel reasons */}
        <PrefRow label="Favourite reasons to travel" value="">
          <div className="flex flex-wrap gap-2 mt-1">
            {TRAVEL_REASONS.map((r) => {
              const selected = prefs.favouriteTravelReasons.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleReason(r)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </PrefRow>

        {/* Destination type */}
        <PrefRow label="Favourite destination type" value="">
          <div className="flex flex-wrap gap-2 mt-1">
            {DESTINATION_TYPES.map((d) => {
              const selected = prefs.favouriteDestinationType === d;
              return (
                <button
                  key={d}
                  onClick={() => selectDestType(d)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </PrefRow>
      </div>
    </div>
  );
}
