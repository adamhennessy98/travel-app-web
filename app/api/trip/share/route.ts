import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tripId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { tripId } = body;
  if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

  const supabase = await createClient();

  // Verify the trip belongs to this user
  const { data: trip, error: fetchError } = await supabase
    .from("saved_trips")
    .select("id, share_id, is_shared, user_id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // If already shared, return existing share_id
  if (trip.is_shared && trip.share_id) {
    return NextResponse.json({ shareId: trip.share_id });
  }

  // Generate a new share_id and mark as shared
  const { data: updated, error: updateError } = await supabase
    .from("saved_trips")
    .update({
      is_shared: true,
      share_id: crypto.randomUUID(),
    })
    .eq("id", tripId)
    .eq("user_id", user.id)
    .select("share_id")
    .single();

  if (updateError || !updated) {
    console.error("Share update error:", updateError);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }

  return NextResponse.json({ shareId: updated.share_id });
}
