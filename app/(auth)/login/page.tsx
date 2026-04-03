"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // If session is null, email confirmation is required
      if (!data.session) {
        setConfirmationSent(true);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-xl font-extrabold text-text-primary mb-2">Check your email</h2>
        <p className="text-text-secondary text-sm mb-6">
          We sent a confirmation link to <span className="font-semibold text-text-primary">{email}</span>.
          Click it to activate your account, then come back here to sign in.
        </p>
        <button
          onClick={() => { setConfirmationSent(false); setIsSignUp(false); }}
          className="text-primary font-semibold text-sm hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-primary">
          YourWeekend
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {isSignUp ? "Create your account" : "Welcome back"}
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-bg-page border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-bg-page border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="text-primary font-semibold hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
