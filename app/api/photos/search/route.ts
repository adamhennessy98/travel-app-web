import { NextResponse } from "next/server";
import { resolvePhoto } from "@/lib/photos/unsplash";

export async function GET(request: Request) {
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
    return NextResponse.json(
      { error: "not_configured", message: "UNSPLASH_ACCESS_KEY is not set" },
      { status: 503 },
    );
  }

  try {
    const photo = await resolvePhoto(q, seed);
    if (!photo) {
      return NextResponse.json({ error: "no_results" }, { status: 404 });
    }
    return NextResponse.json(photo);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "upstream", message }, { status: 502 });
  }
}
