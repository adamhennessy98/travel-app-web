"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type TravelPhotoData = {
  url: string;
  thumbUrl: string;
  attribution: {
    photographerName: string;
    photographerUrl: string;
    unsplashPhotoPageUrl: string;
  };
};

type Status = "idle" | "loading" | "ready" | "empty";

export function TravelPhoto({
  query,
  seed,
  alt,
  className,
  imageClassName,
  priority,
  showAttribution,
}: {
  query: string;
  seed: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Show small credit link (Unsplash guideline). */
  showAttribution?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [photo, setPhoto] = useState<TravelPhotoData | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setStatus("empty");
      setPhoto(null);
      return;
    }

    const ac = new AbortController();
    setStatus("loading");
    setPhoto(null);

    const u = new URL("/api/photos/search", window.location.origin);
    u.searchParams.set("q", query);
    u.searchParams.set("seed", seed);

    fetch(u.toString(), { signal: ac.signal })
      .then(async (res) => {
        if (res.status === 503 || res.status === 404) {
          setPhoto(null);
          setStatus("empty");
          return;
        }
        if (!res.ok) {
          setPhoto(null);
          setStatus("empty");
          return;
        }
        const data = (await res.json()) as TravelPhotoData;
        if (!data?.url) {
          setPhoto(null);
          setStatus("empty");
          return;
        }
        setPhoto(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setPhoto(null);
        setStatus("empty");
      });

    return () => ac.abort();
  }, [query, seed]);

  return (
    <div className={`relative h-full w-full min-h-[4rem] overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${className ?? ""}`}>
      {(status === "idle" || status === "loading") && (
        <div className="absolute inset-0 animate-pulse bg-zinc-300/80 dark:bg-zinc-700/80" aria-hidden />
      )}
      {status === "empty" && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-900" aria-hidden />
      )}
      {photo && (
        <>
          <Image
            src={photo.url}
            alt={alt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover ${imageClassName ?? ""}`}
          />
          {showAttribution && (
            <a
              href={photo.attribution.unsplashPhotoPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1 right-1 z-10 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm hover:bg-black/60"
            >
              {photo.attribution.photographerName} / Unsplash
            </a>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Renders a saved hero URL when present; otherwise loads via TravelPhoto.
 */
export function SavedHeroImage({
  heroUrl,
  heroAttribution,
  fallbackQuery,
  seed,
  alt,
  className,
  showAttribution,
}: {
  heroUrl: string | null | undefined;
  heroAttribution: TravelPhotoData["attribution"] | null | undefined;
  fallbackQuery: string;
  seed: string;
  alt: string;
  className?: string;
  showAttribution?: boolean;
}) {
  if (heroUrl) {
    return (
      <div className={`relative h-full w-full min-h-[4rem] overflow-hidden bg-zinc-200 ${className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        {showAttribution && heroAttribution && (
          <a
            href={heroAttribution.unsplashPhotoPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-1 right-1 z-10 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm hover:bg-black/60"
          >
            {heroAttribution.photographerName} / Unsplash
          </a>
        )}
      </div>
    );
  }
  return (
    <TravelPhoto
      query={fallbackQuery}
      seed={seed}
      alt={alt}
      className={className}
      showAttribution={showAttribution}
    />
  );
}
