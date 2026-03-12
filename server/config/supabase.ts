import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = (process.env.SUPABASE_URL || "").trim();
const anon = (process.env.SUPABASE_ANON_KEY || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url) throw new Error("Missing SUPABASE_URL");
if (!anon) throw new Error("Missing SUPABASE_ANON_KEY");
if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, anon);

export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false },
});

export default supabase;
