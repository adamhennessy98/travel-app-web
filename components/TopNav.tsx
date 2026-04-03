"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/saved", label: "Saved Trips" },
  { href: "/profile", label: "Profile" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-nav-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl font-bold text-primary tracking-tight"
        >
          YourWeekend
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {/* Avatar / sign out */}
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-surface rounded-xl border border-border shadow-lg py-1 z-50">
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-page transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
