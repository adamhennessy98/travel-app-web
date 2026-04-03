import { NextResponse } from "next/server";
import { resolvePhoto } from "@/lib/photos/unsplash";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  // ── Auth ──
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit: 60 photo lookups per user per hour ──
  const { allowed } = rateLimit(`photos:${user.id}`, {
    maxRequests: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const seed = searchParams.get("seed")?.trim() ?? "default";

  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }
  if (q.length > 280) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const photo = await resolvePhoto(q, seed);
    if (!photo) {
      return NextResponse.json({ error: "no_results" }, { status: 404 });
    }
    return NextResponse.json(photo);
  } catch (e) {
    console.error("Unsplash photo lookup failed:", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
