/**
 * Authenticate the current request via Supabase session cookie.
 * Use in API routes to reject unauthenticated callers.
 */

import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
