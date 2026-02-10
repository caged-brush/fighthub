// server/config/supabaseUser.js
import { createClient } from "@supabase/supabase-js";

export function supabaseAsUser(accessToken) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  if (!accessToken) {
    throw new Error("Missing access token for supabaseAsUser");
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
