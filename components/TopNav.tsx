"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/saved", label: "Saved Trips" },
  { href: "/profile", label: "Profile" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-nav-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center">
          <img
            src="/VOYA-logo.png"
            alt="VOYA"
            className="h-10 sm:h-12 w-auto"
          />
        </Link>

        {/* Desktop nav */}
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

          <div className="relative ml-2">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-surface rounded-xl border border-border shadow-lg py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-page transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden p-2 -mr-2 rounded-lg text-text-primary hover:bg-bg-page transition-colors shrink-0"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 sm:top-16 z-40 bg-black/40 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 md:hidden border-t border-border bg-surface shadow-lg max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col">
              {navLinks.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-bg-page"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="text-left px-3 py-3 rounded-xl text-base font-medium text-text-secondary hover:bg-bg-page hover:text-text-primary transition-colors mt-1 border-t border-border pt-4"
              >
                Sign out
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
